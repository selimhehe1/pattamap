-- Migration: User Favorites System
-- Description: Table pour stocker les employées favorites des utilisateurs

CREATE TABLE IF NOT EXISTS user_favorites (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, employee_id)
);

-- Index pour performance sur les requêtes favorites par user
CREATE INDEX idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX idx_user_favorites_employee_id ON user_favorites(employee_id);
CREATE INDEX idx_user_favorites_created_at ON user_favorites(created_at DESC);

-- Commentaires
COMMENT ON TABLE user_favorites IS 'Table de liaison pour les employées favorites des utilisateurs';
COMMENT ON COLUMN user_favorites.user_id IS 'ID de l''utilisateur';
COMMENT ON COLUMN user_favorites.employee_id IS 'ID de l''employée favorite';
COMMENT ON COLUMN user_favorites.created_at IS 'Date d''ajout aux favoris';