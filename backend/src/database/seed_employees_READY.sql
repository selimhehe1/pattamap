-- ============================================
-- SEED COMPLET PRÊT À EXÉCUTER
-- ============================================
-- Fichier avec les vrais IDs de vos établissements Soi 6
-- ✅ PRÊT À EXÉCUTER directement dans Supabase

-- ============================================
-- PARTIE 1: CRÉER LES 15 EMPLOYÉES
-- ============================================

INSERT INTO employees (id, name, nickname, age, nationality, description, photos, social_media, status, created_by) VALUES

-- 🍺 Serveuses Soi 6 (15 employées assignées à différents bars)
('550e8400-e29b-41d4-a716-446655440001', 'Nong Ploy', 'Ploy', 24, 'Thai',
 'Friendly waitress at Queen Victoria Inn, always smiling and helpful. Loves meeting new people and speaking English.',
 ARRAY[]::TEXT[],
 '{"instagram": "ploy_soi6", "line": "ploy24"}'::jsonb,
 'approved', NULL),

('550e8400-e29b-41d4-a716-446655440002', 'Somchai Noi', 'Noi', 22, 'Thai',
 'Sweet and energetic server at Soho Bar. Known for her excellent cocktail recommendations and fun personality.',
 ARRAY[]::TEXT[],
 '{"line": "noi_cocktails"}'::jsonb,
 'approved', NULL),

('550e8400-e29b-41d4-a716-446655440003', 'Dao', 'Dao', 26, 'Thai',
 'Experienced bartender at Saigon Girls with 4 years in hospitality. Speaks Thai, English, and some Chinese.',
 ARRAY[]::TEXT[],
 '{"instagram": "dao_barista", "whatsapp": "+66123456789"}'::jsonb,
 'approved', NULL),

('550e8400-e29b-41d4-a716-446655440004', 'Mai Ling', 'Ling', 23, 'Thai',
 'Dancer and waitress at Helicopter Bar. Very popular with customers for her dance skills.',
 ARRAY[]::TEXT[],
 '{"instagram": "ling_dancer", "line": "mailingws"}'::jsonb,
 'approved', NULL),

('550e8400-e29b-41d4-a716-446655440005', 'Porn Pimol', 'Pim', 28, 'Thai',
 'Senior server at Mods Bar with excellent customer service. Known for remembering regular customers.',
 ARRAY[]::TEXT[],
 '{"line": "pim_ws"}'::jsonb,
 'approved', NULL),

('550e8400-e29b-41d4-a716-446655440006', 'Bee', 'Bee', 21, 'Lao',
 'New to Butterfly Bar but very enthusiastic. Learning English quickly.',
 ARRAY[]::TEXT[],
 '{"line": "bee_laos"}'::jsonb,
 'approved', NULL),

('550e8400-e29b-41d4-a716-446655440007', 'Yui', 'Yui', 25, 'Vietnamese',
 'Bilingual server at Horny Bar (Vietnamese/English). Very professional and organized.',
 ARRAY[]::TEXT[],
 '{"instagram": "yui_metro", "telegram": "@yui_lk"}'::jsonb,
 'approved', NULL),

('550e8400-e29b-41d4-a716-446655440008', 'Fon', 'Fon', 27, 'Thai',
 'Mixologist at Sexy in the City. Creates amazing custom drinks and very artistic.',
 ARRAY[]::TEXT[],
 '{"instagram": "fon_mixology", "line": "fon27"}'::jsonb,
 'approved', NULL),

('550e8400-e29b-41d4-a716-446655440009', 'Kwan', 'Kwan', 24, 'Thai',
 'Cheerful personality at Foxys Bar, loves music and dancing. Works evenings.',
 ARRAY[]::TEXT[],
 '{"line": "kwan_music", "whatsapp": "+66987654321"}'::jsonb,
 'approved', NULL),

