-- Seed file: Test Employees (Serveuses) pour tester le système de reviews
-- Ce fichier crée des employées de test travaillant dans différents établissements

-- ============================================
-- EMPLOYÉES DE TEST
-- ============================================

-- Note: Remplacer 'admin-user-id-here' par l'ID d'un utilisateur admin existant
-- Note: Remplacer les establishment IDs par des IDs réels de votre base de données

INSERT INTO employees (id, name, nickname, age, nationality, description, photos, social_media, status, created_by) VALUES

-- Serveuses Soi 6
('550e8400-e29b-41d4-a716-446655440001', 'Nong Ploy', 'Ploy', 24, 'Thai', 'Friendly waitress at Soi 6, always smiling and helpful. Loves meeting new people and speaking English.', ARRAY[]::TEXT[], '{"instagram": "ploy_soi6", "line": "ploy24"}', 'approved', NULL),

('550e8400-e29b-41d4-a716-446655440002', 'Somchai Noi', 'Noi', 22, 'Thai', 'Sweet and energetic server. Known for her excellent cocktail recommendations and fun personality.', ARRAY[]::TEXT[], '{"line": "noi_cocktails"}', 'approved', NULL),

('550e8400-e29b-41d4-a716-446655440003', 'Dao', 'Dao', 26, 'Thai', 'Experienced bartender with 4 years in hospitality. Speaks Thai, English, and some Chinese.', ARRAY[]::TEXT[], '{"instagram": "dao_barista", "whatsapp": "+66123456789"}', 'approved', NULL),

-- Serveuses Walking Street
('550e8400-e29b-41d4-a716-446655440004', 'Mai Ling', 'Ling', 23, 'Thai', 'Dancer and waitress at Walking Street. Very popular with customers for her dance skills.', ARRAY[]::TEXT[], '{"instagram": "ling_dancer", "line": "mailingws"}', 'approved', NULL),

('550e8400-e29b-41d4-a716-446655440005', 'Porn Pimol', 'Pim', 28, 'Thai', 'Senior server with excellent customer service. Known for remembering regular customers.', ARRAY[]::TEXT[], '{"line": "pim_ws"}', 'approved', NULL),

('550e8400-e29b-41d4-a716-446655440006', 'Bee', 'Bee', 21, 'Lao', 'New to Walking Street but very enthusiastic. Learning English quickly.', ARRAY[]::TEXT[], '{"line": "bee_laos"}', 'approved', NULL),

-- Serveuses LK Metro
('550e8400-e29b-41d4-a716-446655440007', 'Yui', 'Yui', 25, 'Vietnamese', 'Bilingual server (Vietnamese/English). Very professional and organized.', ARRAY[]::TEXT[], '{"instagram": "yui_metro", "telegram": "@yui_lk"}', 'approved', NULL),

('550e8400-e29b-41d4-a716-446655440008', 'Fon', 'Fon', 27, 'Thai', 'Mixologist and server. Creates amazing custom drinks and very artistic.', ARRAY[]::TEXT[], '{"instagram": "fon_mixology", "line": "fon27"}', 'approved', NULL),

('550e8400-e29b-41d4-a716-446655440009', 'Kwan', 'Kwan', 24, 'Thai', 'Cheerful personality, loves music and dancing. Works evenings at LK Metro.', ARRAY[]::TEXT[], '{"line": "kwan_music", "whatsapp": "+66987654321"}', 'approved', NULL),

-- Serveuses Treetown
('550e8400-e29b-41d4-a716-446655440010', 'Carmen', 'Car', 26, 'Filipino', 'Fluent in English and Tagalog. Very good at helping tourists navigate the area.', ARRAY[]::TEXT[], '{"instagram": "carmen_ph", "whatsapp": "+639123456789"}', 'approved', NULL),

('550e8400-e29b-41d4-a716-446655440011', 'Aom', 'Aom', 23, 'Thai', 'Friendly and down-to-earth. Great sense of humor and loves chatting with customers.', ARRAY[]::TEXT[], '{"line": "aom_treetown"}', 'approved', NULL),

('550e8400-e29b-41d4-a716-446655440012', 'Mint', 'Mint', 22, 'Thai', 'Student working part-time. Very smart and speaks excellent English.', ARRAY[]::TEXT[], '{"instagram": "mint_student", "line": "mint22"}', 'approved', NULL),

-- Employées avec expérience multiple établissements
('550e8400-e29b-41d4-a716-446655440013', 'Nam', 'Nam', 29, 'Thai', 'Veteran server with experience across multiple venues in Pattaya. Very professional.', ARRAY[]::TEXT[], '{"line": "nam_pro"}', 'approved', NULL),

('550e8400-e29b-41d4-a716-446655440014', 'Joy', 'Joy', 25, 'Thai', 'Moved from Bangkok to Pattaya. Brings big city hospitality experience.', ARRAY[]::TEXT[], '{"instagram": "joy_bkk_pattaya", "line": "joy_service"}', 'approved', NULL),

('550e8400-e29b-41d4-a716-446655440015', 'Lada', 'Lada', 31, 'Thai', 'Senior manager and occasional server. Trains new staff and ensures quality service.', ARRAY[]::TEXT[], '{"line": "lada_manager"}', 'approved', NULL);


-- ============================================
-- EMPLOYMENT HISTORY
-- ============================================

-- Note: Remplacer les establishment_id par des IDs réels de votre base de données
-- Format: Vous devez d'abord obtenir les IDs des établissements depuis la table establishments

