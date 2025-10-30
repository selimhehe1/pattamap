# 🗺️ Système de Cartes Ergonomiques - PattaMap

## Innovation UX Principale

PattaMap révolutionne la navigation dans les zones de nightlife denses de Pattaya avec un **système de cartes ergonomiques non-réalistes** optimisées pour la lisibilité plutôt que la géographie exacte.

### Problème Résolu

❌ **Cartes traditionnelles (Google Maps)** dans zones denses:
- Établissements collés les uns sur les autres (illisible)
- Zoom/dezoom constant (mauvaise UX mobile)
- Orientation difficile dans ruelles étroites
- Noms tronqués ou cachés

✅ **Solution PattaMap - Grilles Ergonomiques**:
- Chaque établissement a sa propre case (toujours lisible)
- Design immersif nightlife (couleurs, animations)
- Navigation tactile intuitive (drag, pinch-to-zoom)
- Adresses texte pour localisation réelle via Google Maps

---

## Architecture Système

### 9 Zones Géographiques

| Zone | Grille | Capacité | Type | Spécificités |
|------|--------|----------|------|--------------|
| **Soi 6** | 2×20 | 40 positions | Bars open-air | Grille simple, alignement rue |
| **Walking Street** | 12×5 topographique | 60 positions | Mixed nightlife | **Grille complexe** avec chemins |
| **LK Metro** | L-shape | 33 positions | Gay-friendly | Forme en L |
| **Treetown** | U-shape | 42 positions | Lesbian bars | Forme en U |
| **Soi Buakhao** | 3×18 | 54 positions | Commercial | 3 rangées parallèles |
| **Jomtien Complex** | 2×15 | 30 positions | Beach LGBT+ | Grille simple bord de mer |
| **BoyzTown** | 2×12 | 24 positions | Gay district | Grille compacte |
| **Soi 7 & 8** | 3×16 | 48 positions | Traditional bars | 2 rues (Soi 7 + Soi 8) |
| **Beach Road Central** | 2×22 | 44 positions | Seafront | Grille longue alignée plage |

**Total**: 322 positions disponibles

---

## Composants React

### Structure des Cartes

```tsx
// Exemple: src/components/Map/Soi6Map.tsx
interface MapProps {
  establishments: Establishment[];
  onEstablishmentClick: (id: string) => void;
  isAdmin?: boolean;
}

const Soi6Map: React.FC<MapProps> = ({ establishments, onEstablishmentClick, isAdmin }) => {
  const [canvasRef, setCanvasRef] = useState<HTMLCanvasElement | null>(null);

  // Render roads avec HTML5 Canvas
  useEffect(() => {
    if (canvasRef) {
      const ctx = canvasRef.getContext('2d');
      drawRoads(ctx, GRID_CONFIG.soi6);
    }
  }, [canvasRef]);

  return (
    <div className="map-container">
      <canvas ref={setCanvasRef} className="road-overlay" />
      <div className="grid-layout" style={gridStyle}>
        {renderGridCells()}
      </div>
    </div>
  );
};
```

### 9 Composants Spécialisés

1. **Soi6Map.tsx** - Grille simple 2×20
2. **WalkingStreetMap.tsx** - Grille topographique complexe 12×5
3. **LKMetroMap.tsx** - Forme L
4. **TreetownMap.tsx** - Forme U
5. **SoiBuakhaoMap.tsx** - 3 rangées parallèles
6. **JomtienComplexMap.tsx** - Grille bord de mer
7. **BoyzTownMap.tsx** - Grille compacte
8. **Soi78Map.tsx** - 2 rues séparées
9. **BeachRoadCentralMap.tsx** - Grille longue seafront

### Composant Commun: RoadOverlay

```tsx
// src/components/Map/RoadOverlay.tsx
interface RoadConfig {
  roads: Array<{
    type: 'vertical' | 'horizontal' | 'curved';
    start: { row: number; col: number };
    end?: { row: number; col: number };
    curve?: { cpX: number; cpY: number };
  }>;
}

const RoadOverlay: React.FC<{ config: RoadConfig }> = ({ config }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw roads
    config.roads.forEach(road => {
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 4;

      if (road.type === 'curved' && road.curve) {
        // Bezier curve for Walking Street topographic
        ctx.beginPath();
        ctx.moveTo(road.start.col, road.start.row);
        ctx.quadraticCurveTo(road.curve.cpX, road.curve.cpY, road.end.col, road.end.row);
        ctx.stroke();
      } else {
        // Straight road
        ctx.beginPath();
        ctx.moveTo(road.start.col, road.start.row);
        ctx.lineTo(road.end.col, road.end.row);
        ctx.stroke();
      }
    });
  }, [config]);

  return <canvas ref={canvasRef} className="road-overlay" />;
};
```

---

## Database Schema

### Table: `establishments`

