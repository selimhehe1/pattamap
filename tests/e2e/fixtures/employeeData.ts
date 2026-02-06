/**
 * Employee Data Fixture - PattaMap E2E Tests
 *
 * Helper functions to create and manage test employees.
 */

import { Page } from '@playwright/test';
import { TestUser } from './testUser';

const API_BASE_URL = 'http://localhost:8080/api';

export interface TestEmployee {
  id?: string;
  name: string;
  nickname?: string;
  age?: number;
  nationality: string;
  type: 'regular' | 'freelance';
  establishment_id?: string;
  bio?: string;
  phone?: string;
  line_id?: string;
  instagram?: string;
  status?: 'pending' | 'approved' | 'rejected';
  is_verified?: boolean;
}

/**
 * Common nationalities for test data
 */
const NATIONALITIES = ['Thai', 'Vietnamese', 'Cambodian', 'Lao', 'Myanmar', 'Filipino', 'Russian', 'Ukrainian'];

/**
 * Generate unique test employee data
 */
export function generateTestEmployee(
  overrides?: Partial<TestEmployee>
): TestEmployee {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  const nationality = NATIONALITIES[Math.floor(Math.random() * NATIONALITIES.length)];

  return {
    name: `Test Employee ${timestamp}-${random}`,
    nickname: `Testy${random}`,
    age: 22 + Math.floor(Math.random() * 10), // 22-31
    nationality,
    type: 'regular',
    bio: 'E2E Test employee for automated testing. Friendly and professional.',
    status: 'approved',
    is_verified: false,
    ...overrides
  };
}

/**
 * Generate freelance employee data
 */
export function generateTestFreelance(
  overrides?: Partial<TestEmployee>
): TestEmployee {
  return generateTestEmployee({
    type: 'freelance',
    establishment_id: undefined,
    ...overrides
  });
}

/**
 * Create test employee via API
 * @param page - Playwright page object
 * @param user - Authenticated user with CSRF token
 * @param data - Employee data (optional, generates if not provided)
 */
export async function createTestEmployee(
  page: Page,
  user: TestUser,
  data?: Partial<TestEmployee>
): Promise<TestEmployee> {
  const employee = generateTestEmployee(data);

  try {
    const cookies = await page.context().cookies();
    const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    const response = await fetch(`${API_BASE_URL}/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieString,
        'X-CSRF-Token': user.csrfToken || ''
      },
      body: JSON.stringify({
        name: employee.name,
        nickname: employee.nickname,
        age: employee.age,
        nationality: employee.nationality,
        type: employee.type,
        establishment_id: employee.establishment_id,
        bio: employee.bio,
        phone: employee.phone,
        line_id: employee.line_id,
        instagram: employee.instagram
      })
    });

    if (response.status === 201 || response.status === 200) {
      const responseData = await response.json();
      employee.id = responseData.employee?.id || responseData.id;
      console.log(`✅ Employee created: ${employee.name} (ID: ${employee.id})`);
      return employee;
    }

    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Failed to create employee: ${response.status} - ${errorData.error || ''}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Create employee failed: ${errorMessage}`);
    throw new Error(`Create employee failed: ${errorMessage}`);
  }
}

/**
 * Get existing employee from database
 * @param filters - Optional filters
 */
export async function getExistingEmployee(
  filters?: { type?: string; nationality?: string; verified?: boolean }
): Promise<TestEmployee | null> {
  try {
    const params = new URLSearchParams();
    params.append('limit', '1');
    params.append('status', 'approved');
    if (filters?.type) params.append('type', filters.type);
    if (filters?.nationality) params.append('nationality', filters.nationality);
    if (filters?.verified !== undefined) params.append('verified', String(filters.verified));

    const response = await fetch(`${API_BASE_URL}/employees?${params.toString()}`);
    const data = await response.json();
    const employees = data.employees || data;

    if (employees?.length > 0) {
      const emp = employees[0];
      return {
        id: emp.id,
        name: emp.name,
        nickname: emp.nickname,
        age: emp.age,
        nationality: emp.nationality,
        type: emp.type || 'regular',
        establishment_id: emp.establishment_id,
        bio: emp.bio,
        status: emp.status,
        is_verified: emp.is_verified
      };
    }

    return null;
  } catch (error) {
    console.warn('⚠️  Could not fetch existing employee:', error);
    return null;
  }
}

/**
 * Get employees by establishment
 */
