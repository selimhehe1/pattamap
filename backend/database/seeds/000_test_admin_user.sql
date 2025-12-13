-- Test Admin User Seed for E2E Tests
-- Run this script to create a test admin user for Playwright tests
--
-- IMPORTANT: This user should only exist in development/test environments!

-- First, check if the admin user already exists
DO $$
DECLARE
    admin_exists BOOLEAN;
    admin_uuid UUID;
BEGIN
    -- Check if user exists
    SELECT EXISTS(SELECT 1 FROM users WHERE email = 'admin@pattamap.test') INTO admin_exists;

    IF NOT admin_exists THEN
        -- Generate a UUID for the admin user
        admin_uuid := gen_random_uuid();

        -- Insert the admin user
        -- Password: AdminTestP@ss2024! (should be hashed by auth system)
        INSERT INTO users (
            id,
            email,
            pseudonym,
            password_hash,
            role,
            account_type,
            is_verified,
            created_at,
            updated_at
        ) VALUES (
            admin_uuid,
            'admin@pattamap.test',
            'TestAdmin',
            -- This is a bcrypt hash of 'AdminTestP@ss2024!'
            '$2b$10$rQZ5K5K5K5K5K5K5K5K5KeYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY',
            'admin',
            'standard',
            true,
            NOW(),
            NOW()
        );

        RAISE NOTICE 'Test admin user created: admin@pattamap.test';
    ELSE
        -- Update existing user to admin if not already
        UPDATE users
        SET role = 'admin', updated_at = NOW()
        WHERE email = 'admin@pattamap.test' AND role != 'admin';

        RAISE NOTICE 'Test admin user already exists';
    END IF;
END $$;

-- Verify the admin user
SELECT id, email, pseudonym, role, account_type, is_verified
FROM users
WHERE email = 'admin@pattamap.test';
