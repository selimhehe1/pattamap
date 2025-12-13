/**
 * Employee Data Fixture - PattaMap E2E Tests
 *
 * Helper functions to create and manage test employees.
 */

import { Page } from '@playwright/test';
import axios from 'axios';
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

    const response = await axios.post(
      `${API_BASE_URL}/employees`,
      {
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
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieString,
          'X-CSRF-Token': user.csrfToken || ''
        },
        withCredentials: true
      }
    );

    if (response.status === 201 || response.status === 200) {
      employee.id = response.data.employee?.id || response.data.id;
      console.log(`✅ Employee created: ${employee.name} (ID: ${employee.id})`);
      return employee;
    }

    throw new Error(`Failed to create employee: ${response.status}`);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.error || error.message;
      console.error(`❌ Create employee failed: ${errorMessage}`);
      throw new Error(`Create employee failed: ${errorMessage}`);
    }
    throw error;
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

    const response = await axios.get(`${API_BASE_URL}/employees?${params.toString()}`);
    const employees = response.data.employees || response.data;

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
    const response = await axios.get(
      `${API_BASE_URL}/employees?establishment_id=${establishmentId}&status=approved`
    );
    const employees = response.data.employees || response.data;

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
    const response = await axios.get(`${API_BASE_URL}/employees?type=freelance&status=approved`);
    const employees = response.data.employees || response.data;

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

    await axios.put(
      `${API_BASE_URL}/employees/${employeeId}`,
      updates,
      {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieString,
          'X-CSRF-Token': user.csrfToken || ''
        },
        withCredentials: true
      }
    );

    console.log(`✅ Employee updated: ${employeeId}`);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Update employee failed: ${error.response?.data?.error || error.message}`);
    }
    throw error;
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

    await axios.delete(
      `${API_BASE_URL}/employees/${employeeId}`,
      {
        headers: {
          'Cookie': cookieString,
          'X-CSRF-Token': user.csrfToken || ''
        },
        withCredentials: true
      }
    );

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
    await page.waitForTimeout(500);

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

    await axios.post(
      `${API_BASE_URL}/favorites`,
      {
        employee_id: employeeId
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieString,
          'X-CSRF-Token': user.csrfToken || ''
        },
        withCredentials: true
      }
    );

    console.log(`✅ Employee added to favorites: ${employeeId}`);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Add favorite failed: ${error.response?.data?.error || error.message}`);
    }
    throw error;
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

    await axios.post(
      `${API_BASE_URL}/comments`,
      {
        employee_id: employeeId,
        content,
        rating
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieString,
          'X-CSRF-Token': user.csrfToken || ''
        },
        withCredentials: true
      }
    );

    console.log(`✅ Review created for employee: ${employeeId} (${rating} stars)`);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Create review failed: ${error.response?.data?.error || error.message}`);
    }
    throw error;
  }
}
