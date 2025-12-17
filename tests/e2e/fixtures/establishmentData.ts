/**
 * Establishment Data Fixture - PattaMap E2E Tests
 *
 * Helper functions to create and manage test establishments.
 */

import { Page } from '@playwright/test';
import axios from 'axios';
import { TestUser } from './testUser';

const API_BASE_URL = 'http://localhost:8080/api';

export interface TestEstablishment {
  id?: string;
  name: string;
  slug?: string;
  category: 'bar' | 'gogo' | 'massage' | 'nightclub' | 'restaurant' | 'hotel';
  zone: 'soi6' | 'walking_street' | 'tree_town' | 'central_road' | 'soi_buakhao' | 'beach_road';
  address: string;
  description: string;
  latitude?: number;
  longitude?: number;
  opening_hours?: string;
  price_range?: 'budget' | 'moderate' | 'expensive';
  phone?: string;
  website?: string;
  status?: 'pending' | 'approved' | 'rejected';
}

/**
 * Zone coordinates for realistic test data
 */
const ZONE_COORDINATES: Record<string, { lat: number; lng: number }> = {
  soi6: { lat: 12.9354, lng: 100.8820 },
  walking_street: { lat: 12.9271, lng: 100.8771 },
  tree_town: { lat: 12.9380, lng: 100.8850 },
  central_road: { lat: 12.9320, lng: 100.8780 },
  soi_buakhao: { lat: 12.9340, lng: 100.8860 },
  beach_road: { lat: 12.9290, lng: 100.8740 }
};

/**
 * Generate unique test establishment data
 */
export function generateTestEstablishment(
  overrides?: Partial<TestEstablishment>
): TestEstablishment {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  const zone = overrides?.zone || 'soi6';
  const coords = ZONE_COORDINATES[zone];

  return {
    name: `Test Bar ${timestamp}-${random}`,
    category: 'bar',
    zone,
    address: `123 Test Street, ${zone.replace('_', ' ')}`,
    description: 'E2E Test establishment for automated testing. Great atmosphere and friendly staff.',
    latitude: coords.lat + (Math.random() * 0.001 - 0.0005),
    longitude: coords.lng + (Math.random() * 0.001 - 0.0005),
    opening_hours: '18:00-02:00',
    price_range: 'moderate',
    status: 'approved',
    ...overrides
  };
}

/**
 * Create test establishment via API
 * @param page - Playwright page object
 * @param user - Authenticated user with CSRF token
 * @param data - Establishment data (optional, generates if not provided)
 */
export async function createTestEstablishment(
  page: Page,
  user: TestUser,
  data?: Partial<TestEstablishment>
): Promise<TestEstablishment> {
  const establishment = generateTestEstablishment(data);

  try {
    const cookies = await page.context().cookies();
    const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    const response = await axios.post(
      `${API_BASE_URL}/establishments`,
      {
        name: establishment.name,
        category: establishment.category,
        zone: establishment.zone,
        address: establishment.address,
        description: establishment.description,
        latitude: establishment.latitude,
        longitude: establishment.longitude,
        opening_hours: establishment.opening_hours,
        price_range: establishment.price_range
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
      establishment.id = response.data.establishment?.id || response.data.id;
      establishment.slug = response.data.establishment?.slug || response.data.slug;
      console.log(`✅ Establishment created: ${establishment.name} (ID: ${establishment.id})`);
      return establishment;
    }

    throw new Error(`Failed to create establishment: ${response.status}`);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.error || error.message;
      console.error(`❌ Create establishment failed: ${errorMessage}`);
      throw new Error(`Create establishment failed: ${errorMessage}`);
    }
    throw error;
  }
}

/**
 * Get existing establishment from database (for tests that need real data)
 * @param filters - Optional filters
 */
