-- Migration script: Convert timestamp employee IDs to proper UUIDs
-- This script handles atomic migration with rollback safety

BEGIN;

-- Create a temporary table to store ID mappings
CREATE TEMP TABLE employee_id_mapping AS
SELECT
    id as old_id,
    gen_random_uuid() as new_id,
    name,
    nickname
FROM employees
WHERE NOT (id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$');

-- Show what will be migrated
DO $$
DECLARE
    record_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO record_count FROM employee_id_mapping;
    RAISE NOTICE 'Will migrate % employees from timestamp to UUID format', record_count;
END $$;

-- Display mapping preview
SELECT
    old_id,
    new_id,
    name || ' (' || nickname || ')' as employee_name
FROM employee_id_mapping
ORDER BY name
LIMIT 20;

-- Step 1: Update employment_history table with new UUIDs
UPDATE employment_history
SET employee_id = mapping.new_id
FROM employee_id_mapping mapping
WHERE employment_history.employee_id = mapping.old_id;

-- Log employment_history updates
DO $$
DECLARE
    update_count INTEGER;
BEGIN
    GET DIAGNOSTICS update_count = ROW_COUNT;
    RAISE NOTICE 'Updated % employment_history records', update_count;
END $$;

-- Step 2: Update comments table with new UUIDs
UPDATE comments
SET employee_id = mapping.new_id
FROM employee_id_mapping mapping
WHERE comments.employee_id = mapping.old_id;

-- Log comments updates
DO $$
DECLARE
    update_count INTEGER;
BEGIN
    GET DIAGNOSTICS update_count = ROW_COUNT;
    RAISE NOTICE 'Updated % comments records', update_count;
END $$;

-- Step 3: Update user_favorites table with new UUIDs
UPDATE user_favorites
SET employee_id = mapping.new_id
FROM employee_id_mapping mapping
WHERE user_favorites.employee_id = mapping.old_id;

-- Log user_favorites updates
DO $$
DECLARE
    update_count INTEGER;
BEGIN
    GET DIAGNOSTICS update_count = ROW_COUNT;
    RAISE NOTICE 'Updated % user_favorites records', update_count;
END $$;

-- Step 4: Update edit_proposals table with new UUIDs (for employee proposals)
UPDATE edit_proposals
SET item_id = mapping.new_id
FROM employee_id_mapping mapping
WHERE edit_proposals.item_type = 'employee' AND edit_proposals.item_id = mapping.old_id;

-- Log edit_proposals updates
DO $$
DECLARE
    update_count INTEGER;
BEGIN
    GET DIAGNOSTICS update_count = ROW_COUNT;
    RAISE NOTICE 'Updated % edit_proposals records', update_count;
END $$;

-- Step 5: Create new employee records with UUID IDs
-- First backup old employees data
CREATE TEMP TABLE employees_backup AS
SELECT * FROM employees
WHERE NOT (id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$');

-- Delete old employees with timestamp IDs
DELETE FROM employees
WHERE NOT (id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$');

-- Log deletion count
DO $$
DECLARE
    delete_count INTEGER;
BEGIN
    GET DIAGNOSTICS delete_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % employees with timestamp IDs', delete_count;
END $$;

-- Insert employees with new UUID IDs
INSERT INTO employees (
    id,
    name,
    nickname,
    age,
    nationality,
    description,
    photos,
    social_media,
    status,
    self_removal_requested,
    created_at,
    updated_at,
    created_by
)
SELECT
    mapping.new_id,
    backup.name,
    backup.nickname,
    backup.age,
    backup.nationality,
    backup.description,
    backup.photos,
    backup.social_media,
    backup.status,
    backup.self_removal_requested,
    backup.created_at,
    backup.updated_at,
    backup.created_by
FROM employees_backup backup
JOIN employee_id_mapping mapping ON mapping.old_id = backup.id;

-- Log insertion count
DO $$
DECLARE
    insert_count INTEGER;
BEGIN
    GET DIAGNOSTICS insert_count = ROW_COUNT;
    RAISE NOTICE 'Inserted % employees with new UUID IDs', insert_count;
END $$;

-- Final verification: Check that no timestamp IDs remain
DO $$
DECLARE
    remaining_timestamp_count INTEGER;
    total_employees INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_timestamp_count
    FROM employees
    WHERE NOT (id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$');

    SELECT COUNT(*) INTO total_employees FROM employees;

    IF remaining_timestamp_count = 0 THEN
        RAISE NOTICE 'SUCCESS: Migration completed. All % employees now have UUID format', total_employees;
    ELSE
        RAISE EXCEPTION 'MIGRATION FAILED: % employees still have timestamp IDs', remaining_timestamp_count;
    END IF;
END $$;

-- Create summary report
SELECT
    'MIGRATION SUMMARY' as report_section,
    COUNT(*) as migrated_employees,
    MIN(created_at) as oldest_employee,
    MAX(created_at) as newest_employee
FROM employee_id_mapping;

-- Show sample of successfully migrated employees
SELECT
    'SAMPLE MIGRATED EMPLOYEES' as report_section,
    e.id as new_uuid,
    e.name,
    e.nickname,
    e.created_at
FROM employees e
WHERE e.id IN (SELECT new_id FROM employee_id_mapping)
ORDER BY e.name
LIMIT 10;

-- Ready to commit
-- COMMIT;

-- If any errors occur, the transaction will automatically ROLLBACK
-- Uncomment the COMMIT line above when ready to execute

ROLLBACK; -- Keep this for now - change to COMMIT when ready