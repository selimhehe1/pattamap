-- ============================================
-- SEED COMPLET: Employées + Employment History
-- ============================================
-- Ce fichier crée 15 serveuses de test AVEC leurs affectations aux établissements
-- IMPORTANT: Remplacer les IDs d'établissements par vos IDs réels avant exécution

-- ============================================
-- ÉTAPE 1: RÉCUPÉRER VOS IDS D'ÉTABLISSEMENTS
-- ============================================
-- Exécutez d'abord cette requête pour obtenir vos IDs d'établissements:
/*
SELECT id, name, zone, category_id
FROM establishments
WHERE status = 'approved'
ORDER BY zone, name;
*/
-- Copiez les IDs et remplacez les placeholders ci-dessous

-- ============================================
-- ÉTAPE 2: CRÉER LES EMPLOYÉES
-- ============================================

INSERT INTO employees (id, name, nickname, age, nationality, description, photos, social_media, status, created_by) VALUES

-- 🍺 Serveuses Soi 6 (3 employées)
('550e8400-e29b-41d4-a716-446655440001', 'Nong Ploy', 'Ploy', 24, 'Thai',
 'Friendly waitress at Soi 6, always smiling and helpful. Loves meeting new people and speaking English.',
 ARRAY[]::TEXT[],
 '{"instagram": "ploy_soi6", "line": "ploy24"}'::jsonb,
 'approved', NULL),

('550e8400-e29b-41d4-a716-446655440002', 'Somchai Noi', 'Noi', 22, 'Thai',
 'Sweet and energetic server. Known for her excellent cocktail recommendations and fun personality.',
 ARRAY[]::TEXT[],
 '{"line": "noi_cocktails"}'::jsonb,
 'approved', NULL),

('550e8400-e29b-41d4-a716-446655440003', 'Dao', 'Dao', 26, 'Thai',
 'Experienced bartender with 4 years in hospitality. Speaks Thai, English, and some Chinese.',
 ARRAY[]::TEXT[],
 '{"instagram": "dao_barista", "whatsapp": "+66123456789"}'::jsonb,
 'approved', NULL),

-- 🔴 Serveuses Walking Street (3 employées)
('550e8400-e29b-41d4-a716-446655440004', 'Mai Ling', 'Ling', 23, 'Thai',
 'Dancer and waitress at Walking Street. Very popular with customers for her dance skills.',
 ARRAY[]::TEXT[],
 '{"instagram": "ling_dancer", "line": "mailingws"}'::jsonb,
 'approved', NULL),

('550e8400-e29b-41d4-a716-446655440005', 'Porn Pimol', 'Pim', 28, 'Thai',
 'Senior server with excellent customer service. Known for remembering regular customers.',
 ARRAY[]::TEXT[],
 '{"line": "pim_ws"}'::jsonb,
 'approved', NULL),

('550e8400-e29b-41d4-a716-446655440006', 'Bee', 'Bee', 21, 'Lao',
 'New to Walking Street but very enthusiastic. Learning English quickly.',
 ARRAY[]::TEXT[],
 '{"line": "bee_laos"}'::jsonb,
 'approved', NULL),

-- 🏙️ Serveuses LK Metro (3 employées)
('550e8400-e29b-41d4-a716-446655440007', 'Yui', 'Yui', 25, 'Vietnamese',
 'Bilingual server (Vietnamese/English). Very professional and organized.',
 ARRAY[]::TEXT[],
 '{"instagram": "yui_metro", "telegram": "@yui_lk"}'::jsonb,
 'approved', NULL),

('550e8400-e29b-41d4-a716-446655440008', 'Fon', 'Fon', 27, 'Thai',
 'Mixologist and server. Creates amazing custom drinks and very artistic.',
 ARRAY[]::TEXT[],
 '{"instagram": "fon_mixology", "line": "fon27"}'::jsonb,
 'approved', NULL),

