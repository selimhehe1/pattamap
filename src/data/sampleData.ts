import { Establishment, EstablishmentCategory } from '../types';

// Sample categories for filter initialization
export const sampleCategories: EstablishmentCategory[] = [
  {
    id: 'cat-001',
    name: 'Go-Go Bar',
    icon: '💃',
    color: '#C19A6B',
    created_at: new Date().toISOString()
  },
  {
    id: 'cat-002',
    name: 'Beer Bar',
    icon: '🍺',
    color: '#FFD700',
    created_at: new Date().toISOString()
  },
  {
    id: 'cat-003',
    name: 'Nightclub',
    icon: '🎵',
    color: '#9C27B0',
    created_at: new Date().toISOString()
  },
  {
    id: 'cat-004',
    name: 'Massage',
    icon: '💆',
    color: '#00BCD4',
    created_at: new Date().toISOString()
  },
  {
    id: 'cat-005',
    name: 'Restaurant',
    icon: '🍽️',
    color: '#4CAF50',
    created_at: new Date().toISOString()
  },
  {
    id: 'cat-006',
    name: 'Hotel',
    icon: '🏨',
    color: '#F44336',
    created_at: new Date().toISOString()
  }
];

// Empty establishments array - real data loaded from API
export const sampleEstablishments: Establishment[] = [];