export async function getExistingEstablishment(
  filters?: { zone?: string; category?: string }
): Promise<TestEstablishment | null> {
  try {
    const params = new URLSearchParams();
    params.append('limit', '1');
    params.append('status', 'approved');
    if (filters?.zone) params.append('zone', filters.zone);
    if (filters?.category) params.append('category', filters.category);

    const response = await axios.get(`${API_BASE_URL}/establishments?${params.toString()}`);
    const establishments = response.data.establishments || response.data;

    if (establishments?.length > 0) {
      const est = establishments[0];
      return {
        id: est.id,
        name: est.name,
        slug: est.slug,
        category: est.category,
        zone: est.zone,
        address: est.address || '',
        description: est.description || '',
        latitude: est.latitude,
        longitude: est.longitude,
        status: est.status
      };
    }

    return null;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.error || error.message;
      // Check for common Supabase/API key issues
      if (errorMessage.includes('Invalid API key') || errorMessage.includes('API key')) {
        console.warn(`⚠️  Supabase API key issue detected: ${errorMessage}`);
        console.warn('   This usually means SUPABASE_SERVICE_KEY GitHub secret is missing or invalid.');
        console.warn('   Tests will continue but establishment fetch will be skipped.');
      } else {
        console.warn(`⚠️  Could not fetch existing establishment: ${errorMessage}`);
      }
    } else {
      console.warn('⚠️  Could not fetch existing establishment:', error);
    }
    return null;
  }
}

/**
 * Get all establishments for a zone
 * @param zone - Zone name
 */
export async function getEstablishmentsByZone(zone: string): Promise<TestEstablishment[]> {
  try {
    const response = await axios.get(`${API_BASE_URL}/establishments?zone=${zone}&status=approved`);
    const establishments = response.data.establishments || response.data;

    return establishments.map((est: Record<string, unknown>) => ({
      id: est.id,
      name: est.name,
      slug: est.slug,
      category: est.category,
      zone: est.zone,
      address: est.address || '',
      description: est.description || '',
      latitude: est.latitude,
      longitude: est.longitude,
      status: est.status
    }));
  } catch (error) {
    console.warn(`⚠️  Could not fetch establishments for zone ${zone}:`, error);
    return [];
  }
}

/**
 * Update establishment via API
 */
export async function updateTestEstablishment(
  page: Page,
  user: TestUser,
  establishmentId: string,
  updates: Partial<TestEstablishment>
): Promise<void> {
  try {
    const cookies = await page.context().cookies();
    const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    await axios.put(
      `${API_BASE_URL}/establishments/${establishmentId}`,
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

    console.log(`✅ Establishment updated: ${establishmentId}`);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Update establishment failed: ${error.response?.data?.error || error.message}`);
    }
    throw error;
  }
}

/**
 * Delete test establishment (cleanup)
 */
export async function deleteTestEstablishment(
  page: Page,
  user: TestUser,
  establishmentId: string
): Promise<void> {
  try {
    const cookies = await page.context().cookies();
    const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    await axios.delete(
      `${API_BASE_URL}/establishments/${establishmentId}`,
      {
        headers: {
          'Cookie': cookieString,
          'X-CSRF-Token': user.csrfToken || ''
        },
        withCredentials: true
      }
    );

    console.log(`✅ Establishment deleted: ${establishmentId}`);
  } catch (error) {
    console.warn(`⚠️  Could not delete establishment ${establishmentId}:`, error);
  }
}

/**
 * Navigate to establishment detail page
 */
export async function navigateToEstablishment(
  page: Page,
  establishment: TestEstablishment
): Promise<void> {
  if (establishment.slug && establishment.zone) {
    await page.goto(`/bar/${establishment.zone}/${establishment.slug}`);
  } else if (establishment.id) {
    await page.goto(`/bar/${establishment.id}`);
  }
  await page.waitForLoadState('networkidle');
}

/**
 * Click on establishment marker on map
 */
export async function clickEstablishmentOnMap(
  page: Page,
  establishmentName: string
): Promise<void> {
  // Look for marker with establishment name
  const marker = page.locator(`[data-establishment-name="${establishmentName}"]`)
    .or(page.locator(`[title="${establishmentName}"]`))
    .or(page.locator(`text="${establishmentName}"`).first());

  if (await marker.isVisible({ timeout: 5000 })) {
    await marker.click();
    await page.waitForTimeout(500);
    console.log(`✅ Clicked establishment marker: ${establishmentName}`);
  } else {
    throw new Error(`Establishment marker not found: ${establishmentName}`);
  }
}