('550e8400-e29b-41d4-a716-446655440009', 'Kwan', 'Kwan', 24, 'Thai',
 'Cheerful personality, loves music and dancing. Works evenings at LK Metro.',
 ARRAY[]::TEXT[],
 '{"line": "kwan_music", "whatsapp": "+66987654321"}'::jsonb,
 'approved', NULL),

-- 🌳 Serveuses Treetown (3 employées)
('550e8400-e29b-41d4-a716-446655440010', 'Carmen', 'Car', 26, 'Filipino',
 'Fluent in English and Tagalog. Very good at helping tourists navigate the area.',
 ARRAY[]::TEXT[],
 '{"instagram": "carmen_ph", "whatsapp": "+639123456789"}'::jsonb,
 'approved', NULL),

('550e8400-e29b-41d4-a716-446655440011', 'Aom', 'Aom', 23, 'Thai',
 'Friendly and down-to-earth. Great sense of humor and loves chatting with customers.',
 ARRAY[]::TEXT[],
 '{"line": "aom_treetown"}'::jsonb,
 'approved', NULL),

('550e8400-e29b-41d4-a716-446655440012', 'Mint', 'Mint', 22, 'Thai',
 'Student working part-time. Very smart and speaks excellent English.',
 ARRAY[]::TEXT[],
 '{"instagram": "mint_student", "line": "mint22"}'::jsonb,
 'approved', NULL),

-- 🔄 Employées avec expérience multiple (3 employées)
('550e8400-e29b-41d4-a716-446655440013', 'Nam', 'Nam', 29, 'Thai',
 'Veteran server with experience across multiple venues in Pattaya. Very professional.',
 ARRAY[]::TEXT[],
 '{"line": "nam_pro"}'::jsonb,
 'approved', NULL),

('550e8400-e29b-41d4-a716-446655440014', 'Joy', 'Joy', 25, 'Thai',
 'Moved from Bangkok to Pattaya. Brings big city hospitality experience.',
 ARRAY[]::TEXT[],
 '{"instagram": "joy_bkk_pattaya", "line": "joy_service"}'::jsonb,
 'approved', NULL),

('550e8400-e29b-41d4-a716-446655440015', 'Lada', 'Lada', 31, 'Thai',
 'Senior manager and occasional server. Trains new staff and ensures quality service.',
 ARRAY[]::TEXT[],
 '{"line": "lada_manager"}'::jsonb,
 'approved', NULL);


-- ============================================
-- ÉTAPE 3: CRÉER LES EMPLOYMENT HISTORY
-- ============================================
-- ⚠️ REMPLACER LES PLACEHOLDERS CI-DESSOUS PAR VOS VRAIS IDS ⚠️

-- TEMPLATE À ADAPTER:
-- Remplacer 'ESTABLISHMENT_ID_HERE' par l'ID réel de votre établissement

-- Exemple de structure pour Soi 6:
INSERT INTO employment_history (employee_id, establishment_id, position, start_date, is_current, created_by) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'ESTABLISHMENT_ID_SOI6_1', 'Waitress', '2024-01-15', true, NULL),
('550e8400-e29b-41d4-a716-446655440002', 'ESTABLISHMENT_ID_SOI6_2', 'Server', '2024-03-20', true, NULL),
('550e8400-e29b-41d4-a716-446655440003', 'ESTABLISHMENT_ID_SOI6_3', 'Bartender', '2023-06-10', true, NULL);

-- Exemple de structure pour Walking Street:
INSERT INTO employment_history (employee_id, establishment_id, position, start_date, is_current, created_by) VALUES
('550e8400-e29b-41d4-a716-446655440004', 'ESTABLISHMENT_ID_WALKINGSTREET_1', 'Dancer/Waitress', '2024-02-01', true, NULL),
('550e8400-e29b-41d4-a716-446655440005', 'ESTABLISHMENT_ID_WALKINGSTREET_2', 'Senior Server', '2023-01-15', true, NULL),
('550e8400-e29b-41d4-a716-446655440006', 'ESTABLISHMENT_ID_WALKINGSTREET_3', 'Waitress', '2024-08-01', true, NULL);

