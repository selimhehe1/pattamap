/**
 * formatProposalValue Utility
 *
 * Formats edit proposal values for human-readable display.
 */

import type { EditProposalValue } from './types';

/**
 * Format values for human-readable display in edit proposals
 */
export function formatValueForDisplay(value: EditProposalValue, fieldKey: string): string {
  // Handle null/undefined - return N/A
  if (value === null || value === undefined || value === '') {
    return '<span style="color: #888; font-style: italic;">N/A</span>';
  }

  // Handle empty strings that aren't truly empty (whitespace)
  if (typeof value === 'string' && value.trim() === '') {
    return '<span style="color: #888; font-style: italic;">N/A</span>';
  }

  // Handle primitive types (string, number, boolean)
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    // Special formatting for logo_url - show as link
    if (fieldKey === 'logo_url' || fieldKey === 'logo url') {
      return `<a href="${value}" target="_blank" style="color: #00E5FF; text-decoration: underline;">[View Image]</a>`;
    }
    // Special formatting for website
    if (fieldKey === 'website') {
      return `<a href="${value}" target="_blank" style="color: #00E5FF; text-decoration: underline;">${value}</a>`;
    }
    // Special formatting for phone
    if (fieldKey === 'phone') {
      return `Tel: ${value}`;
    }
    // Special formatting for grid positions
    if (fieldKey === 'grid_col' || fieldKey === 'grid col') {
      return `Column: ${value}`;
    }
    if (fieldKey === 'grid_row' || fieldKey === 'grid row') {
      return `Row: ${value}`;
    }
    // Special formatting for category_id
    if (fieldKey === 'category_id' || fieldKey === 'category id') {
      return `Category ID: ${value}`;
    }
    return String(value);
  }

  // Handle arrays
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '<span style="color: #888; font-style: italic;">Empty</span>';
    }

    // Special formatting for services (simple string array)
    if (fieldKey === 'services') {
      return value.map(item => `• ${item}`).join('<br>');
    }

    // Generic array formatting
    return value.map((item, index) => `${index + 1}. ${typeof item === 'object' ? JSON.stringify(item) : item}`).join('<br>');
  }

  // Handle objects
  if (typeof value === 'object') {
    // Special formatting for OPENING_HOURS object
    if (fieldKey === 'opening_hours' || fieldKey === 'opening hours') {
      const parts: string[] = [];
      if (value.open) parts.push(`<strong>Opens:</strong> ${value.open}`);
      if (value.close) parts.push(`<strong>Closes:</strong> ${value.close}`);
      if (value.days) parts.push(`<strong>Days:</strong> ${value.days}`);
      return parts.length > 0 ? parts.join('<br>') : '<span style="color: #888; font-style: italic;">No hours specified</span>';
    }

    // Special formatting for PRICING object
    if (fieldKey === 'pricing') {
      return formatPricingValue(value);
    }

    // Check if empty object
    if (Object.keys(value).length === 0) {
      return '<span style="color: #888; font-style: italic;">Empty</span>';
    }

    // Generic object formatting (key-value pairs)
    return Object.entries(value)
      .map(([key, val]) => {
        if (typeof val === 'object' && val !== null) {
          return `<strong>${key}:</strong> ${JSON.stringify(val)}`;
        }
        return `<strong>${key}:</strong> ${val}`;
      })
      .join('<br>');
  }

  // Fallback to JSON.stringify for complex types
  return JSON.stringify(value, null, 2);
}

/**
 * Format pricing object for display
 */
function formatPricingValue(value: Record<string, unknown>): string {
  const parts: string[] = [];

  // Helper to safely extract price value from various formats
  const extractPrice = (field: unknown): string => {
    if (field === null || field === undefined) return 'N/A';
    if (typeof field === 'string' || typeof field === 'number') return String(field);
    if (typeof field === 'object') {
      const obj = field as Record<string, unknown>;
      // Try common price property names
      if (obj.price !== undefined && obj.price !== null) return String(obj.price);
      if (obj.value !== undefined && obj.value !== null) return String(obj.value);
      if (obj.amount !== undefined && obj.amount !== null) return String(obj.amount);
      // If object has 'available' property, might be status object
      if (obj.available === false) return 'N/A';
      // Last resort: check if it's an empty object
      return Object.keys(obj).length === 0 ? 'N/A' : 'Check data';
    }
    return 'N/A';
  };

  // Handle rooms field
  if (value.rooms !== null && value.rooms !== undefined) {
    parts.push(`<strong>Rooms:</strong> ${extractPrice(value.rooms)}฿`);
  }

  // Handle barfine field
  if (value.barfine !== null && value.barfine !== undefined) {
    parts.push(`<strong>Barfine:</strong> ${extractPrice(value.barfine)}฿`);
  }

  // Handle ladydrink field
  if (value.ladydrink !== null && value.ladydrink !== undefined) {
    parts.push(`<strong>Lady Drink:</strong> ${extractPrice(value.ladydrink)}฿`);
  }

  // Handle consumables array in pricing
  if (value.consumables && Array.isArray(value.consumables)) {
    if (value.consumables.length > 0) {
      parts.push(`<br><strong>Consumables:</strong>`);
      value.consumables.forEach((item: { name?: string; consumable_id?: string; price?: number | string }) => {
        // Try to get name, fallback to shortened ID
        const itemName = item.name || item.consumable_id || 'Unknown';
        const displayName = typeof itemName === 'string' && itemName.length > 36
          ? `<span style="color: #FFD700;">Consumable</span> (${itemName.substring(0, 8)}...)`
          : itemName;
        parts.push(`  • ${displayName}: ${item.price}฿`);
      });
    }
  }

  return parts.length > 0 ? parts.join('<br>') : '<span style="color: #888; font-style: italic;">No pricing data</span>';
}
