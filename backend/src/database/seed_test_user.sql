-- Créer un utilisateur de test pour les reviews
-- Mot de passe: "test123" (hashé avec bcrypt)

INSERT INTO users (id, pseudonym, email, password, role, is_active, created_at, updated_at) VALUES
(
  '11111111-1111-1111-1111-111111111111',
  'TestUser',
  'test@example.com',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIxKzQri7u', -- "test123"
  'user',
  true,
  NOW(),
  NOW()
);

-- Vérification
SELECT id, pseudonym, email, role FROM users WHERE email = 'test@example.com';