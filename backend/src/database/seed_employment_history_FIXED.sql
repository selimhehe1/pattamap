-- ============================================
-- EMPLOYMENT HISTORY - VERSION CORRIGÉE
-- ============================================
-- Exécuter ce fichier dans Supabase SQL Editor

-- PARTIE 1: Emplois actuels (is_current = true, sans end_date)
INSERT INTO employment_history (employee_id, establishment_id, position, start_date, is_current, created_by) VALUES
('550e8400-e29b-41d4-a716-446655440001', '8161ef76-0fc6-4dec-822b-6ba0fc842caf', 'Waitress', '2024-01-15', true, NULL),
('550e8400-e29b-41d4-a716-446655440002', 'd9ed3d31-0ecb-4d17-bbc3-9e0c90339b7b', 'Server', '2024-03-20', true, NULL),
('550e8400-e29b-41d4-a716-446655440003', 'e33d083c-bdca-4aaf-a65e-6af27f733af8', 'Bartender', '2023-06-10', true, NULL),
('550e8400-e29b-41d4-a716-446655440004', '468f9e6e-0cd8-4595-9ed5-1bcdc18dee60', 'Dancer/Waitress', '2024-02-01', true, NULL),
('550e8400-e29b-41d4-a716-446655440005', '1e30268d-dd92-4a95-8178-87142edb6ae6', 'Senior Server', '2023-01-15', true, NULL),
('550e8400-e29b-41d4-a716-446655440006', 'ba12b8ec-8675-4831-ac7e-6c8e665ff7bf', 'Waitress', '2024-08-01', true, NULL),
('550e8400-e29b-41d4-a716-446655440007', 'cd279c5a-b874-4a5f-aefa-6b947d69171a', 'Server', '2023-11-01', true, NULL),
('550e8400-e29b-41d4-a716-446655440008', 'ed93df69-83c4-4ee7-8ce2-45eb8a6f9732', 'Mixologist', '2024-04-15', true, NULL),
('550e8400-e29b-41d4-a716-446655440009', '3ac1f431-9995-450e-a6d4-d0f8fae25848', 'Waitress', '2024-05-20', true, NULL),
('550e8400-e29b-41d4-a716-446655440010', 'b59f084b-041a-45a0-a567-709f55e5a50d', 'Server', '2024-01-10', true, NULL),
('550e8400-e29b-41d4-a716-446655440011', '48dc6aa0-baaf-4435-8cf8-12c0a4ff8389', 'Waitress', '2024-03-15', true, NULL),
('550e8400-e29b-41d4-a716-446655440012', '30f840c9-b015-42f3-ab19-e2222b4b560a', 'Part-time Server', '2024-06-01', true, NULL),
('550e8400-e29b-41d4-a716-446655440013', '41cec5b4-de7a-44bc-9338-e268a35a1efa', 'Senior Server', '2024-06-01', true, NULL),
('550e8400-e29b-41d4-a716-446655440014', 'defa02bf-733e-4bd5-be38-abd062077717', 'Server', '2024-07-01', true, NULL),
('550e8400-e29b-41d4-a716-446655440015', '505cd995-1ae3-445d-923c-7401e2ea1bc4', 'Manager/Server', '2023-03-01', true, NULL);

-- PARTIE 2: Anciens emplois (is_current = false, avec end_date)
INSERT INTO employment_history (employee_id, establishment_id, position, start_date, end_date, is_current, created_by) VALUES
('550e8400-e29b-41d4-a716-446655440013', 'defa02bf-733e-4bd5-be38-abd062077717', 'Waitress', '2023-01-15', '2024-05-30', false, NULL),
('550e8400-e29b-41d4-a716-446655440014', 'ab067160-44f5-4cbb-860d-ffa92c6bbd8d', 'Waitress', '2023-09-01', '2024-06-30', false, NULL);

-- Vérification
SELECT
  e.name,
  e.nickname,
  eh.position,
  est.name as establishment,
  eh.is_current,
  eh.start_date,
  eh.end_date
FROM employees e
JOIN employment_history eh ON e.id = eh.employee_id
JOIN establishments est ON eh.establishment_id = est.id
ORDER BY eh.is_current DESC, e.name;