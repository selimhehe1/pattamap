-- Migration: Convert nationality from VARCHAR to TEXT[] array
-- Date: 2025-10-24
-- Purpose: Support multiple nationalities for "half/mixed" employees

BEGIN;

-- Step 1: Add new temporary column for array nationality
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS nationality_array TEXT[];

-- Step 2: Create a function to parse and convert nationality strings to arrays
CREATE OR REPLACE FUNCTION parse_nationality_to_array(nat TEXT)
RETURNS TEXT[] AS $$
DECLARE
  result TEXT[];
  cleaned TEXT;
  parts TEXT[];
  i INT;
BEGIN
  -- Handle NULL or empty
  IF nat IS NULL OR TRIM(nat) = '' THEN
    RETURN NULL;
  END IF;

  -- Clean the input: trim whitespace
  cleaned := TRIM(nat);

  -- Remove common prefixes like "Half " or "Mixed "
  cleaned := REGEXP_REPLACE(cleaned, '^(Half|Mixed)\s+', '', 'i');

  -- Split by common delimiters: /, -, &, and
  -- Replace delimiters with | for uniform splitting
  cleaned := REGEXP_REPLACE(cleaned, '\s*/\s*', '|', 'g');
  cleaned := REGEXP_REPLACE(cleaned, '\s*-\s*', '|', 'g');
  cleaned := REGEXP_REPLACE(cleaned, '\s+&\s+', '|', 'g');
  cleaned := REGEXP_REPLACE(cleaned, '\s+and\s+', '|', 'gi');

  -- Split by the delimiter
  IF POSITION('|' IN cleaned) > 0 THEN
    -- Multiple nationalities found
    parts := STRING_TO_ARRAY(cleaned, '|');
    result := ARRAY[]::TEXT[];

    -- Clean each part and add to result (max 2 nationalities)
    FOR i IN 1..LEAST(ARRAY_LENGTH(parts, 1), 2) LOOP
      IF TRIM(parts[i]) != '' THEN
        result := ARRAY_APPEND(result, INITCAP(TRIM(parts[i])));
      END IF;
    END LOOP;

    RETURN result;
  ELSE
    -- Single nationality
    RETURN ARRAY[INITCAP(cleaned)];
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 3: Populate nationality_array from existing nationality data
UPDATE employees
SET nationality_array = parse_nationality_to_array(nationality);

-- Step 4: Verify data conversion (count records)
DO $$
DECLARE
  total_count INT;
  null_count INT;
  single_count INT;
  double_count INT;
BEGIN
  SELECT COUNT(*) INTO total_count FROM employees;
  SELECT COUNT(*) INTO null_count FROM employees WHERE nationality_array IS NULL;
  SELECT COUNT(*) INTO single_count FROM employees WHERE ARRAY_LENGTH(nationality_array, 1) = 1;
  SELECT COUNT(*) INTO double_count FROM employees WHERE ARRAY_LENGTH(nationality_array, 1) = 2;

  RAISE NOTICE 'Migration statistics:';
  RAISE NOTICE '  Total employees: %', total_count;
  RAISE NOTICE '  NULL nationalities: %', null_count;
  RAISE NOTICE '  Single nationality: %', single_count;
  RAISE NOTICE '  Dual nationality (half): %', double_count;
END $$;

-- Step 5: Drop old nationality column
ALTER TABLE employees DROP COLUMN IF EXISTS nationality;

-- Step 6: Rename new column to nationality
ALTER TABLE employees RENAME COLUMN nationality_array TO nationality;

-- Step 7: Add index for array search performance
CREATE INDEX IF NOT EXISTS idx_employees_nationality_gin
ON employees USING GIN (nationality);

-- Step 8: Add comment to column
COMMENT ON COLUMN employees.nationality IS 'Array of nationalities (1-2 values). Single nationality or dual for half/mixed heritage.';

-- Step 9: Clean up the helper function
DROP FUNCTION IF EXISTS parse_nationality_to_array(TEXT);

-- Step 10: Create a check constraint to limit array size to max 2 nationalities
ALTER TABLE employees
ADD CONSTRAINT chk_nationality_max_two
CHECK (
  nationality IS NULL OR
  ARRAY_LENGTH(nationality, 1) IS NULL OR
  ARRAY_LENGTH(nationality, 1) <= 2
);

COMMIT;

-- Verification queries (run manually after migration):
-- SELECT nationality, COUNT(*) FROM employees GROUP BY nationality ORDER BY COUNT(*) DESC LIMIT 20;
-- SELECT * FROM employees WHERE ARRAY_LENGTH(nationality, 1) = 2 LIMIT 10;
