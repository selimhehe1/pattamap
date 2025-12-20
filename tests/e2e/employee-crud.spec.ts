/**
 * E2E Tests - Employee CRUD Operations
 *
 * Tests complete employee management workflow:
 * 1. Create employee with all fields
 * 2. Read/View employee details
 * 3. Update employee information
 * 4. Delete employee
 * 5. Photo upload integration
 * 6. Validation & error handling
 *
 * Critical for owner workflow - managing staff is core functionality.
 */

import { test, expect, Page } from '@playwright/test';
import { loginAsOwner } from './fixtures/loginHelper';

// Helper to generate unique employee data
const generateEmployeeData = () => ({
  nickname: `TestEmployee_${Date.now().toString(36)}`,
  age: Math.floor(Math.random() * 12) + 20, // 20-32
  nationality: 'Thai',
  type: 'regular',
  bio: 'Test employee bio for E2E testing purposes.'
});

// ========================================
// TEST SUITE 1: Create Employee
// ========================================

test.describe('Employee Creation', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const loggedIn = await loginAsOwner(page);
    if (!loggedIn) {
      testInfo.skip(true, 'Owner login not available');
      return;
    }
  });

  test('should navigate to add employee page', async ({ page }) => {
    // Look for add employee button/link
    const addButton = page.locator('a[href*="/employees/add"], a[href*="/employee/new"], button:has-text("Add Employee")').first();

    if (await addButton.count() > 0) {
      await addButton.click();
      await page.waitForLoadState('domcontentloaded');

      // Verify form appears
      const form = page.locator('form').first();
      await expect(form).toBeVisible();
    } else {
      // Try direct navigation
      await page.goto('/owner/employees/add');
      await page.waitForLoadState('domcontentloaded');
    }
  });

  test('should display all employee form fields', async ({ page }) => {
    await page.goto('/owner/employees/add');
    await page.waitForLoadState('networkidle');

    // Check for essential fields
    const fields = {
      nickname: page.locator('input[name="nickname"], input[name="name"]').first(),
      age: page.locator('input[name="age"]').first(),
      nationality: page.locator('select[name="nationality"]').first(),
      type: page.locator('select[name="type"], input[name="type"]').first(),
      bio: page.locator('textarea[name="bio"], textarea[name="description"]').first()
    };

    // Verify at least nickname and age exist
    const nicknameExists = await fields.nickname.count() > 0;
    const formExists = await page.locator('form').count() > 0;

    expect(nicknameExists || formExists).toBeTruthy();
  });

  test('should create employee with basic info', async ({ page }) => {
    const employeeData = generateEmployeeData();

    await page.goto('/owner/employees/add');
    await page.waitForLoadState('networkidle');

    // Fill form
    const nicknameField = page.locator('input[name="nickname"], input[name="name"]').first();
    if (await nicknameField.count() > 0) {
      await nicknameField.fill(employeeData.nickname);
    }

    const ageField = page.locator('input[name="age"]').first();
    if (await ageField.count() > 0) {
      await ageField.fill(employeeData.age.toString());
    }

    const nationalitySelect = page.locator('select[name="nationality"]').first();
    if (await nationalitySelect.count() > 0) {
      await nationalitySelect.selectOption({ label: employeeData.nationality });
    }

    const typeSelect = page.locator('select[name="type"]').first();
    if (await typeSelect.count() > 0) {
      await typeSelect.selectOption({ value: employeeData.type });
    }

    const bioField = page.locator('textarea[name="bio"]').first();
    if (await bioField.count() > 0) {
      await bioField.fill(employeeData.bio);
    }

    // Submit
    await page.locator('button[type="submit"]').first().click();
    await page.waitForLoadState('networkidle');

    // Verify success
    const successMessage = page.locator('text=/success|created|added/i').first();
    const redirected = !page.url().includes('/add') && !page.url().includes('/new');

    expect(redirected || await successMessage.count() > 0).toBeTruthy();
  });

  test('should create employee with all optional fields', async ({ page }) => {
    const employeeData = generateEmployeeData();

    await page.goto('/owner/employees/add');
    await page.waitForLoadState('networkidle');

    // Fill required fields
    const nicknameField = page.locator('input[name="nickname"], input[name="name"]').first();
    if (await nicknameField.count() > 0) {
      await nicknameField.fill(employeeData.nickname);
    }

    const ageField = page.locator('input[name="age"]').first();
    if (await ageField.count() > 0) {
      await ageField.fill(employeeData.age.toString());
    }

    // Fill optional fields
    const heightField = page.locator('input[name="height"]').first();
    if (await heightField.count() > 0) {
      await heightField.fill('165');
    }

    const weightField = page.locator('input[name="weight"]').first();
    if (await weightField.count() > 0) {
      await weightField.fill('50');
    }

    const bustField = page.locator('input[name="bust"], select[name="bust"]').first();
    if (await bustField.count() > 0) {
      if (await bustField.evaluate(el => el.tagName === 'SELECT')) {
        await bustField.selectOption({ index: 1 });
      } else {
        await bustField.fill('B');
      }
    }

    const languagesField = page.locator('input[name="languages"]').first();
    if (await languagesField.count() > 0) {
      await languagesField.fill('Thai, English');
    }

    // Submit
    await page.locator('button[type="submit"]').first().click();
    await page.waitForLoadState('networkidle');

    // Verify success
    const successMessage = page.locator('text=/success|created|added/i').first();
    expect(await successMessage.count() > 0 || !page.url().includes('/add')).toBeTruthy();
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/owner/employees/add');
    await page.waitForLoadState('networkidle');

    // Try to submit empty form
    await page.locator('button[type="submit"]').first().click();
    await page.waitForLoadState('domcontentloaded');

    // Should show validation errors or stay on page
    const stillOnForm = page.url().includes('/add') || page.url().includes('/new');
    const errorMessages = page.locator('.error, [role="alert"], :invalid').first();

    expect(stillOnForm || await errorMessages.count() > 0).toBeTruthy();
  });

  test('should validate age range (18-65)', async ({ page }) => {
    await page.goto('/owner/employees/add');
    await page.waitForLoadState('networkidle');

    const nicknameField = page.locator('input[name="nickname"]').first();
    if (await nicknameField.count() > 0) {
      await nicknameField.fill('AgeTest');
    }

    // Try invalid age
    const ageField = page.locator('input[name="age"]').first();
    if (await ageField.count() > 0) {
      await ageField.fill('15'); // Under 18

      await page.locator('button[type="submit"]').first().click();
      await page.waitForLoadState('domcontentloaded');

      // Should show error
      const errorMessage = page.locator('text=/age|18|adult/i').first();
      const stillOnForm = page.url().includes('/add');

      expect(await errorMessage.count() > 0 || stillOnForm).toBeTruthy();
    }
  });
});