-- Exemple de structure pour LK Metro:
INSERT INTO employment_history (employee_id, establishment_id, position, start_date, is_current, created_by) VALUES
('550e8400-e29b-41d4-a716-446655440007', 'ESTABLISHMENT_ID_LKMETRO_1', 'Server', '2023-11-01', true, NULL),
('550e8400-e29b-41d4-a716-446655440008', 'ESTABLISHMENT_ID_LKMETRO_2', 'Mixologist', '2024-04-15', true, NULL),
('550e8400-e29b-41d4-a716-446655440009', 'ESTABLISHMENT_ID_LKMETRO_3', 'Waitress', '2024-05-20', true, NULL);

-- Exemple de structure pour Treetown:
INSERT INTO employment_history (employee_id, establishment_id, position, start_date, is_current, created_by) VALUES
('550e8400-e29b-41d4-a716-446655440010', 'ESTABLISHMENT_ID_TREETOWN_1', 'Server', '2024-01-10', true, NULL),
('550e8400-e29b-41d4-a716-446655440011', 'ESTABLISHMENT_ID_TREETOWN_2', 'Waitress', '2024-03-15', true, NULL),
('550e8400-e29b-41d4-a716-446655440012', 'ESTABLISHMENT_ID_TREETOWN_3', 'Part-time Server', '2024-06-01', true, NULL);

-- Employées avec historique (emploi actuel + ancien emploi):
INSERT INTO employment_history (employee_id, establishment_id, position, start_date, end_date, is_current, created_by) VALUES
-- Nam: travaille actuellement à Soi 6, a travaillé à Walking Street avant
('550e8400-e29b-41d4-a716-446655440013', 'ESTABLISHMENT_ID_SOI6_1', 'Senior Server', '2024-06-01', NULL, true, NULL),
('550e8400-e29b-41d4-a716-446655440013', 'ESTABLISHMENT_ID_WALKINGSTREET_1', 'Waitress', '2023-01-15', '2024-05-30', false, NULL);

-- Joy: travaille actuellement à LK Metro, a travaillé à Soi 6 avant
INSERT INTO employment_history (employee_id, establishment_id, position, start_date, end_date, is_current, created_by) VALUES
('550e8400-e29b-41d4-a716-446655440014', 'ESTABLISHMENT_ID_LKMETRO_1', 'Server', '2024-07-01', NULL, true, NULL),
('550e8400-e29b-41d4-a716-446655440014', 'ESTABLISHMENT_ID_SOI6_2', 'Waitress', '2023-09-01', '2024-06-30', false, NULL);

-- Lada: travaille actuellement à Walking Street comme manager
INSERT INTO employment_history (employee_id, establishment_id, position, start_date, is_current, created_by) VALUES
('550e8400-e29b-41d4-a716-446655440015', 'ESTABLISHMENT_ID_WALKINGSTREET_2', 'Manager/Server', '2023-03-01', true, NULL);


-- ============================================
-- ÉTAPE 4 (OPTIONNEL): CRÉER DES REVIEWS DE TEST
-- ============================================
-- Remplacer 'USER_ID_HERE' par l'ID d'un utilisateur existant

-- Reviews positives:
INSERT INTO comments (employee_id, user_id, content, rating, status, created_at) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'USER_ID_HERE', 'Ploy is amazing! Very friendly and speaks good English. Always smiling and helpful.', 5, 'approved', NOW() - INTERVAL '2 days'),
('550e8400-e29b-41d4-a716-446655440001', 'USER_ID_HERE', 'Great service, she remembered my drink order from last visit!', 4, 'approved', NOW() - INTERVAL '5 days'),
('550e8400-e29b-41d4-a716-446655440004', 'USER_ID_HERE', 'Best dancer at Walking Street! Very entertaining and good company.', 5, 'approved', NOW() - INTERVAL '1 day'),
('550e8400-e29b-41d4-a716-446655440008', 'USER_ID_HERE', 'Fon makes the best cocktails! Very creative and artistic.', 5, 'approved', NOW() - INTERVAL '3 days');

