// Shared constants for validation across controllers

export const VALID_SEX_VALUES = ['male', 'female', 'ladyboy'] as const;
export type SexValue = typeof VALID_SEX_VALUES[number];

export const VALID_ACCOUNT_TYPES = ['regular', 'employee', 'establishment_owner'] as const;
export type AccountType = typeof VALID_ACCOUNT_TYPES[number];
