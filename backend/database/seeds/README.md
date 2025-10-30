# Database Seeds

This directory contains SQL seed files to populate the database with test data for development and testing purposes.

## 📋 Available Seed Files

| File | Description | Status |
|------|-------------|--------|
| `insert_treetown_bars.sql` | Treetown zone establishments | ✅ Active |
| `seed_beachroad_establishments.sql` | Beach Road establishments | ✅ Active |
| `seed_lkmetro_establishments.sql` | LK Metro zone establishments | ✅ Active |
| `seed_soibuakhao_establishments.sql` | Soi Buakhao establishments | ✅ Active |
| `004_employee_verifications_seed.sql` | **v10.2** Profile verification test data (18 verifications) | 🆕 New |

## 🚀 How to Use Seeds

### Prerequisites

1. Ensure you have executed all migrations first
2. Ensure you have existing employee records in the `employees` table
3. Have admin access to Supabase SQL Editor

### Execution Steps

1. **Open Supabase SQL Editor**
   - Go to your project dashboard
   - Navigate to SQL Editor

2. **Execute seed files in order**
   ```sql
   -- Step 1: Establishments (any order)
   -- Execute insert_treetown_bars.sql
   -- Execute seed_beachroad_establishments.sql
   -- Execute seed_lkmetro_establishments.sql
   -- Execute seed_soibuakhao_establishments.sql

   -- Step 2: Verifications (requires employees)
   -- IMPORTANT: Modify 004_employee_verifications_seed.sql first!
   -- Replace 'REPLACE_WITH_EMPLOYEE_ID_X' with real employee IDs
   -- Then execute 004_employee_verifications_seed.sql
   ```

3. **Get employee IDs** (for verification seeds)
   ```sql
   SELECT id, name FROM employees
   ORDER BY created_at DESC
   LIMIT 20;
   ```

4. **Verify seeded data**
   ```sql
   -- Check establishments
   SELECT COUNT(*) FROM establishments;

   -- Check verifications
   SELECT * FROM employee_verifications
   ORDER BY submitted_at DESC;

   -- Check verification stats
   SELECT
     status,
     COUNT(*) as count,
     SUM(CASE WHEN auto_approved THEN 1 ELSE 0 END) as auto_approved_count
   FROM employee_verifications
   GROUP BY status;
   ```

## 🔧 Customizing Seeds

### Verification Seed Customization

The `004_employee_verifications_seed.sql` file contains placeholders that **MUST** be replaced before execution:

1. **Find employee IDs**
   ```sql
   SELECT id, name FROM employees LIMIT 20;
   ```

2. **Replace placeholders**
   - Find: `REPLACE_WITH_EMPLOYEE_ID_1`
   - Replace with: `a1b2c3d4-e5f6-7890-abcd-ef1234567890` (actual UUID)

3. **Update employee verified status** (after seeding)
   ```sql
   -- Uncomment the UPDATE statements at the end of the seed file
   -- Replace employee IDs with actual UUIDs
   UPDATE employees SET is_verified = true, verified_at = NOW()
   WHERE id = 'actual-employee-uuid-here';
   ```

### Seed Data Overview (004_employee_verifications_seed.sql)

| Status | Count | Description |
|--------|-------|-------------|
| Approved | 5 | 2 auto-approved + 3 manual |
| Pending | 3 | Awaiting review |
| Rejected | 4 | Low match score or fraud |
| Revoked | 3 | Fraud detected after approval |
| **Timeline** | 3 | 1 employee with 3 attempts (rejected → rejected → approved) |
| **Total** | 18 | Verification records |

## 📊 Expected Results After Seeding

### Admin Dashboard Stats
- **Total Verifications**: 18
- **Auto-Approved**: 2
- **Manual Approved**: 4 (including 1 from timeline)
- **Pending**: 3
- **Rejected**: 6 (including 2 from timeline)
- **Revoked**: 3

### Verifications Admin Page
- Filter tabs will show correct counts
- "Timeline" button will show 3 attempts for 1 employee
- All status badges and colors will display correctly
- Stats cards will show realistic data distribution

## ⚠️ Important Notes

1. **Dependencies**
   - Seeds must be executed AFTER migrations
   - Verification seeds require existing employees
   - Cloudinary URLs in seeds are demo URLs (replace if needed)

2. **Idempotency**
   - Seeds are NOT idempotent
   - Running the same seed twice will create duplicate data
   - Clear data before re-seeding if needed:
     ```sql
     TRUNCATE employee_verifications CASCADE;
     ```

3. **Production Warning**
   - ⚠️ **NEVER** run seed files in production
   - Seeds are for development/testing only
   - Contains placeholder/demo data

## 🧹 Clearing Seed Data

To remove all seeded data:

```sql
-- Clear verifications (preserves employees)
TRUNCATE employee_verifications CASCADE;

-- Clear establishments (preserves map positions)
TRUNCATE establishments CASCADE;

-- Clear all (careful - removes everything)
TRUNCATE
  employee_verifications,
  establishments,
  employees,
  users
CASCADE;
```

## 🔄 Re-seeding

If you need to re-seed:

1. Clear existing data
2. Re-run migrations (if needed)
3. Execute seed files in order
4. Verify results

## 📚 Related Documentation

- [Database Schema](../README.md)
- [Migrations Guide](../migrations/README.md)
- [Verification Feature Docs](../../../docs/features/PROFILE_VERIFICATION.md)

---

**Last Updated**: January 2025 (v10.2 - Verification Seeds)
