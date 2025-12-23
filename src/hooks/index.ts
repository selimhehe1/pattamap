/**
 * Barrel export for all hooks
 *
 * Usage:
 * import { useAuth, useModal, useSecureFetch } from '../hooks';
 */

// Application Modals
export { useAppModals } from './useAppModals';
export { useModals } from './useModals';
export { useDialog } from './useDialog';

// Data Fetching
export { useEstablishments } from './useEstablishments';
export { useEmployees } from './useEmployees';
export { useFreelances } from './useFreelances';
export { useFavorites } from './useFavorites';
export { useSecureFetch } from './useSecureFetch';

// Forms
export { useAutoSave } from './useAutoSave';
export { useFormValidation } from './useFormValidation';
export { useFormSubmissions } from './useFormSubmissions';

// UI/UX
export { useMediaQuery } from './useMediaQuery';
export { useFocusTrap } from './useFocusTrap';
export { useContainerSize } from './useContainerSize';
export { useMapHeight } from './useMapHeight';

// Filters
export { useEstablishmentFilters } from './useEstablishmentFilters';

// Gamification
export { useRewards } from './useRewards';
export { useXPHistory } from './useXPHistory';

// Analytics
export { useProfileViewTracking } from './useProfileViewTracking';

// Availability
export { useAvailabilityCheck } from './useAvailabilityCheck';

// Auth
export { useRedirectAfterLogin } from './useRedirectAfterLogin';

// PWA / Offline
export { useOnline } from './useOnline';
export { useOfflineQueue } from './useOfflineQueue';

// Performance
export { useWebPSupport } from './useWebPSupport';

// Animations
export { useScrollAnimation, useScrollAnimations } from './useScrollAnimation';