```sql
CREATE TABLE establishments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  category_id UUID REFERENCES establishment_categories(id),

  -- Position sur la carte
  zone VARCHAR(50) NOT NULL,          -- 'soi6', 'walking_street', etc.
  grid_row INTEGER,                    -- Position Y (null si pas encore placé)
  grid_col INTEGER,                    -- Position X (null si pas encore placé)

  -- Adresse réelle (pour Google Maps)
  address TEXT,
  google_maps_url TEXT,

  -- Métadonnées
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour queries rapides par zone
CREATE INDEX idx_establishments_zone ON establishments(zone);
CREATE INDEX idx_establishments_grid ON establishments(zone, grid_row, grid_col);
```

### Contraintes Grilles

```sql
-- Vérifier que les positions sont dans les limites
ALTER TABLE establishments ADD CONSTRAINT check_soi6_grid
  CHECK (
    (zone != 'soi6') OR
    (grid_row BETWEEN 0 AND 1 AND grid_col BETWEEN 0 AND 19)
  );

ALTER TABLE establishments ADD CONSTRAINT check_walking_street_grid
  CHECK (
    (zone != 'walking_street') OR
    (grid_row BETWEEN 0 AND 11 AND grid_col BETWEEN 0 AND 4)
  );

-- Empêcher doublons position
CREATE UNIQUE INDEX idx_unique_position ON establishments(zone, grid_row, grid_col)
  WHERE grid_row IS NOT NULL AND grid_col IS NOT NULL;
```

---

## Drag & Drop Admin

### Système de Positionnement

```tsx
// src/components/Admin/GridPositionEditor.tsx
interface GridCell {
  row: number;
  col: number;
  establishment?: Establishment;
}

const GridPositionEditor: React.FC = () => {
  const [draggedEstablishment, setDraggedEstablishment] = useState<Establishment | null>(null);

  const handleDragStart = (e: React.DragEvent, establishment: Establishment) => {
    setDraggedEstablishment(establishment);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = async (e: React.DragEvent, row: number, col: number) => {
    e.preventDefault();
    if (!draggedEstablishment) return;

    // Update position via API
    await updateEstablishmentPosition(draggedEstablishment.id, {
      zone: currentZone,
      grid_row: row,
      grid_col: col
    });

    setDraggedEstablishment(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Allow drop
    e.dataTransfer.dropEffect = 'move';
  };

  return (
    <div className="grid-editor">
      {gridCells.map(cell => (
        <div
          key={`${cell.row}-${cell.col}`}
          className={`grid-cell ${cell.establishment ? 'occupied' : 'empty'}`}
          onDrop={(e) => handleDrop(e, cell.row, cell.col)}
          onDragOver={handleDragOver}
        >
          {cell.establishment && (
            <div
              draggable
              onDragStart={(e) => handleDragStart(e, cell.establishment)}
              className="draggable-establishment"
            >
              {cell.establishment.name}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
```

### API Endpoint

```typescript
// backend/src/routes/admin.ts
router.put('/establishments/:id/position',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { zone, grid_row, grid_col } = req.body;

    // Validate grid bounds
    if (!isValidGridPosition(zone, grid_row, grid_col)) {
      return res.status(400).json({ error: 'Invalid grid position' });
    }

    // Check if position already occupied
    const existing = await supabase
      .from('establishments')
      .select('id')
      .eq('zone', zone)
      .eq('grid_row', grid_row)
      .eq('grid_col', grid_col)
      .neq('id', id)
      .single();

    if (existing.data) {
      return res.status(409).json({ error: 'Position already occupied' });
    }

    // Update position
    const { data, error } = await supabase
      .from('establishments')
      .update({ zone, grid_row, grid_col })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  }
);
```

---

## Responsive Design

### Hook useContainerSize

```typescript
// src/hooks/useContainerSize.ts
export const useContainerSize = (ref: RefObject<HTMLElement>) => {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateSize = () => {
      if (ref.current) {
        setSize({
          width: ref.current.offsetWidth,
          height: ref.current.offsetHeight
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [ref]);

  return size;
};
```

### Adaptation Mobile

```tsx
// Grille responsive avec taille dynamique
const MapContainer: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { width } = useContainerSize(containerRef);

  // Calculate cell size based on container width
  const cellSize = Math.floor(width / GRID_CONFIG[zone].cols) - CELL_GAP;

  return (
    <div ref={containerRef} className="map-container">
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
          gap: `${CELL_GAP}px`
        }}
      >
        {/* Grid cells */}
      </div>
    </div>
  );
};
```

---

## Interactions Utilisateur

### Zoom & Pan (react-zoom-pan-pinch)

```tsx
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

const ZoomableMap: React.FC = () => (
  <TransformWrapper
    initialScale={1}
    minScale={0.5}
    maxScale={3}
    centerOnInit
  >
    <TransformComponent>
      <Soi6Map establishments={establishments} />
    </TransformComponent>
  </TransformWrapper>
);
```

### Click sur Établissement

```tsx
const handleEstablishmentClick = (id: string) => {
  // Navigate to detail page
  navigate(`/establishments/${id}`);

  // Or open modal
  setSelectedEstablishment(id);
  setModalOpen(true);
};
```

---

## Styling & Thème

### Nightlife Theme

