-- Migration: Système de Templates de Consommations pour Édition Dynamique des Prix
-- Author: Claude - Version 3.5.0
-- Date: 2025-09-23

-- Table des templates de consommations (bières, cocktails, services)
CREATE TABLE IF NOT EXISTS consumable_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(100) NOT NULL, -- 'Chang', 'Heineken', 'Lady Drink', 'Barfine'
  category VARCHAR(50) NOT NULL CHECK (category IN ('beer', 'shot', 'cocktail', 'spirit', 'wine', 'soft', 'service')),
  icon VARCHAR(10) NOT NULL, -- Emoji pour l'affichage
  default_price INTEGER, -- Prix suggéré en bahts (peut être NULL)
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_consumable_templates_category ON consumable_templates (category);
CREATE INDEX IF NOT EXISTS idx_consumable_templates_status ON consumable_templates (status);

-- Peupler avec les templates de base pour Pattaya
INSERT INTO consumable_templates (name, category, icon, default_price) VALUES
-- Bières populaires à Pattaya
('Chang', 'beer', '🍺', 70),
('Heineken', 'beer', '🍺', 90),
('Tiger', 'beer', '🍺', 80),
('Leo', 'beer', '🍺', 65),
('Singha', 'beer', '🍺', 75),
('Corona', 'beer', '🍺', 120),
('Budweiser', 'beer', '🍺', 100),

-- Services standards
('Lady Drink', 'service', '💃', 130),
('Barfine', 'service', '🎫', 400),
('Room Short Time', 'service', '🏠', 600),
('Room Long Time', 'service', '🏠', 800),

-- Shots populaires
('Tequila Shot', 'shot', '🥃', 100),
('Vodka Shot', 'shot', '🥃', 90),
('Whiskey Shot', 'shot', '🥃', 120),
('Sambuca', 'shot', '🥃', 110),

-- Cocktails standards
('Thai Whiskey Soda', 'cocktail', '🍸', 150),
('Rum & Coke', 'cocktail', '🍸', 180),
('Vodka Tonic', 'cocktail', '🍸', 170),
('Gin & Tonic', 'cocktail', '🍸', 180),
('Whiskey Coke', 'cocktail', '🍸', 200),

-- Spiritueux bouteilles
('Thai Whiskey Bottle', 'spirit', '🍾', 800),
('Vodka Bottle', 'spirit', '🍾', 1200),
('Rum Bottle', 'spirit', '🍾', 1000),

-- Soft drinks
('Coca Cola', 'soft', '🥤', 40),
('Sprite', 'soft', '🥤', 40),
('Orange Juice', 'soft', '🥤', 50),
('Water', 'soft', '🥤', 25);

-- Fonction pour obtenir les templates par catégorie
CREATE OR REPLACE FUNCTION get_consumable_templates_by_category()
RETURNS TABLE (
  category VARCHAR(50),
  templates JSON
)
LANGUAGE SQL
AS $$
  SELECT
    ct.category,
    json_agg(
      json_build_object(
        'id', ct.id,
        'name', ct.name,
        'icon', ct.icon,
        'default_price', ct.default_price
      )
      ORDER BY ct.name
    ) as templates
  FROM consumable_templates ct
  WHERE ct.status = 'active'
  GROUP BY ct.category
  ORDER BY
    CASE ct.category
      WHEN 'beer' THEN 1
      WHEN 'service' THEN 2
      WHEN 'cocktail' THEN 3
      WHEN 'shot' THEN 4
      WHEN 'spirit' THEN 5
      WHEN 'soft' THEN 6
      ELSE 7
    END;
$$;

-- Validation de la migration
SELECT 'Consumable templates migration completed successfully' as status;
SELECT COUNT(*) as total_templates FROM consumable_templates;