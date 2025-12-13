-- ============================================================================
-- Migration: Soi Buakhao Grid 3×18 → 2×40
-- ============================================================================
-- Raison: Soi Buakhao est une rue verticale de 1.7km (vs 300m pour Soi 6)
-- Nouvelle config: 2 rows (West/East sides) × 40 cols (longueur) = 80 positions
-- Ancienne config: 3 rows × 18 cols = 54 positions
--
-- Note: Cette migration NE SUPPRIME PAS les données existantes, elle met
-- seulement à jour les contraintes pour permettre la nouvelle grille.
-- ============================================================================
BEGIN;

-- Étape 1: Supprimer l'ancienne contrainte de grille Soi Buakhao (si existe)
ALTER TABLE establishments DROP CONSTRAINT IF EXISTS check_soibuakhao_grid;

-- Étape 2: Créer la nouvelle contrainte pour grille 2×40
ALTER TABLE establishments ADD CONSTRAINT check_soibuakhao_grid
CHECK (
  zone != 'soibuakhao' OR
  (grid_row >= 1 AND grid_row <= 2 AND grid_col >= 1 AND grid_col <= 40)
);

-- Étape 3: Ajouter un commentaire explicatif
COMMENT ON CONSTRAINT check_soibuakhao_grid ON establishments IS
'Soi Buakhao: 2 rows (West/East sides) × 40 cols (1.7km vertical street) = 80 positions total. Intersections: South Pattaya Rd, Soi Lengkee, Soi Diana (LK Metro), Soi Honey, Tree Town, Central Pattaya Rd.';

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
WHERE zone = 'soibuakhao'
  AND (grid_row > 2 OR grid_col > 40);

-- ============================================================================
-- Post-Migration Actions Recommandées:
-- ============================================================================
-- 1. Repositionner manuellement les établissements hors limite (si existants)
-- 2. Tester le drag & drop en mode Edit sur la carte Soi Buakhao
-- 3. Vérifier que les 6 intersections s'affichent correctement
-- ============================================================================

COMMIT;