export async function getEmployeesByEstablishment(
  establishmentId: string
): Promise<TestEmployee[]> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/employees?establishment_id=${establishmentId}&status=approved`
    );
    const data = await response.json();
    const employees = data.employees || data;

    return employees.map((emp: Record<string, unknown>) => ({
      id: emp.id,
      name: emp.name,
      nickname: emp.nickname,
      age: emp.age,
      nationality: emp.nationality,
      type: emp.type || 'regular',
      establishment_id: emp.establishment_id,
      bio: emp.bio,
      status: emp.status,
      is_verified: emp.is_verified
    }));
  } catch (error) {
    console.warn('⚠️  Could not fetch employees:', error);
    return [];
  }
}

/**
 * Get all freelances
 */
export async function getFreelances(): Promise<TestEmployee[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/employees?type=freelance&status=approved`);
    const data = await response.json();
    const employees = data.employees || data;

    return employees.map((emp: Record<string, unknown>) => ({
      id: emp.id,
      name: emp.name,
      nickname: emp.nickname,
      age: emp.age,
      nationality: emp.nationality,
      type: 'freelance' as const,
      bio: emp.bio,
      status: emp.status,
      is_verified: emp.is_verified
    }));
  } catch (error) {
    console.warn('⚠️  Could not fetch freelances:', error);
    return [];
  }
}

/**
 * Update employee via API
 */
export async function updateTestEmployee(
  page: Page,
  user: TestUser,
  employeeId: string,
  updates: Partial<TestEmployee>
): Promise<void> {
  try {
    const cookies = await page.context().cookies();
    const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    const response = await fetch(`${API_BASE_URL}/employees/${employeeId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieString,
        'X-CSRF-Token': user.csrfToken || ''
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Update employee failed: ${errorData.error || `HTTP ${response.status}`}`);
    }

    console.log(`✅ Employee updated: ${employeeId}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Update employee failed: ${errorMessage}`);
  }
}

/**
 * Delete test employee (cleanup)
 */
export async function deleteTestEmployee(
  page: Page,
  user: TestUser,
  employeeId: string
): Promise<void> {
  try {
    const cookies = await page.context().cookies();
    const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    await fetch(`${API_BASE_URL}/employees/${employeeId}`, {
      method: 'DELETE',
      headers: {
        'Cookie': cookieString,
        'X-CSRF-Token': user.csrfToken || ''
      }
    });

    console.log(`✅ Employee deleted: ${employeeId}`);
  } catch (error) {
    console.warn(`⚠️  Could not delete employee ${employeeId}:`, error);
  }
}

/**
 * Open employee profile modal on map/grid view
 */
export async function openEmployeeProfile(
  page: Page,
  employeeName: string
): Promise<void> {
  // Look for employee card
  const employeeCard = page.locator(`[data-employee-name="${employeeName}"]`)
    .or(page.locator(`.employee-card:has-text("${employeeName}")`))
    .or(page.locator(`text="${employeeName}"`).first());

  if (await employeeCard.isVisible({ timeout: 5000 })) {
    await employeeCard.click();
    await page.waitForLoadState('domcontentloaded');

    // Wait for modal to appear
    const modal = page.locator('[role="dialog"], .modal, .profile-modal');
    await modal.waitFor({ state: 'visible', timeout: 3000 });

    console.log(`✅ Opened employee profile: ${employeeName}`);
  } else {
    throw new Error(`Employee card not found: ${employeeName}`);
  }
}

/**
 * Add employee to favorites
 */
export async function addEmployeeToFavorites(
  page: Page,
  user: TestUser,
  employeeId: string
): Promise<void> {
  try {
    const cookies = await page.context().cookies();
    const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    const response = await fetch(`${API_BASE_URL}/favorites`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieString,
        'X-CSRF-Token': user.csrfToken || ''
      },
      body: JSON.stringify({
        employee_id: employeeId
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Add favorite failed: ${errorData.error || `HTTP ${response.status}`}`);
    }

    console.log(`✅ Employee added to favorites: ${employeeId}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Add favorite failed: ${errorMessage}`);
  }
}

/**
 * Create review for employee
 */
export async function createEmployeeReview(
  page: Page,
  user: TestUser,
  employeeId: string,
  rating: number = 5,
  content: string = 'Great service! Highly recommended.'
): Promise<void> {
  try {
    const cookies = await page.context().cookies();
    const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    const response = await fetch(`${API_BASE_URL}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieString,
        'X-CSRF-Token': user.csrfToken || ''
      },
      body: JSON.stringify({
        employee_id: employeeId,
        content,
        rating
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Create review failed: ${errorData.error || `HTTP ${response.status}`}`);
    }

    console.log(`✅ Review created for employee: ${employeeId} (${rating} stars)`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Create review failed: ${errorMessage}`);
  }
}
