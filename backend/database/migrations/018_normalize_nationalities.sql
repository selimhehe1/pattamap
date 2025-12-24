-- Migration 018: Normalize nationality data (FIX BUG-006)
-- Ensures consistent capitalization: "thai" -> "Thai", "philippine" -> "Philippine", etc.

-- Step 1: Create a helper function to capitalize first letter
CREATE OR REPLACE FUNCTION capitalize_first(text) RETURNS text AS $$
  SELECT UPPER(SUBSTRING($1 FROM 1 FOR 1)) || LOWER(SUBSTRING($1 FROM 2));
$$ LANGUAGE sql IMMUTABLE;

-- Step 2: Update employees table - normalize each element in the nationality array
UPDATE employees
SET nationality = (
  SELECT ARRAY_AGG(capitalize_first(elem))
  FROM UNNEST(nationality) AS elem
)
WHERE nationality IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM UNNEST(nationality) AS elem
    WHERE elem != capitalize_first(elem)
  );

-- Step 3: Create a trigger function to auto-normalize on insert/update
CREATE OR REPLACE FUNCTION normalize_nationality_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.nationality IS NOT NULL THEN
    NEW.nationality := (
      SELECT ARRAY_AGG(capitalize_first(elem))
      FROM UNNEST(NEW.nationality) AS elem
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create the trigger (drop if exists first)
DROP TRIGGER IF EXISTS normalize_nationality_on_change ON employees;

CREATE TRIGGER normalize_nationality_on_change
  BEFORE INSERT OR UPDATE OF nationality
  ON employees
  FOR EACH ROW
  EXECUTE FUNCTION normalize_nationality_trigger();

-- Verify the fix
-- SELECT DISTINCT UNNEST(nationality) as nat FROM employees ORDER BY nat;
