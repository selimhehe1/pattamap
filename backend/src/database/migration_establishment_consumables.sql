-- Migration: Créer la table establishment_consumables
-- Date: 2025-09-23
-- Description: Table de liaison pour les consommations des établissements

-- Créer la table de liaison establishment_consumables
CREATE TABLE IF NOT EXISTS establishment_consumables (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  establishment_id UUID REFERENCES establishments(id) ON DELETE CASCADE,
  consumable_id INTEGER REFERENCES consumable_templates(id) ON DELETE CASCADE,
  price VARCHAR(10) NOT NULL, -- Prix personnalisé pour cet établissement
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Contrainte unique: un établissement ne peut avoir qu'un seul prix par consommable
  UNIQUE(establishment_id, consumable_id)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_establishment_consumables_establishment
ON establishment_consumables(establishment_id);

CREATE INDEX IF NOT EXISTS idx_establishment_consumables_consumable
ON establishment_consumables(consumable_id);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_establishment_consumables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_establishment_consumables_updated_at
BEFORE UPDATE ON establishment_consumables
FOR EACH ROW
EXECUTE FUNCTION update_establishment_consumables_updated_at();

-- Commentaires
COMMENT ON TABLE establishment_consumables IS 'Liaison entre établissements et consommables avec prix personnalisés';
COMMENT ON COLUMN establishment_consumables.price IS 'Prix en bahts pour ce consommable dans cet établissement';

-- Validation
SELECT 'Migration establishment_consumables completed successfully' as status;