-- Exemple de structure (À ADAPTER avec vos IDs réels):
/*
INSERT INTO employment_history (employee_id, establishment_id, position, start_date, is_current, created_by) VALUES

-- Employées actuellement à Soi 6
('550e8400-e29b-41d4-a716-446655440001', 'establishment-id-soi6-1', 'Waitress', '2024-01-15', true, NULL),
('550e8400-e29b-41d4-a716-446655440002', 'establishment-id-soi6-2', 'Server', '2024-03-20', true, NULL),
('550e8400-e29b-41d4-a716-446655440003', 'establishment-id-soi6-3', 'Bartender', '2023-06-10', true, NULL),

-- Employées actuellement à Walking Street
('550e8400-e29b-41d4-a716-446655440004', 'establishment-id-ws-1', 'Dancer/Waitress', '2024-02-01', true, NULL),
('550e8400-e29b-41d4-a716-446655440005', 'establishment-id-ws-2', 'Senior Server', '2023-01-15', true, NULL),
('550e8400-e29b-41d4-a716-446655440006', 'establishment-id-ws-3', 'Waitress', '2024-08-01', true, NULL),

-- Employées actuellement à LK Metro
('550e8400-e29b-41d4-a716-446655440007', 'establishment-id-lk-1', 'Server', '2023-11-01', true, NULL),
('550e8400-e29b-41d4-a716-446655440008', 'establishment-id-lk-2', 'Mixologist', '2024-04-15', true, NULL),
('550e8400-e29b-41d4-a716-446655440009', 'establishment-id-lk-3', 'Waitress', '2024-05-20', true, NULL),

-- Employées actuellement à Treetown
('550e8400-e29b-41d4-a716-446655440010', 'establishment-id-tt-1', 'Server', '2024-01-10', true, NULL),
('550e8400-e29b-41d4-a716-446655440011', 'establishment-id-tt-2', 'Waitress', '2024-03-15', true, NULL),
('550e8400-e29b-41d4-a716-446655440012', 'establishment-id-tt-3', 'Part-time Server', '2024-06-01', true, NULL),

-- Employées avec historique multiple (emploi actuel + anciens)
('550e8400-e29b-41d4-a716-446655440013', 'establishment-id-soi6-1', 'Senior Server', '2024-06-01', true, NULL),
('550e8400-e29b-41d4-a716-446655440013', 'establishment-id-ws-1', 'Waitress', '2023-01-15', '2024-05-30', false, NULL),

('550e8400-e29b-41d4-a716-446655440014', 'establishment-id-lk-1', 'Server', '2024-07-01', true, NULL),
('550e8400-e29b-41d4-a716-446655440014', 'establishment-id-soi6-2', 'Waitress', '2023-09-01', '2024-06-30', false, NULL),

('550e8400-e29b-41d4-a716-446655440015', 'establishment-id-ws-2', 'Manager/Server', '2023-03-01', true, NULL);
*/


-- ============================================
-- REVIEWS DE TEST (Optionnel)
-- ============================================

-- Note: Remplacer 'user-id-here' par l'ID d'un utilisateur existant
-- Créer des reviews de test pour les employées

/*
INSERT INTO comments (employee_id, user_id, content, rating, status) VALUES

-- Reviews positives
('550e8400-e29b-41d4-a716-446655440001', 'user-id-here', 'Ploy is amazing! Very friendly and speaks good English. Always smiling and helpful.', 5, 'approved'),
('550e8400-e29b-41d4-a716-446655440001', 'user-id-here', 'Great service, she remembered my drink order from last visit!', 4, 'approved'),

('550e8400-e29b-41d4-a716-446655440004', 'user-id-here', 'Best dancer at Walking Street! Very entertaining and good company.', 5, 'approved'),

('550e8400-e29b-41d4-a716-446655440008', 'user-id-here', 'Fon makes the best cocktails! Very creative and artistic.', 5, 'approved'),

-- Reviews neutres
('550e8400-e29b-41d4-a716-446655440002', 'user-id-here', 'Good service, nothing special but professional.', 3, 'approved'),

('550e8400-e29b-41d4-a716-446655440006', 'user-id-here', 'Still learning but tries hard. Will be great with more experience.', 3, 'approved'),

-- Reviews avec suggestions
('550e8400-e29b-41d4-a716-446655440007', 'user-id-here', 'Very professional but could smile more. Service is excellent though.', 4, 'approved'),

('550e8400-e29b-41d4-a716-446655440010', 'user-id-here', 'Carmen is super helpful for tourists. Gives great local recommendations!', 5, 'approved'),

-- Review en attente de modération
('550e8400-e29b-41d4-a716-446655440012', 'user-id-here', 'Smart and friendly. Great conversation while serving drinks.', 4, 'pending');
*/


-- ============================================
-- INSTRUCTIONS D'UTILISATION
-- ============================================

/*
COMMENT UTILISER CE FICHIER:

1. OBTENIR LES IDS DES ÉTABLISSEMENTS:
   SELECT id, name, zone FROM establishments WHERE status = 'approved';

2. REMPLACER LES PLACEHOLDERS:
   - Remplacer 'establishment-id-soi6-1', 'establishment-id-ws-1', etc. par les vrais IDs
   - Remplacer 'user-id-here' par un ID utilisateur réel
   - Remplacer 'admin-user-id-here' par un ID admin si besoin

3. DÉCOMMENTER LES SECTIONS:
   - Décommenter les INSERT INTO employment_history
   - Décommenter les INSERT INTO comments (optionnel)

4. EXÉCUTER LE FICHIER:
   - Via Supabase Dashboard > SQL Editor
   - Ou via psql/pg client

5. VÉRIFIER:
   SELECT e.name, e.nickname, eh.position, est.name as establishment
   FROM employees e
   JOIN employment_history eh ON e.id = eh.employee_id
   JOIN establishments est ON eh.establishment_id = est.id
   WHERE e.status = 'approved';
*/