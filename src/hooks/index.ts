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
export { useSyncQueryInvalidation } from './useSyncQueryInvalidation';

// Performance
export { useWebPSupport } from './useWebPSupport';

// Animations
export { useScrollAnimation, useScrollAnimations } from './useScrollAnimation';

// View Transitions (Phase 3 Modernisation)
export { useViewTransition, withViewTransitionName, VIEW_TRANSITION_NAMES } from './useViewTransition';
export type { UseViewTransitionReturn } from './useViewTransition';
export { useNavigateWithTransition } from './useNavigateWithTransition';
export type { UseNavigateWithTransitionReturn } from './useNavigateWithTransition';

// IntersectionObserver (Phase 5.1)
export { useIntersectionObserver } from './useIntersectionObserver';
export type { UseIntersectionObserverOptions, UseIntersectionObserverReturn } from './useIntersectionObserver';

// Lazy Loading (Phase 5.1)
export { useLazyLoad, useLazyLoadMultiple } from './useLazyLoad';
export type { UseLazyLoadOptions, UseLazyLoadReturn } from './useLazyLoad';

// Infinite Scroll (Phase 5.1)
export { useInfiniteScroll, useInfiniteScrollWithReset } from './useInfiniteScroll';
export type { UseInfiniteScrollOptions, UseInfiniteScrollReturn } from './useInfiniteScroll';

// Optimistic Updates (Phase 5.3 - React 19)
export { useOptimisticRating, useOptimisticToggle } from './useOptimisticRating';
export type {
  UseOptimisticRatingOptions,
  UseOptimisticRatingReturn,
  UseOptimisticToggleOptions,
  UseOptimisticToggleReturn
} from './useOptimisticRating';

// Accessibility (Phase 4 - WCAG AAA)
export { useLiveAnnouncer } from './useLiveAnnouncer';
export type { AriaPoliteness } from './useLiveAnnouncer';