```css
/* src/styles/nightlife-theme.css */

.map-container {
  background: linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 100%);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 8px 32px rgba(255, 0, 127, 0.2);
}

.grid-cell {
  background: rgba(30, 30, 50, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  transition: all 0.3s ease;
  cursor: pointer;
}

.grid-cell:hover {
  background: rgba(50, 50, 80, 0.8);
  border-color: rgba(255, 0, 127, 0.5);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(255, 0, 127, 0.3);
}

.grid-cell.occupied {
  background: rgba(255, 0, 127, 0.2);
  border-color: rgba(255, 0, 127, 0.4);
}

.road-overlay {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 1;
}
```

### Animations (Framer Motion)

```tsx
import { motion } from 'framer-motion';

const EstablishmentCard: React.FC = ({ establishment }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.8 }}
    whileHover={{ scale: 1.05 }}
    className="establishment-card"
  >
    {establishment.name}
  </motion.div>
);
```

---

## Configuration Grilles

### Constants

```typescript
// src/utils/gridConfig.ts
export const GRID_CONFIG = {
  soi6: {
    rows: 2,
    cols: 20,
    shape: 'rectangular',
    roadType: 'simple'
  },
  walking_street: {
    rows: 12,
    cols: 5,
    shape: 'topographic',
    roadType: 'curved',
    roads: [
      { type: 'curved', start: [0, 0], end: [11, 4], cp: [6, 2] },
      { type: 'horizontal', start: [2, 0], end: [2, 4] }
    ]
  },
  lk_metro: {
    rows: 11,
    cols: 4,
    shape: 'L',
    validCells: [ /* Liste des cellules valides pour forme L */ ]
  },
  // ... autres zones
};
```

### Validation Helper

```typescript
export const isValidGridPosition = (
  zone: string,
  row: number,
  col: number
): boolean => {
  const config = GRID_CONFIG[zone];
  if (!config) return false;

  // Check bounds
  if (row < 0 || row >= config.rows || col < 0 || col >= config.cols) {
    return false;
  }

  // Check shape-specific constraints
  if (config.shape === 'L' && config.validCells) {
    return config.validCells.some(cell => cell.row === row && cell.col === col);
  }

  return true;
};
```

---

## Performance Optimizations

### Virtualisation (React Window)

Pour les grandes grilles (Walking Street 60 positions):

```tsx
import { FixedSizeGrid } from 'react-window';

const VirtualizedGrid: React.FC = () => (
  <FixedSizeGrid
    columnCount={GRID_CONFIG.walking_street.cols}
    rowCount={GRID_CONFIG.walking_street.rows}
    columnWidth={100}
    rowHeight={100}
    height={600}
    width={500}
  >
    {({ columnIndex, rowIndex, style }) => (
      <div style={style}>
        {renderGridCell(rowIndex, columnIndex)}
      </div>
    )}
  </FixedSizeGrid>
);
```

### Memoization

```tsx
const MemoizedMapGrid = React.memo(
  ({ establishments, zone }: MapGridProps) => {
    // Render logic
  },
  (prevProps, nextProps) => {
    return prevProps.establishments === nextProps.establishments &&
           prevProps.zone === nextProps.zone;
  }
);
```

---

## Cas d'Usage

### User Flow - Trouver un Bar

1. **Landing Page** → Sélection zone (Soi 6, Walking Street, etc.)
2. **Map View** → Grille ergonomique affichée
3. **Interaction** → Zoom/pan, hover sur établissements
4. **Click** → Modale détails établissement
5. **Action** → Voir employées, voir menu, voir reviews

### Admin Flow - Positionner Nouvel Établissement

1. **Admin Dashboard** → "Ajouter établissement"
2. **Form** → Remplir infos (nom, catégorie, adresse)
3. **Map Editor** → Sélection zone
4. **Drag & Drop** → Placer établissement sur grille
5. **Save** → Position enregistrée en DB

---

## Roadmap

### v10.0 (Planned)
- [ ] **3D Maps** - Three.js pour vue 3D isométrique
- [ ] **AR Mode** - Réalité augmentée (camera overlay)
- [ ] **Heat Maps** - Visualisation popularité par zone
- [ ] **Time-based Display** - Affichage selon heure (happy hour, late night)

### Améliorations UX
- [ ] **Guided Tours** - Tutoriel interactif première visite
- [ ] **Favorites on Map** - Highlight établissements favoris
- [ ] **Filter Overlay** - Filtres visuels (catégorie, prix, rating)

---

## Références

- **Stack Technique**: [TECH_STACK.md](TECH_STACK.md)
- **Structure Projet**: [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)
- **CSS Architecture**: [CSS_ARCHITECTURE.md](CSS_ARCHITECTURE.md)

---

**Innovation Clé**: Le système de cartes ergonomiques de PattaMap transforme la découverte des nightlife districts de Pattaya en privilégiant la **lisibilité et l'expérience utilisateur** plutôt que la géographie exacte, résolvant ainsi les limitations des cartes traditionnelles dans les zones urbaines denses.

---

**Dernière mise à jour**: v9.3.0 (Octobre 2025)
