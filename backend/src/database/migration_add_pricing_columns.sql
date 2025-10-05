-- Migration: Ajouter les colonnes de prix individuelles
-- Date: 2025-09-23
-- Description: Ajouter ladydrink, barfine, rooms à la table establishments

-- Ajouter les colonnes de prix
ALTER TABLE establishments
ADD COLUMN IF NOT EXISTS ladydrink VARCHAR(10) DEFAULT '130',
ADD COLUMN IF NOT EXISTS barfine VARCHAR(10) DEFAULT '400',
ADD COLUMN IF NOT EXISTS rooms VARCHAR(10) DEFAULT 'N/A';

-- Commentaires sur les colonnes
COMMENT ON COLUMN establishments.ladydrink IS 'Prix lady drink en bahts (ex: 130)';
COMMENT ON COLUMN establishments.barfine IS 'Prix barfine en bahts (ex: 400)';
COMMENT ON COLUMN establishments.rooms IS 'Prix chambre en bahts ou N/A si pas de chambres';

-- Index pour les requêtes par prix (optionnel)
CREATE INDEX IF NOT EXISTS idx_establishments_ladydrink ON establishments(ladydrink) WHERE ladydrink != 'N/A';
CREATE INDEX IF NOT EXISTS idx_establishments_barfine ON establishments(barfine) WHERE barfine != 'N/A';
CREATE INDEX IF NOT EXISTS idx_establishments_rooms ON establishments(rooms) WHERE rooms != 'N/A';

-- Validation de la migration
SELECT 'Migration pricing columns completed successfully' as status;

-- Test: compter les établissements avec les nouvelles colonnes
SELECT COUNT(*) as total_establishments_with_pricing
FROM establishments
WHERE ladydrink IS NOT NULL AND barfine IS NOT NULL;