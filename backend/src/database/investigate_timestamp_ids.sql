-- Investigation script for employees with timestamp IDs instead of UUIDs
-- Identifies problematic records that need migration

-- 1. Check for non-UUID formatted employee IDs
SELECT
    id,
    name,
    nickname,
    created_at,
    CASE
        WHEN id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
        THEN 'UUID'
        ELSE 'TIMESTAMP'
    END as id_format,
    length(id::text) as id_length
FROM employees
WHERE NOT (id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$')
ORDER BY created_at DESC;

-- 2. Count of problematic vs correct IDs
SELECT
    CASE
        WHEN id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
        THEN 'UUID_FORMAT'
        ELSE 'TIMESTAMP_FORMAT'
    END as format_type,
    COUNT(*) as count
FROM employees
GROUP BY
    CASE
        WHEN id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
        THEN 'UUID_FORMAT'
        ELSE 'TIMESTAMP_FORMAT'
    END
ORDER BY format_type;

-- 3. Check related tables that reference employee IDs
-- Employment history references
SELECT
    'employment_history' as table_name,
    COUNT(*) as total_records,
    COUNT(DISTINCT e.id) as distinct_employee_ids,
    COUNT(CASE WHEN NOT (eh.employee_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') THEN 1 END) as timestamp_references
FROM employment_history eh
JOIN employees e ON e.id = eh.employee_id
WHERE NOT (e.id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$');

-- Comments/reviews references
SELECT
    'comments' as table_name,
    COUNT(*) as total_records,
    COUNT(DISTINCT e.id) as distinct_employee_ids,
    COUNT(CASE WHEN NOT (c.employee_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') THEN 1 END) as timestamp_references
FROM comments c
JOIN employees e ON e.id = c.employee_id
WHERE NOT (e.id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$');

-- User favorites references
SELECT
    'user_favorites' as table_name,
    COUNT(*) as total_records,
    COUNT(DISTINCT e.id) as distinct_employee_ids,
    COUNT(CASE WHEN NOT (uf.employee_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') THEN 1 END) as timestamp_references
FROM user_favorites uf
JOIN employees e ON e.id = uf.employee_id
WHERE NOT (e.id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$');

-- Edit proposals references
SELECT
    'edit_proposals' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN item_type = 'employee' AND NOT (item_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') THEN 1 END) as timestamp_references
FROM edit_proposals
WHERE item_type = 'employee';

-- 4. Show sample of problematic employee data
SELECT
    id,
    name,
    nickname,
    status,
    created_at,
    created_by
FROM employees
WHERE NOT (id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$')
LIMIT 10;