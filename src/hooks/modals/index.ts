/**
 * Modal Hooks - Barrel Export
 *
 * Individual modal hooks for specific use cases.
 * For combined functionality, use useAppModals from parent hooks folder.
 */

export { useAuthModals, AUTH_MODAL_IDS } from './useAuthModals';
export type { UseAuthModalsReturn } from './useAuthModals';

export { useEmployeeFormModal, EMPLOYEE_FORM_MODAL_ID } from './useEmployeeFormModal';
export type { UseEmployeeFormModalReturn, UseEmployeeFormModalState, UseEmployeeFormModalActions } from './useEmployeeFormModal';

export { useEstablishmentFormModal, ESTABLISHMENT_FORM_MODAL_ID } from './useEstablishmentFormModal';
export type { UseEstablishmentFormModalReturn, UseEstablishmentFormModalState, UseEstablishmentFormModalActions } from './useEstablishmentFormModal';

export { useProfileModals, PROFILE_MODAL_IDS } from './useProfileModals';
export type { UseProfileModalsReturn } from './useProfileModals';
