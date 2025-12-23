/**
 * Barrel export for all contexts
 *
 * Usage:
 * import { useAuth, useModal, useTheme } from '../contexts';
 */

// Auth
export { AuthProvider, useAuth } from './AuthContext';

// Security
export { CSRFProvider, useCSRF } from './CSRFContext';

// UI/UX
export { ModalProvider, useModal } from './ModalContext';
export { ThemeProvider, useTheme } from './ThemeContext';
export { SidebarProvider, useSidebar } from './SidebarContext';

// Map
export { MapControlsProvider, useMapControls } from './MapControlsContext';

// Gamification
export { GamificationProvider, useGamification } from './GamificationContext';