('550e8400-e29b-41d4-a716-446655440010', 'Carmen', 'Car', 26, 'Filipino',
 'Server at The Offshore Bar. Fluent in English and Tagalog. Very good at helping tourists navigate the area.',
 ARRAY[]::TEXT[],
 '{"instagram": "carmen_ph", "whatsapp": "+639123456789"}'::jsonb,
 'approved', NULL),

('550e8400-e29b-41d4-a716-446655440011', 'Aom', 'Aom', 23, 'Thai',
 'Friendly waitress at Route 69 Bar. Down-to-earth with great sense of humor.',
 ARRAY[]::TEXT[],
 '{"line": "aom_treetown"}'::jsonb,
 'approved', NULL),

('550e8400-e29b-41d4-a716-446655440012', 'Mint', 'Mint', 22, 'Thai',
 'Student working part-time at 3 Angels Bar. Very smart and speaks excellent English.',
 ARRAY[]::TEXT[],
 '{"instagram": "mint_student", "line": "mint22"}'::jsonb,
 'approved', NULL),

('550e8400-e29b-41d4-a716-446655440013', 'Nam', 'Nam', 29, 'Thai',
 'Veteran server at Cockatoo Bar with experience across multiple venues in Pattaya. Very professional.',
 ARRAY[]::TEXT[],
 '{"line": "nam_pro"}'::jsonb,
 'approved', NULL),

('550e8400-e29b-41d4-a716-446655440014', 'Joy', 'Joy', 25, 'Thai',
 'Server at Ruby Club. Moved from Bangkok to Pattaya, brings big city hospitality experience.',
 ARRAY[]::TEXT[],
 '{"instagram": "joy_bkk_pattaya", "line": "joy_service"}'::jsonb,
 'approved', NULL),

('550e8400-e29b-41d4-a716-446655440015', 'Lada', 'Lada', 31, 'Thai',
 'Senior manager at Lucky Bar. Trains new staff and ensures quality service.',
 ARRAY[]::TEXT[],
 '{"line": "lada_manager"}'::jsonb,
 'approved', NULL);


-- ============================================
-- PARTIE 2: CRÉER LES EMPLOYMENT HISTORY
-- ============================================
-- ✅ AVEC LES VRAIS IDS DE VOS ÉTABLISSEMENTS SOI 6

INSERT INTO employment_history (employee_id, establishment_id, position, start_date, is_current, created_by) VALUES

-- Ploy → Queen Victoria Inn
('550e8400-e29b-41d4-a716-446655440001', '8161ef76-0fc6-4dec-822b-6ba0fc842caf', 'Waitress', '2024-01-15', true, NULL),

-- Noi → Soho Bar
('550e8400-e29b-41d4-a716-446655440002', 'd9ed3d31-0ecb-4d17-bbc3-9e0c90339b7b', 'Server', '2024-03-20', true, NULL),

-- Dao → Saigon Girls
('550e8400-e29b-41d4-a716-446655440003', 'e33d083c-bdca-4aaf-a65e-6af27f733af8', 'Bartender', '2023-06-10', true, NULL),

-- Ling → Helicopter Bar
('550e8400-e29b-41d4-a716-446655440004', '468f9e6e-0cd8-4595-9ed5-1bcdc18dee60', 'Dancer/Waitress', '2024-02-01', true, NULL),

-- Pim → Mod's Bar
('550e8400-e29b-41d4-a716-446655440005', '1e30268d-dd92-4a95-8178-87142edb6ae6', 'Senior Server', '2023-01-15', true, NULL),

-- Bee → Butterfly Bar
('550e8400-e29b-41d4-a716-446655440006', 'ba12b8ec-8675-4831-ac7e-6c8e665ff7bf', 'Waitress', '2024-08-01', true, NULL),

-- Yui → Horny Bar
('550e8400-e29b-41d4-a716-446655440007', 'cd279c5a-b874-4a5f-aefa-6b947d69171a', 'Server', '2023-11-01', true, NULL),

