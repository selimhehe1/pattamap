/**
 * Map Shared Module
 *
 * Central export for all shared map functionality.
 * Import from this file to access hooks, components, and utilities.
 *
 * This module eliminates ~7,500 lines of duplicate code across 9 zone maps.
 *
 * @example
 * import {
 *   useMapState,
 *   useResponsiveMap,
 *   useDragDropHandler,
 *   useBarClickHandler,
 *   MapContainer
 * } from './shared';
 */

// Hooks
export * from './hooks';

// Components
export * from './components';

// Utilities
export * from './utils';
