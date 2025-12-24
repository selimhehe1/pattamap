import { useCallback } from 'react';
import { useNavigateWithTransition } from '../../../../hooks/useNavigateWithTransition';
import { Establishment, CustomBar } from '../../../../types';
import { generateEstablishmentUrl } from '../../../../utils/slugify';
import { BarType, DEFAULT_BAR_TYPE, getBarStyle } from '../../../../utils/mapConstants';
import { MapBar } from './useMapState';
import { ZoneType } from './useDragDropHandler';

/**
 * Options for useBarClickHandler hook
 */
export interface UseBarClickHandlerOptions {
  /** Zone identifier */
  zone: ZoneType;

  /** All establishments data */
  establishments: Establishment[];

  /** Whether edit mode is enabled */
  isEditMode: boolean;

  /** Optional callback when an establishment is clicked */
  onEstablishmentClick?: (establishment: Establishment) => void;

  /** Optional callback when a bar is clicked (legacy CustomBar format) */
  onBarClick?: (bar: CustomBar) => void;
}

/**
 * Return type for useBarClickHandler hook
 */
export interface UseBarClickHandlerReturn {
  /** Handle click on a bar */
  handleBarClick: (bar: MapBar) => void;

  /** Handle keyboard event on a bar (Enter/Space) */
  handleBarKeyDown: (bar: MapBar, event: React.KeyboardEvent) => void;
}

/**
 * Valid bar types for CustomBar
 */
const VALID_BAR_TYPES: BarType[] = ['gogo', 'beer', 'pub', 'nightclub', 'massage'];

/**
 * Convert MapBar to CustomBar format for legacy callbacks
 */
function mapBarToCustomBar(bar: MapBar, _establishment?: Establishment): CustomBar {
  // Ensure type is a valid BarType
  const barType = VALID_BAR_TYPES.includes(bar.type as BarType)
    ? (bar.type as BarType)
    : DEFAULT_BAR_TYPE;

  const style = getBarStyle(barType);

  return {
    id: bar.id,
    name: bar.name,
    type: barType,
    position: bar.position,
    color: style.color,
    icon: bar.icon,
  };
}

/**
 * useBarClickHandler - Centralized bar click handling for map components
 *
 * Handles:
 * - Direct navigation to establishment page
 * - Callback to parent components (onEstablishmentClick, onBarClick)
 * - Keyboard accessibility (Enter/Space)
 * - Edit mode blocking (no navigation while editing)
 *
 * Previously duplicated ~30 lines × 9 maps = 270+ lines of duplicate code.
 *
 * @example
 * const { handleBarClick, handleBarKeyDown } = useBarClickHandler({
 *   zone: 'soi6',
 *   establishments,
 *   isEditMode,
 *   onEstablishmentClick,
 * });
 *
 * // In JSX:
 * <div
 *   onClick={() => handleBarClick(bar)}
 *   onKeyDown={(e) => handleBarKeyDown(bar, e)}
 * />
 */
export const useBarClickHandler = (
  options: UseBarClickHandlerOptions
): UseBarClickHandlerReturn => {
  const { zone, establishments, isEditMode, onEstablishmentClick, onBarClick } =
    options;

  const navigate = useNavigateWithTransition();

  /**
   * Handle click on a bar
   */
  const handleBarClick = useCallback(
    (bar: MapBar) => {
      // Don't navigate while in edit mode
      if (isEditMode) {
        return;
      }

      // Find the full establishment data
      const establishment = establishments.find((est) => est.id === bar.id);

      // Priority 1: Call onEstablishmentClick if provided and establishment found
      if (onEstablishmentClick && establishment) {
        onEstablishmentClick(establishment);
        return;
      }

      // Priority 2: Call onBarClick if provided (legacy support)
      if (onBarClick) {
        const customBar = mapBarToCustomBar(bar, establishment);
        onBarClick(customBar);
        return;
      }

      // Priority 3: Navigate to establishment page
      const establishmentZone = establishment?.zone || zone;
      const url = generateEstablishmentUrl(bar.id, bar.name, establishmentZone);
      navigate(url);
    },
    [isEditMode, establishments, onEstablishmentClick, onBarClick, zone, navigate]
  );

  /**
   * Handle keyboard event on a bar (Enter/Space for accessibility)
   */
  const handleBarKeyDown = useCallback(
    (bar: MapBar, event: React.KeyboardEvent) => {
      // Trigger click on Enter or Space
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleBarClick(bar);
      }
    },
    [handleBarClick]
  );

  return {
    handleBarClick,
    handleBarKeyDown,
  };
};

export default useBarClickHandler;