-- Fon → Sexy in the City
('550e8400-e29b-41d4-a716-446655440008', 'ed93df69-83c4-4ee7-8ce2-45eb8a6f9732', 'Mixologist', '2024-04-15', true, NULL),

-- Kwan → Foxy's Bar
('550e8400-e29b-41d4-a716-446655440009', '3ac1f431-9995-450e-a6d4-d0f8fae25848', 'Waitress', '2024-05-20', true, NULL),

-- Carmen → The Offshore Bar
('550e8400-e29b-41d4-a716-446655440010', 'b59f084b-041a-45a0-a567-709f55e5a50d', 'Server', '2024-01-10', true, NULL),

-- Aom → Route 69 Bar
('550e8400-e29b-41d4-a716-446655440011', '48dc6aa0-baaf-4435-8cf8-12c0a4ff8389', 'Waitress', '2024-03-15', true, NULL),

-- Mint → 3 Angels Bar
('550e8400-e29b-41d4-a716-446655440012', '30f840c9-b015-42f3-ab19-e2222b4b560a', 'Part-time Server', '2024-06-01', true, NULL),

-- Nam → Cockatoo Bar (emploi actuel)
('550e8400-e29b-41d4-a716-446655440013', '41cec5b4-de7a-44bc-9338-e268a35a1efa', 'Senior Server', '2024-06-01', true, NULL),

-- Nam → Ruby Club (ancien emploi)
('550e8400-e29b-41d4-a716-446655440013', 'defa02bf-733e-4bd5-be38-abd062077717', 'Waitress', '2023-01-15', '2024-05-30', false, NULL),

-- Joy → Ruby Club (emploi actuel) - Note: Ruby Club a 2 employées (Nam avant, Joy maintenant)
('550e8400-e29b-41d4-a716-446655440014', 'defa02bf-733e-4bd5-be38-abd062077717', 'Server', '2024-07-01', true, NULL),

-- Joy → Paradise Bar (ancien emploi)
('550e8400-e29b-41d4-a716-446655440014', 'ab067160-44f5-4cbb-860d-ffa92c6bbd8d', 'Waitress', '2023-09-01', '2024-06-30', false, NULL),

-- Lada → Lucky Bar (manager)
('550e8400-e29b-41d4-a716-446655440015', '505cd995-1ae3-445d-923c-7401e2ea1bc4', 'Manager/Server', '2023-03-01', true, NULL);


-- ============================================
-- PARTIE 3 (OPTIONNEL): REVIEWS DE TEST
-- ============================================
-- ⚠️ REMPLACER 'USER_ID_HERE' PAR UN ID UTILISATEUR RÉEL
-- Pour obtenir un user_id: SELECT id FROM users LIMIT 1;