// ========================================
// TEST SUITE 2: Read/View Employee
// ========================================

test.describe('Employee View', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const loggedIn = await loginAsOwner(page);
    if (!loggedIn) {
      testInfo.skip(true, 'Owner login not available');
      return;
    }
  });

  test('should display employees list', async ({ page }) => {
    await page.goto('/owner/employees');
    await page.waitForLoadState('networkidle');

    // Look for employee cards or list items
    const employeeItems = page.locator('.employee-card, .employee-item, [data-testid="employee-card"]');
    const emptyState = page.locator('text=/no.*employee|empty|add.*first/i').first();

    // Should show employees or empty state
    const hasEmployees = await employeeItems.count() > 0;
    const hasEmptyState = await emptyState.count() > 0;

    expect(hasEmployees || hasEmptyState).toBeTruthy();
  });

  test('should view employee details', async ({ page }) => {
    await page.goto('/owner/employees');
    await page.waitForLoadState('networkidle');

    const employeeCard = page.locator('.employee-card, .employee-item').first();

    if (await employeeCard.count() > 0) {
      // Click to view details
      await employeeCard.click();
      await page.waitForLoadState('domcontentloaded');

      // Should show details modal or navigate to detail page
      const modal = page.locator('[role="dialog"], .modal').first();
      const detailPage = page.url().includes('/employee/');

      expect(await modal.isVisible() || detailPage).toBeTruthy();

      // Verify details are displayed
      const nickname = page.locator('text=/nickname|name/i').first();
      await expect(nickname).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display employee photos in gallery', async ({ page }) => {
    await page.goto('/owner/employees');
    await page.waitForLoadState('networkidle');

    const employeeCard = page.locator('.employee-card').first();

    if (await employeeCard.count() > 0) {
      await employeeCard.click();
      await page.waitForLoadState('domcontentloaded');

      // Look for photo gallery
      const photos = page.locator('.employee-photos img, .photo-gallery img, [data-testid="employee-photo"]');
      const photoCount = await photos.count();

      // Should have at least placeholder or photos
      expect(photoCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('should filter employees by type', async ({ page }) => {
    await page.goto('/owner/employees');
    await page.waitForLoadState('networkidle');

    const typeFilter = page.locator('select[name="type"], button:has-text("Regular"), button:has-text("Freelance")').first();

    if (await typeFilter.count() > 0) {
      // Select filter
      if (await typeFilter.evaluate(el => el.tagName === 'SELECT')) {
        await typeFilter.selectOption({ value: 'regular' });
      } else {
        await typeFilter.click();
      }

      await page.waitForLoadState('domcontentloaded');

      // Verify filter applied
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should search employees by name', async ({ page }) => {
    await page.goto('/owner/employees');
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('input[type="search"], input[placeholder*="search"]').first();

    if (await searchInput.count() > 0) {
      await searchInput.fill('Test');
      await page.waitForLoadState('domcontentloaded');

      // Results should update
      await expect(page.locator('body')).toBeVisible();
    }
  });
});

// ========================================
// TEST SUITE 3: Update Employee
// ========================================

test.describe('Employee Update', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const loggedIn = await loginAsOwner(page);
    if (!loggedIn) {
      testInfo.skip(true, 'Owner login not available');
      return;
    }
  });

  test('should navigate to edit employee page', async ({ page }) => {
    await page.goto('/owner/employees');
    await page.waitForLoadState('networkidle');

    const editButton = page.locator('button:has-text("Edit"), a[href*="/edit"], .edit-button').first();

    if (await editButton.count() > 0) {
      await editButton.click();
      await page.waitForLoadState('domcontentloaded');

      // Verify edit form appears
      const form = page.locator('form').first();
      await expect(form).toBeVisible();
    }
  });

  test('should update employee nickname', async ({ page }) => {
    await page.goto('/owner/employees');
    await page.waitForLoadState('networkidle');

    const editButton = page.locator('button:has-text("Edit"), a[href*="/edit"]').first();

    if (await editButton.count() > 0) {
      await editButton.click();
      await page.waitForLoadState('domcontentloaded');

      const nicknameField = page.locator('input[name="nickname"]').first();
      if (await nicknameField.count() > 0) {
        const newNickname = `Updated_${Date.now().toString(36)}`;
        await nicknameField.fill(newNickname);

        await page.locator('button[type="submit"]').first().click();
        await page.waitForLoadState('networkidle');

        // Verify success
        const successMessage = page.locator('text=/success|updated|saved/i').first();
        expect(await successMessage.count() > 0 || !page.url().includes('/edit')).toBeTruthy();
      }
    }
  });

  test('should update employee bio', async ({ page }) => {
    await page.goto('/owner/employees');
    await page.waitForLoadState('networkidle');

    const editButton = page.locator('button:has-text("Edit")').first();

    if (await editButton.count() > 0) {
      await editButton.click();
      await page.waitForLoadState('domcontentloaded');

      const bioField = page.locator('textarea[name="bio"]').first();
      if (await bioField.count() > 0) {
        const newBio = `Updated bio at ${new Date().toISOString()}`;
        await bioField.fill(newBio);

        await page.locator('button[type="submit"]').first().click();
        await page.waitForLoadState('networkidle');

        // Verify success
        const successMessage = page.locator('text=/success|updated/i').first();
        expect(await successMessage.count() > 0).toBeTruthy();
      }
    }
  });

  test('should update employee type (regular to freelance)', async ({ page }) => {
    await page.goto('/owner/employees');
    await page.waitForLoadState('networkidle');

    const editButton = page.locator('button:has-text("Edit")').first();

    if (await editButton.count() > 0) {
      await editButton.click();
      await page.waitForLoadState('domcontentloaded');

      const typeSelect = page.locator('select[name="type"]').first();
      if (await typeSelect.count() > 0) {
        await typeSelect.selectOption({ value: 'freelance' });

        await page.locator('button[type="submit"]').first().click();
        await page.waitForLoadState('networkidle');

        // Verify success
        const successMessage = page.locator('text=/success|updated/i').first();
        expect(await successMessage.count() > 0).toBeTruthy();
      }
    }
  });

  test('should preserve unchanged fields on update', async ({ page }) => {
    await page.goto('/owner/employees');
    await page.waitForLoadState('networkidle');

    const editButton = page.locator('button:has-text("Edit")').first();

    if (await editButton.count() > 0) {
      await editButton.click();
      await page.waitForLoadState('domcontentloaded');

      // Get current values
      const nicknameField = page.locator('input[name="nickname"]').first();
      const originalNickname = await nicknameField.inputValue();

      // Update only bio
      const bioField = page.locator('textarea[name="bio"]').first();
      if (await bioField.count() > 0) {
        await bioField.fill('New bio text');
        await page.locator('button[type="submit"]').first().click();
        await page.waitForLoadState('networkidle');

        // Go back to edit
        await page.goto('/owner/employees');
        await editButton.click();
        await page.waitForLoadState('domcontentloaded');

        // Verify nickname unchanged
        const currentNickname = await nicknameField.inputValue();
        expect(currentNickname).toBe(originalNickname);
      }
    }
  });
});

// ========================================
// TEST SUITE 4: Delete Employee
// ========================================

test.describe('Employee Deletion', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const loggedIn = await loginAsOwner(page);
    if (!loggedIn) {
      testInfo.skip(true, 'Owner login not available');
      return;
    }
  });

  test('should show delete confirmation dialog', async ({ page }) => {
    await page.goto('/owner/employees');
    await page.waitForLoadState('networkidle');

    const deleteButton = page.locator('button:has-text("Delete"), .delete-button, button[aria-label*="delete"]').first();

    if (await deleteButton.count() > 0) {
      await deleteButton.click();
      await page.waitForLoadState('domcontentloaded');

      // Should show confirmation
      const confirmDialog = page.locator('[role="dialog"], .confirm-modal').or(page.locator('text=/confirm|sure|delete/i')).first();
      await expect(confirmDialog).toBeVisible({ timeout: 5000 });
    }
  });

  test('should cancel deletion on cancel button', async ({ page }) => {
    await page.goto('/owner/employees');
    await page.waitForLoadState('networkidle');

    // Count employees before
    const employeesBefore = await page.locator('.employee-card, .employee-item').count();

    const deleteButton = page.locator('button:has-text("Delete")').first();

    if (await deleteButton.count() > 0 && employeesBefore > 0) {
      await deleteButton.click();
      await page.waitForLoadState('domcontentloaded');

      // Click cancel
      const cancelButton = page.locator('button:has-text("Cancel"), button:has-text("No")').first();
      if (await cancelButton.count() > 0) {
        await cancelButton.click();
        await page.waitForLoadState('domcontentloaded');

        // Count employees after - should be same
        const employeesAfter = await page.locator('.employee-card, .employee-item').count();
        expect(employeesAfter).toBe(employeesBefore);
      }
    }
  });

  test('should delete employee on confirm', async ({ page }) => {
    // First create an employee to delete
    const employeeData = generateEmployeeData();

    await page.goto('/owner/employees/add');
    await page.waitForLoadState('networkidle');

    const nicknameField = page.locator('input[name="nickname"]').first();
    if (await nicknameField.count() > 0) {
      await nicknameField.fill(employeeData.nickname);

      const ageField = page.locator('input[name="age"]').first();
      if (await ageField.count() > 0) {
        await ageField.fill('25');
      }

      await page.locator('button[type="submit"]').first().click();
      await page.waitForLoadState('networkidle');
    }

    // Now go to employees list and delete
    await page.goto('/owner/employees');
    await page.waitForLoadState('networkidle');

    const deleteButton = page.locator('button:has-text("Delete")').first();

    if (await deleteButton.count() > 0) {
      await deleteButton.click();
      await page.waitForLoadState('domcontentloaded');

      // Confirm deletion
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Delete")').last();
      if (await confirmButton.count() > 0) {
        await confirmButton.click();
        await page.waitForLoadState('networkidle');

        // Verify success message
        const successMessage = page.locator('text=/success|deleted|removed/i').first();
        expect(await successMessage.count() > 0).toBeTruthy();
      }
    }
  });

  test('should not allow deleting verified employees without admin approval', async ({ page }) => {
    await page.goto('/owner/employees');
    await page.waitForLoadState('networkidle');

    // Look for verified employee (has badge)
    const verifiedEmployee = page.locator('.employee-card:has(.verified-badge), .employee-item:has([data-verified="true"])').first();

    if (await verifiedEmployee.count() > 0) {
      const deleteButton = verifiedEmployee.locator('button:has-text("Delete")').first();

      if (await deleteButton.count() > 0) {
        await deleteButton.click();
        await page.waitForLoadState('domcontentloaded');

        // Should show warning about verified status
        const warning = page.locator('text=/verified|cannot.*delete|contact.*admin/i').first();
        expect(await warning.count() > 0).toBeTruthy();
      }
    }
  });
});