-- Reviews neutres:
INSERT INTO comments (employee_id, user_id, content, rating, status, created_at) VALUES
('550e8400-e29b-41d4-a716-446655440002', 'USER_ID_HERE', 'Good service, nothing special but professional.', 3, 'approved', NOW() - INTERVAL '4 days'),
('550e8400-e29b-41d4-a716-446655440006', 'USER_ID_HERE', 'Still learning but tries hard. Will be great with more experience.', 3, 'approved', NOW() - INTERVAL '6 days');

-- Reviews avec suggestions:
INSERT INTO comments (employee_id, user_id, content, rating, status, created_at) VALUES
('550e8400-e29b-41d4-a716-446655440007', 'USER_ID_HERE', 'Very professional but could smile more. Service is excellent though.', 4, 'approved', NOW() - INTERVAL '7 days'),
('550e8400-e29b-41d4-a716-446655440010', 'USER_ID_HERE', 'Carmen is super helpful for tourists. Gives great local recommendations!', 5, 'approved', NOW() - INTERVAL '2 days');

-- Review en attente de modération:
INSERT INTO comments (employee_id, user_id, content, rating, status, created_at) VALUES
('550e8400-e29b-41d4-a716-446655440012', 'USER_ID_HERE', 'Smart and friendly. Great conversation while serving drinks.', 4, 'pending', NOW() - INTERVAL '1 day');


-- ============================================
-- ÉTAPE 5: VÉRIFICATION
-- ============================================
-- Après exécution, vérifiez avec cette requête:
/*
SELECT
  e.name,
  e.nickname,
  eh.position,
  est.name as establishment,
  est.zone,
  e.status
FROM employees e
JOIN employment_history eh ON e.id = eh.employee_id
JOIN establishments est ON eh.establishment_id = est.id
WHERE eh.is_current = true
ORDER BY est.zone, e.name;
*/

-- ============================================
-- INSTRUCTIONS D'UTILISATION
-- ============================================
/*
📋 COMMENT UTILISER CE FICHIER:

1️⃣ RÉCUPÉRER LES IDS D'ÉTABLISSEMENTS:
   - Exécutez: SELECT id, name, zone FROM establishments WHERE status = 'approved';
   - Notez les IDs des établissements par zone

2️⃣ REMPLACER LES PLACEHOLDERS:
   - ESTABLISHMENT_ID_SOI6_1 → ID réel d'un bar à Soi 6
   - ESTABLISHMENT_ID_WALKINGSTREET_1 → ID réel d'un bar à Walking Street
   - ESTABLISHMENT_ID_LKMETRO_1 → ID réel d'un bar à LK Metro
   - ESTABLISHMENT_ID_TREETOWN_1 → ID réel d'un bar à Treetown
   - USER_ID_HERE → ID d'un utilisateur pour les reviews (optionnel)

3️⃣ EXÉCUTER LE SQL:
   - Via Supabase Dashboard > SQL Editor
   - Coller le fichier modifié
   - Cliquer sur "Run"

4️⃣ VÉRIFIER:
   - Les 15 employées doivent apparaître avec is_current = true
   - Elles doivent être visibles dans l'interface frontend
   - Les reviews (si créées) doivent s'afficher sur les profils

⚠️ IMPORTANT:
- Ne PAS oublier de remplacer les placeholders avant exécution
- Assurez-vous d'avoir au moins 3-4 établissements par zone
- Les employées 13, 14, 15 ont des historiques (ancien + actuel emploi)

✅ RÉSULTAT ATTENDU:
- 15 serveuses visibles immédiatement
- Réparties dans les 4 zones (Soi 6, Walking Street, LK Metro, Treetown)
- Avec reviews de test (si USER_ID configuré)
*/