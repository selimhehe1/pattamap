import { Establishment, EstablishmentCategory } from '../types';

// Sample categories for filter initialization
// Icons are category keys that map to Lucide icons via getCategoryIcon()
export const sampleCategories: EstablishmentCategory[] = [
  {
    id: 'cat-001',
    name: 'Go-Go Bar',
    icon: 'gogo',
    color: '#C19A6B',
    created_at: new Date().toISOString()
  },
  {
    id: 'cat-002',
    name: 'Beer Bar',
    icon: 'bar',
    color: '#FFD700',
    created_at: new Date().toISOString()
  },
  {
    id: 'cat-003',
    name: 'Nightclub',
    icon: 'club',
    color: '#9C27B0',
    created_at: new Date().toISOString()
  },
  {
    id: 'cat-004',
    name: 'Massage',
    icon: 'massage',
    color: '#00BCD4',
    created_at: new Date().toISOString()
  },
  {
    id: 'cat-005',
    name: 'Restaurant',
    icon: 'restaurant',
    color: '#4CAF50',
    created_at: new Date().toISOString()
  },
  {
    id: 'cat-006',
    name: 'Hotel',
    icon: 'hotel',
    color: '#F44336',
    created_at: new Date().toISOString()
  }
];

// Empty establishments array - real data loaded from API
export const sampleEstablishments: Establishment[] = [];