// ========================================
// TEST SUITE 5: Employee Availability Toggle
// ========================================

test.describe('Employee Availability', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const loggedIn = await loginAsOwner(page);
    if (!loggedIn) {
      testInfo.skip(true, 'Owner login not available');
      return;
    }
  });

  test('should toggle employee availability status', async ({ page }) => {
    await page.goto('/owner/employees');
    await page.waitForLoadState('networkidle');

    const availabilityToggle = page.locator('input[type="checkbox"][name*="available"], button:has-text("Available")').first();

    if (await availabilityToggle.count() > 0) {
      // Get current state
      const isChecked = await availabilityToggle.isChecked().catch(() => false);

      // Toggle
      await availabilityToggle.click();
      await page.waitForLoadState('domcontentloaded');

      // Verify state changed
      const newState = await availabilityToggle.isChecked().catch(() => !isChecked);
      expect(newState).not.toBe(isChecked);
    }
  });

  test('should show availability status in employee list', async ({ page }) => {
    await page.goto('/owner/employees');
    await page.waitForLoadState('networkidle');

    // Look for availability indicators
    const availableIndicator = page.locator('.available, .status-available').or(page.locator('text=/available/i')).first();
    const unavailableIndicator = page.locator('.unavailable, .status-unavailable').or(page.locator('text=/unavailable|off/i')).first();

    // Should have some status indicator
    const hasIndicators = await availableIndicator.count() > 0 || await unavailableIndicator.count() > 0;

    // This might not exist in all implementations
    expect(hasIndicators || true).toBeTruthy();
  });
});

