# Map Shared Components & Hooks

This directory contains shared utilities, hooks, and components used across all zone maps in PattaMap.

## Architecture Overview

```
shared/
├── hooks/           # React hooks for map functionality
├── components/      # Reusable UI components
└── utils/           # Utility functions
```

## Hooks

### `useMapEditMode`
Manages edit mode state and user permissions for drag & drop.

```typescript
const { isEditMode, setEditMode, canEdit, isAdmin, userRole } = useMapEditMode();
```

**Returns:**
- `isEditMode: boolean` - Whether edit mode is active
- `setEditMode: (value: boolean) => void` - Toggle edit mode
- `canEdit: boolean` - User has permission to edit
- `isAdmin: boolean` - User is admin
- `userRole: string` - Current user role

---

### `useOptimisticPositions`
Handles optimistic UI updates for drag & drop operations.

```typescript
const {
  optimisticPositions,
  applyOptimisticPosition,
  clearOptimisticPosition,
  operationLockUntil,
  setOperationLock
} = useOptimisticPositions();
```

**Usage:**
```typescript
// Apply optimistic position before API call
applyOptimisticPosition(establishmentId, { row: 5, col: 3 });

// Clear on error
clearOptimisticPosition(establishmentId);

// Lock operations for 500ms after success
setOperationLock(500);
```

---

### `useResponsiveMap`
Detects viewport size, orientation, and device type.

```typescript
const { isMobile, isTablet, isDesktop, orientation, viewportWidth } = useResponsiveMap();
```

**Breakpoints:**
- Mobile: `< 768px`
- Tablet: `768px - 1024px`
- Desktop: `> 1024px`

---

### `useDragDropHandler`
Centralized drag & drop logic for all maps.

```typescript
const {
  handleDragStart,
  handleDragOver,
  handleDrop,
  handleDragEnd,
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd,
  resetDragState
} = useDragDropHandler(options);
```

**Options:**
```typescript
interface UseDragDropHandlerOptions {
  zone: ZoneType;
  establishments: Establishment[];
  gridConfig: GridConfig;
  containerRef: React.RefObject<HTMLElement>;
  isMobile: boolean;
  isEditMode: boolean;
  // ... state and setters
}
```

---

### `useBarClickHandler`
Handles establishment bar click/tap navigation.

```typescript
const { handleBarClick } = useBarClickHandler({
  onEstablishmentClick,
  onBarClick,
  navigate
});
```

---

### `useMapState`
Combined state management for map components.

```typescript
const {
  draggedBar,
  isDragging,
  dragOverPosition,
  dropAction,
  mousePosition,
  hoveredBar,
  // ... setters
} = useMapState();
```

## Utils

### `eventCoordinates.ts`
Extract coordinates from mouse/touch events.

```typescript
import { getEventCoordinates } from './utils/eventCoordinates';

const coords = getEventCoordinates(event.nativeEvent);
// Returns { clientX, clientY } or null
```

### `hapticFeedback.ts`
Trigger haptic feedback on mobile devices.

```typescript
import { triggerHaptic } from './utils/hapticFeedback';

triggerHaptic('tap');      // Light tap
triggerHaptic('success');  // Success feedback
triggerHaptic('error');    // Error feedback
```

## Components

### `Bar.tsx`
Individual establishment bar component with drag support.

### `MapContainer.tsx`
Base container for map layouts.

## Refactoring Results

| Map Component | Before | After | Reduction |
|---------------|--------|-------|-----------|
| CustomSoi6Map | 1,933 | 849 | -56% |
| CustomWalkingStreetMap | 1,740 | 772 | -56% |
| CustomLKMetroMap | 1,537 | 566 | -63% |
| CustomBeachRoadMap | 1,690 | 535 | -68% |
| CustomSoiBuakhaoMap | 1,497 | 655 | -56% |
| CustomTreetownMap | 1,358 | 1,022 | -25% |

**Total lines eliminated: ~7,800**

## Zone Types

```typescript
type ZoneType =
  | 'soi6'
  | 'walkingstreet'
  | 'lkmetro'
  | 'beachroad'
  | 'soibuakhao'
  | 'treetown';
```
