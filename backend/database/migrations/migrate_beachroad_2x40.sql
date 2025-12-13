-- ============================================================================
-- Migration: Beach Road Grid 2×22 → 2×40
-- ============================================================================
-- Raison: Beach Road est une route côtière longue de ~3.5km (North Pattaya → Walking Street)
-- Nouvelle config: 2 rows (Beach side/City side) × 40 cols (longueur) = 80 positions
-- Ancienne config: 2 rows × 22 cols = 44 positions
--
-- Note: Cette migration NE SUPPRIME PAS les données existantes, elle met
-- seulement à jour les contraintes pour permettre la nouvelle grille.
-- ============================================================================
BEGIN;

-- Étape 1: Supprimer l'ancienne contrainte de grille Beach Road (si existe)
ALTER TABLE establishments DROP CONSTRAINT IF EXISTS check_beachroad_grid;

-- Étape 2: Créer la nouvelle contrainte pour grille 2×40
ALTER TABLE establishments ADD CONSTRAINT check_beachroad_grid
CHECK (
  zone != 'beachroad' OR
  (grid_row >= 1 AND grid_row <= 2 AND grid_col >= 1 AND grid_col <= 40)
);

-- Étape 3: Ajouter un commentaire explicatif
COMMENT ON CONSTRAINT check_beachroad_grid ON establishments IS
'Beach Road: 2 rows (Beach side/City side) × 40 cols (3.5km coastal road) = 80 positions total. Major intersections: Soi 6 (~15%), Soi 7/8 (~30%), Central Pattaya (~45%), Pattayaland/Soi 13 (~60%), Boyztown (~75%), Walking Street (~95%).';

-- Étape 4 (OPTIONNEL): Vérifier les établissements existants qui seraient hors limite
-- Cette requête liste les établissements qui devront être repositionnés
SELECT
  id,
  name,
  grid_row,
  grid_col,
  CASE
    WHEN grid_row > 2 THEN 'Row out of bounds (max 2)'
    WHEN grid_col > 40 THEN 'Col out of bounds (max 40)'
    ELSE 'Valid'
  END as validation_status
FROM establishments
WHERE zone = 'beachroad'
  AND (grid_row > 2 OR grid_col > 40);

-- ============================================================================
-- Post-Migration Actions Recommandées:
-- ============================================================================
-- 1. Repositionner manuellement les établissements hors limite (si existants)
-- 2. Tester le drag & drop en mode Edit sur la carte Beach Road
-- 3. Vérifier que les 6 intersections majeures s'affichent correctement
-- ============================================================================

COMMIT;
