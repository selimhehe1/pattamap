/**
 * Freelance Validation Tests
 *
 * Tests for freelance business logic validation:
 * - validateEstablishmentIsNightclub
 * - validateAllEstablishmentsAreNightclubs
 * - validateFreelanceRules
 * - getFreelanceNightclubs
 */

import {
  validateEstablishmentIsNightclub,
  validateAllEstablishmentsAreNightclubs,
  validateFreelanceRules,
  getFreelanceNightclubs
} from '../freelanceValidation';
import { supabase } from '../../config/supabase';

// Mock dependencies
jest.mock('../../config/supabase', () => ({
  supabase: {
    from: jest.fn()
  }
}));

jest.mock('../logger', () => ({
  logger: {
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn()
  }
}));

describe('Freelance Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ========================================
  // validateEstablishmentIsNightclub Tests
  // ========================================
  describe('validateEstablishmentIsNightclub', () => {
    it('should return isNightclub=true for Nightclub category', async () => {
      const mockEstablishment = {
        id: 'est-123',
        name: 'Test Club',
        category: [{ name: 'Nightclub' }]
      };

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockEstablishment,
              error: null
            })
          })
        })
      });

      const result = await validateEstablishmentIsNightclub('est-123');

      expect(result.isNightclub).toBe(true);
      expect(result.categoryName).toBe('Nightclub');
      expect(result.error).toBeNull();
    });

    it('should return isNightclub=false for non-Nightclub category', async () => {
      const mockEstablishment = {
        id: 'est-456',
        name: 'Test Bar',
        category: [{ name: 'Bar' }]
      };

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockEstablishment,
              error: null
            })
          })
        })
      });

      const result = await validateEstablishmentIsNightclub('est-456');

      expect(result.isNightclub).toBe(false);
      expect(result.categoryName).toBe('Bar');
      expect(result.error).toBeNull();
    });

    it('should return error when establishment not found', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' }
            })
          })
        })
      });

      const result = await validateEstablishmentIsNightclub('non-existent');

      expect(result.isNightclub).toBe(false);
      expect(result.categoryName).toBeNull();
      expect(result.error).toBe('Establishment not found');
    });

    it('should handle null category gracefully', async () => {
      const mockEstablishment = {
        id: 'est-789',
        name: 'Test Place',
        category: null
      };

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockEstablishment,
              error: null
            })
          })
        })
      });

      const result = await validateEstablishmentIsNightclub('est-789');

      expect(result.isNightclub).toBe(false);
      expect(result.categoryName).toBeNull();
      expect(result.error).toBeNull();
    });

    it('should handle empty category array', async () => {
      const mockEstablishment = {
        id: 'est-abc',
        name: 'Test Place',
        category: []
      };

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockEstablishment,
              error: null
            })
          })
        })
      });

      const result = await validateEstablishmentIsNightclub('est-abc');

      expect(result.isNightclub).toBe(false);
      expect(result.categoryName).toBeNull();
    });

    it('should handle database exception', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockRejectedValue(new Error('Database connection failed'))
          })
        })
      });

      const result = await validateEstablishmentIsNightclub('est-error');

      expect(result.isNightclub).toBe(false);
      expect(result.categoryName).toBeNull();
      expect(result.error).toBe('Failed to validate establishment category');
    });
  });

  // ========================================
  // validateAllEstablishmentsAreNightclubs Tests
  // ========================================
  describe('validateAllEstablishmentsAreNightclubs', () => {
    it('should return valid=true for empty array', async () => {
      const result = await validateAllEstablishmentsAreNightclubs([]);

      expect(result.valid).toBe(true);
      expect(result.invalidEstablishments).toHaveLength(0);
      expect(result.error).toBeNull();
    });

    it('should return valid=true when all establishments are Nightclubs', async () => {
      const mockEstablishments = [
        { id: 'est-1', name: 'Club A', category: [{ name: 'Nightclub' }] },
        { id: 'est-2', name: 'Club B', category: [{ name: 'Nightclub' }] }
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({
            data: mockEstablishments,
            error: null
          })
        })
      });

      const result = await validateAllEstablishmentsAreNightclubs(['est-1', 'est-2']);

      expect(result.valid).toBe(true);
      expect(result.invalidEstablishments).toHaveLength(0);
      expect(result.error).toBeNull();
    });

    it('should return valid=false with invalid establishments list', async () => {
      const mockEstablishments = [
        { id: 'est-1', name: 'Club A', category: [{ name: 'Nightclub' }] },
        { id: 'est-2', name: 'Bar B', category: [{ name: 'Bar' }] },
        { id: 'est-3', name: 'Restaurant C', category: [{ name: 'Restaurant' }] }
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({
            data: mockEstablishments,
            error: null
          })
        })
      });

      const result = await validateAllEstablishmentsAreNightclubs(['est-1', 'est-2', 'est-3']);

      expect(result.valid).toBe(false);
      expect(result.invalidEstablishments).toHaveLength(2);
      expect(result.invalidEstablishments).toContainEqual({
        id: 'est-2',
        name: 'Bar B',
        category: 'Bar'
      });
      expect(result.invalidEstablishments).toContainEqual({
        id: 'est-3',
        name: 'Restaurant C',
        category: 'Restaurant'
      });
      expect(result.error).toBeNull();
    });

    it('should return error when database query fails', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' }
          })
        })
      });

      const result = await validateAllEstablishmentsAreNightclubs(['est-1']);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Failed to fetch establishments');
    });

    it('should return error when some establishments not found', async () => {
      const mockEstablishments = [
        { id: 'est-1', name: 'Club A', category: [{ name: 'Nightclub' }] }
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({
            data: mockEstablishments,
            error: null
          })
        })
      });

      // Requesting 2 establishments but only 1 found
      const result = await validateAllEstablishmentsAreNightclubs(['est-1', 'est-2']);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('One or more establishments not found');
    });

    it('should handle null establishments array', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({
            data: null,
            error: null
          })
        })
      });

      const result = await validateAllEstablishmentsAreNightclubs(['est-1']);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('One or more establishments not found');
    });

    it('should handle establishment with null category as invalid', async () => {
      const mockEstablishments = [
        { id: 'est-1', name: 'Unknown Place', category: null }
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({
            data: mockEstablishments,
            error: null
          })
        })
      });

      const result = await validateAllEstablishmentsAreNightclubs(['est-1']);

      expect(result.valid).toBe(false);
      expect(result.invalidEstablishments).toHaveLength(1);
      expect(result.invalidEstablishments[0].category).toBe('Unknown');
    });

    it('should handle database exception', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockRejectedValue(new Error('Connection timeout'))
        })
      });

      const result = await validateAllEstablishmentsAreNightclubs(['est-1']);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Failed to validate establishments');
    });
  });

  // ========================================
  // validateFreelanceRules Tests
  // ========================================
  describe('validateFreelanceRules', () => {
    describe('Regular employees (non-freelance)', () => {
      it('should allow regular employee with one establishment', async () => {
        const result = await validateFreelanceRules(null, false, ['est-1']);

        expect(result.valid).toBe(true);
        expect(result.error).toBeNull();
      });

      it('should allow regular employee with no establishment', async () => {
        const result = await validateFreelanceRules(null, false, []);

        expect(result.valid).toBe(true);
        expect(result.error).toBeNull();
      });

      it('should reject regular employee with multiple establishments', async () => {
        const result = await validateFreelanceRules(null, false, ['est-1', 'est-2']);

        expect(result.valid).toBe(false);
        expect(result.error).toBe('Regular employees can only have one current establishment');
      });
    });

    describe('Freelance employees', () => {
      it('should allow freelance with no establishments', async () => {
        const result = await validateFreelanceRules(null, true, []);

        expect(result.valid).toBe(true);
        expect(result.error).toBeNull();
      });

      it('should allow freelance with one Nightclub', async () => {
        const mockEstablishments = [
          { id: 'est-1', name: 'Club A', category: [{ name: 'Nightclub' }] }
        ];

        (supabase.from as jest.Mock).mockReturnValue({
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({
              data: mockEstablishments,
              error: null
            })
          })
        });

        const result = await validateFreelanceRules(null, true, ['est-1']);

        expect(result.valid).toBe(true);
        expect(result.error).toBeNull();
      });

      it('should allow freelance with multiple Nightclubs', async () => {
        const mockEstablishments = [
          { id: 'est-1', name: 'Club A', category: [{ name: 'Nightclub' }] },
          { id: 'est-2', name: 'Club B', category: [{ name: 'Nightclub' }] },
          { id: 'est-3', name: 'Club C', category: [{ name: 'Nightclub' }] }
        ];

        (supabase.from as jest.Mock).mockReturnValue({
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({
              data: mockEstablishments,
              error: null
            })
          })
        });

        const result = await validateFreelanceRules('emp-123', true, ['est-1', 'est-2', 'est-3']);

        expect(result.valid).toBe(true);
        expect(result.error).toBeNull();
      });

      it('should reject freelance with non-Nightclub establishment', async () => {
        const mockEstablishments = [
          { id: 'est-1', name: 'Test Bar', category: [{ name: 'Bar' }] }
        ];

        (supabase.from as jest.Mock).mockReturnValue({
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({
              data: mockEstablishments,
              error: null
            })
          })
        });

        const result = await validateFreelanceRules(null, true, ['est-1']);

        expect(result.valid).toBe(false);
        expect(result.error).toContain('Freelances can only be associated with Nightclubs');
        expect(result.error).toContain('Test Bar (Bar)');
      });

      it('should reject freelance with mixed establishment types', async () => {
        const mockEstablishments = [
          { id: 'est-1', name: 'Club A', category: [{ name: 'Nightclub' }] },
          { id: 'est-2', name: 'Bar B', category: [{ name: 'Bar' }] }
        ];

        (supabase.from as jest.Mock).mockReturnValue({
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({
              data: mockEstablishments,
              error: null
            })
          })
        });

        const result = await validateFreelanceRules(null, true, ['est-1', 'est-2']);

        expect(result.valid).toBe(false);
        expect(result.error).toContain('Bar B (Bar)');
      });

      it('should handle validation error', async () => {
        (supabase.from as jest.Mock).mockReturnValue({
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' }
            })
          })
        });

        const result = await validateFreelanceRules(null, true, ['est-1']);

        expect(result.valid).toBe(false);
        expect(result.error).toBe('Failed to fetch establishments');
      });
    });
  });

  // ========================================
  // getFreelanceNightclubs Tests
  // ========================================
  describe('getFreelanceNightclubs', () => {
    it('should return nightclub IDs for freelance employee', async () => {
      const mockEmploymentHistory = [
        {
          establishment_id: 'est-1',
          establishments: [{ id: 'est-1', category: [{ name: 'Nightclub' }] }]
        },
        {
          establishment_id: 'est-2',
          establishments: [{ id: 'est-2', category: [{ name: 'Nightclub' }] }]
        }
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: mockEmploymentHistory,
              error: null
            })
          })
        })
      });

      const result = await getFreelanceNightclubs('emp-123');

      expect(result).toEqual(['est-1', 'est-2']);
    });

    it('should filter out non-Nightclub establishments', async () => {
      const mockEmploymentHistory = [
        {
          establishment_id: 'est-1',
          establishments: [{ id: 'est-1', category: [{ name: 'Nightclub' }] }]
        },
        {
          establishment_id: 'est-2',
          establishments: [{ id: 'est-2', category: [{ name: 'Bar' }] }]
        }
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: mockEmploymentHistory,
              error: null
            })
          })
        })
      });

      const result = await getFreelanceNightclubs('emp-123');

      expect(result).toEqual(['est-1']);
    });

    it('should return empty array when no nightclubs found', async () => {
      const mockEmploymentHistory = [
        {
          establishment_id: 'est-1',
          establishments: [{ id: 'est-1', category: [{ name: 'Bar' }] }]
        }
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: mockEmploymentHistory,
              error: null
            })
          })
        })
      });

      const result = await getFreelanceNightclubs('emp-123');

      expect(result).toEqual([]);
    });

    it('should return empty array on database error', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' }
            })
          })
        })
      });

      const result = await getFreelanceNightclubs('emp-123');

      expect(result).toEqual([]);
    });

    it('should return empty array when employee has no employment history', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        })
      });

      const result = await getFreelanceNightclubs('emp-123');

      expect(result).toEqual([]);
    });

    it('should handle database exception', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockRejectedValue(new Error('Connection failed'))
          })
        })
      });

      const result = await getFreelanceNightclubs('emp-123');

      expect(result).toEqual([]);
    });

    it('should handle null establishments in employment history', async () => {
      const mockEmploymentHistory = [
        {
          establishment_id: 'est-1',
          establishments: null
        }
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: mockEmploymentHistory,
              error: null
            })
          })
        })
      });

      const result = await getFreelanceNightclubs('emp-123');

      expect(result).toEqual([]);
    });
  });
});
