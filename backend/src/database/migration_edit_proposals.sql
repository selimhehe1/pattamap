-- Migration: Système de Propositions d'Édition Collaborative
-- Date: 2025-09-24
-- Description: Table générique pour propositions de modifications par utilisateurs basiques

-- Table principale pour stocker toutes les propositions d'édition
CREATE TABLE IF NOT EXISTS edit_proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('employee', 'establishment')),
  item_id UUID NOT NULL,
  proposed_changes JSONB NOT NULL,     -- Modifications proposées (flexible, tous champs possibles)
  current_values JSONB,                 -- Snapshot des valeurs actuelles au moment de la proposition
  proposed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  moderator_id UUID REFERENCES users(id) ON DELETE SET NULL,
  moderator_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Index pour optimiser les requêtes
CREATE INDEX idx_edit_proposals_status ON edit_proposals (status, item_type);
CREATE INDEX idx_edit_proposals_user ON edit_proposals (proposed_by);
CREATE INDEX idx_edit_proposals_item ON edit_proposals (item_type, item_id);
CREATE INDEX idx_edit_proposals_created ON edit_proposals (created_at DESC);

-- Commentaires pour documentation
COMMENT ON TABLE edit_proposals IS 'Propositions de modifications soumises par les utilisateurs basiques, en attente de validation par modérateur/admin';
COMMENT ON COLUMN edit_proposals.item_type IS 'Type d''élément modifié: employee ou establishment';
COMMENT ON COLUMN edit_proposals.item_id IS 'UUID de l''élément concerné';
COMMENT ON COLUMN edit_proposals.proposed_changes IS 'Modifications proposées au format JSONB (flexible)';
COMMENT ON COLUMN edit_proposals.current_values IS 'Snapshot des valeurs actuelles pour affichage diff';
COMMENT ON COLUMN edit_proposals.status IS 'pending = en attente, approved = validé et appliqué, rejected = refusé';

-- Test de validation
SELECT 'Migration edit_proposals completed successfully' AS status;