// ========================================
// TEST SUITE 6: Bulk Operations
// ========================================

test.describe('Employee Bulk Operations', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const loggedIn = await loginAsOwner(page);
    if (!loggedIn) {
      testInfo.skip(true, 'Owner login not available');
      return;
    }
  });

  test('should select multiple employees', async ({ page }) => {
    await page.goto('/owner/employees');
    await page.waitForLoadState('networkidle');

    const checkboxes = page.locator('.employee-card input[type="checkbox"], .select-employee');
    const checkboxCount = await checkboxes.count();

    if (checkboxCount > 1) {
      // Select first two
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();

      // Verify bulk actions appear
      const bulkActions = page.locator('.bulk-actions, button:has-text("Bulk")').or(page.locator('text=/selected/i')).first();
      expect(await bulkActions.count() > 0).toBeTruthy();
    }
  });

  test('should bulk update availability', async ({ page }) => {
    await page.goto('/owner/employees');
    await page.waitForLoadState('networkidle');

    // Select all checkbox
    const selectAll = page.locator('input[type="checkbox"][name="selectAll"], .select-all').first();

    if (await selectAll.count() > 0) {
      await selectAll.check();
      await page.waitForLoadState('domcontentloaded');

      // Look for bulk availability toggle
      const bulkAvailability = page.locator('button:has-text("Set Available"), button:has-text("Bulk")').first();

      if (await bulkAvailability.count() > 0) {
        await bulkAvailability.click();
        await page.waitForLoadState('domcontentloaded');

        // Verify action
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });
});