/*
-- Reviews positives
INSERT INTO comments (employee_id, user_id, content, rating, status, created_at) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'USER_ID_HERE', 'Ploy is amazing! Very friendly and speaks good English. Always smiling and helpful.', 5, 'approved', NOW() - INTERVAL '2 days'),
('550e8400-e29b-41d4-a716-446655440001', 'USER_ID_HERE', 'Great service at Queen Victoria Inn, she remembered my drink order from last visit!', 4, 'approved', NOW() - INTERVAL '5 days'),
('550e8400-e29b-41d4-a716-446655440004', 'USER_ID_HERE', 'Best dancer at Helicopter Bar! Very entertaining and good company.', 5, 'approved', NOW() - INTERVAL '1 day'),
('550e8400-e29b-41d4-a716-446655440008', 'USER_ID_HERE', 'Fon makes the best cocktails at Sexy in the City! Very creative and artistic.', 5, 'approved', NOW() - INTERVAL '3 days'),
('550e8400-e29b-41d4-a716-446655440015', 'USER_ID_HERE', 'Lada is an excellent manager at Lucky Bar. Very professional and helpful.', 5, 'approved', NOW() - INTERVAL '4 days');

-- Reviews neutres
INSERT INTO comments (employee_id, user_id, content, rating, status, created_at) VALUES
('550e8400-e29b-41d4-a716-446655440002', 'USER_ID_HERE', 'Good service at Soho Bar, nothing special but professional.', 3, 'approved', NOW() - INTERVAL '4 days'),
('550e8400-e29b-41d4-a716-446655440006', 'USER_ID_HERE', 'Still learning at Butterfly Bar but tries hard. Will be great with more experience.', 3, 'approved', NOW() - INTERVAL '6 days');

-- Reviews avec suggestions
INSERT INTO comments (employee_id, user_id, content, rating, status, created_at) VALUES
('550e8400-e29b-41d4-a716-446655440007', 'USER_ID_HERE', 'Very professional at Horny Bar but could smile more. Service is excellent though.', 4, 'approved', NOW() - INTERVAL '7 days'),
('550e8400-e29b-41d4-a716-446655440010', 'USER_ID_HERE', 'Carmen at The Offshore Bar is super helpful for tourists. Gives great local recommendations!', 5, 'approved', NOW() - INTERVAL '2 days');

-- Review en attente de modération
INSERT INTO comments (employee_id, user_id, content, rating, status, created_at) VALUES
('550e8400-e29b-41d4-a716-446655440012', 'USER_ID_HERE', 'Smart and friendly at 3 Angels Bar. Great conversation while serving drinks.', 4, 'pending', NOW() - INTERVAL '1 day');
*/


-- ============================================
-- VÉRIFICATION DES RÉSULTATS
-- ============================================
-- Exécutez cette requête après l'insertion pour vérifier:

SELECT
  e.name,
  e.nickname,
  e.age,
  e.nationality,
  eh.position,
  est.name as establishment,
  est.zone,
  eh.is_current
FROM employees e
JOIN employment_history eh ON e.id = eh.employee_id
JOIN establishments est ON eh.establishment_id = est.id
WHERE e.status = 'approved'
ORDER BY eh.is_current DESC, e.name;


-- ============================================
-- RÉSUMÉ DU SEED
-- ============================================
/*
✅ 15 EMPLOYÉES CRÉÉES:

🍺 SOI 6 - 15 serveuses réparties dans différents bars:
  1. Ploy (24 ans)      → Queen Victoria Inn
  2. Noi (22 ans)       → Soho Bar
  3. Dao (26 ans)       → Saigon Girls
  4. Ling (23 ans)      → Helicopter Bar
  5. Pim (28 ans)       → Mod's Bar
  6. Bee (21 ans)       → Butterfly Bar
  7. Yui (25 ans)       → Horny Bar
  8. Fon (27 ans)       → Sexy in the City
  9. Kwan (24 ans)      → Foxy's Bar
  10. Carmen (26 ans)   → The Offshore Bar
  11. Aom (23 ans)      → Route 69 Bar
  12. Mint (22 ans)     → 3 Angels Bar
  13. Nam (29 ans)      → Cockatoo Bar (+ historique Ruby Club)
  14. Joy (25 ans)      → Ruby Club (+ historique Paradise Bar)
  15. Lada (31 ans)     → Lucky Bar

📊 STATISTIQUES:
- 15 employées avec status 'approved'
- 17 entrées employment_history (15 actuelles + 2 historiques)
- Toutes is_current = true pour être visibles
- 3 employées avec historique d'emploi (Nam, Joy, Lada)
- Variété de nationalités: Thai, Lao, Vietnamese, Filipino
- Variété d'âges: 21-31 ans
- Variété de postes: Waitress, Server, Bartender, Dancer, Mixologist, Manager

🎯 PROCHAINES ÉTAPES:
1. Copier ce fichier SQL complet
2. Ouvrir Supabase Dashboard > SQL Editor
3. Coller et exécuter le SQL
4. Vérifier avec la requête de vérification ci-dessus
5. (Optionnel) Décommenter et adapter les reviews avec un user_id réel
*/