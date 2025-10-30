-- =====================================================
-- SEED: Employee Existence Votes (SIMPLIFIED VERSION)
-- =====================================================
-- Purpose: Generate vote scenarios with ONLY 10 test users
-- Constraint: Each user can vote ONCE per employee (UNIQUE constraint)
--
-- Badge Types:
--   • "?" (Under Review): < 10 votes (threshold lowered for demo)
--   • Neutral (Positive): ≥ 10 votes + >50% validation
--   • "⚠️" (Warning/Contested): ≥ 10 votes + ≤50% validation
--
-- Version: v10.3
-- Date: 2025-01-19
-- =====================================================

-- Clean existing test votes
DELETE FROM employee_existence_votes
WHERE user_id IN (
  '3f152ccd-1002-423c-9f7f-d9fcaacce3df',
  'c23c165c-cbdf-43a2-a867-6bba4ea3a7af',
  '529be887-53ee-4594-99d5-eb3583b48b75',
  '74c25871-ce55-4aae-bbdc-764ecbd9682b',
  'de6ce2f3-722b-4a12-8537-ae8d362a27b9',
  'bacfc056-4fcc-44e3-8148-b2884bfd167f',
  '1d1f7bf2-9391-490a-8164-823acc57b9c4',
  '549aa67f-5546-432f-9d4b-61d7d79db30e',
  'a000d746-ba55-4be8-9383-464d3cfa82d9',
  'da104705-299e-4751-b397-94f001aa065c'
);

-- =====================================================
-- SCENARIO 1: UNDER REVIEW (< 10 votes)
-- Badge: "?" (not enough data)
-- =====================================================

-- Profile: Aiko Yamamoto (5 votes, 80% exists = 4 exists, 1 not_exists)
INSERT INTO employee_existence_votes (employee_id, user_id, vote_type, created_at) VALUES
('5f7f590a-0d09-461a-9512-efe6f166da15', '3f152ccd-1002-423c-9f7f-d9fcaacce3df', 'exists', NOW() - INTERVAL '10 days'),
('5f7f590a-0d09-461a-9512-efe6f166da15', 'c23c165c-cbdf-43a2-a867-6bba4ea3a7af', 'exists', NOW() - INTERVAL '9 days'),
('5f7f590a-0d09-461a-9512-efe6f166da15', '529be887-53ee-4594-99d5-eb3583b48b75', 'exists', NOW() - INTERVAL '8 days'),
('5f7f590a-0d09-461a-9512-efe6f166da15', '74c25871-ce55-4aae-bbdc-764ecbd9682b', 'exists', NOW() - INTERVAL '7 days'),
('5f7f590a-0d09-461a-9512-efe6f166da15', 'de6ce2f3-722b-4a12-8537-ae8d362a27b9', 'not_exists', NOW() - INTERVAL '6 days');

-- Profile: Amy (8 votes, 75% exists = 6 exists, 2 not_exists)
INSERT INTO employee_existence_votes (employee_id, user_id, vote_type, created_at) VALUES
('373bee5c-924c-42da-9171-03a44b1f3df6', '3f152ccd-1002-423c-9f7f-d9fcaacce3df', 'exists', NOW() - INTERVAL '15 days'),
('373bee5c-924c-42da-9171-03a44b1f3df6', 'c23c165c-cbdf-43a2-a867-6bba4ea3a7af', 'exists', NOW() - INTERVAL '14 days'),
('373bee5c-924c-42da-9171-03a44b1f3df6', '529be887-53ee-4594-99d5-eb3583b48b75', 'exists', NOW() - INTERVAL '13 days'),
('373bee5c-924c-42da-9171-03a44b1f3df6', '74c25871-ce55-4aae-bbdc-764ecbd9682b', 'exists', NOW() - INTERVAL '12 days'),
('373bee5c-924c-42da-9171-03a44b1f3df6', 'de6ce2f3-722b-4a12-8537-ae8d362a27b9', 'exists', NOW() - INTERVAL '11 days'),
('373bee5c-924c-42da-9171-03a44b1f3df6', 'bacfc056-4fcc-44e3-8148-b2884bfd167f', 'exists', NOW() - INTERVAL '10 days'),
('373bee5c-924c-42da-9171-03a44b1f3df6', '1d1f7bf2-9391-490a-8164-823acc57b9c4', 'not_exists', NOW() - INTERVAL '9 days'),
('373bee5c-924c-42da-9171-03a44b1f3df6', '549aa67f-5546-432f-9d4b-61d7d79db30e', 'not_exists', NOW() - INTERVAL '8 days');

-- =====================================================
-- SCENARIO 2: POSITIVE VALIDATION (≥ 10 votes, >50%)
-- Badge: Neutral (trusted profile)
-- =====================================================

-- Profile: Aom (10 votes, 80% exists = 8 exists, 2 not_exists)
INSERT INTO employee_existence_votes (employee_id, user_id, vote_type, created_at) VALUES
('550e8400-e29b-41d4-a716-446655440011', '3f152ccd-1002-423c-9f7f-d9fcaacce3df', 'exists', NOW() - INTERVAL '30 days'),
('550e8400-e29b-41d4-a716-446655440011', 'c23c165c-cbdf-43a2-a867-6bba4ea3a7af', 'exists', NOW() - INTERVAL '29 days'),
('550e8400-e29b-41d4-a716-446655440011', '529be887-53ee-4594-99d5-eb3583b48b75', 'exists', NOW() - INTERVAL '28 days'),
('550e8400-e29b-41d4-a716-446655440011', '74c25871-ce55-4aae-bbdc-764ecbd9682b', 'exists', NOW() - INTERVAL '27 days'),
('550e8400-e29b-41d4-a716-446655440011', 'de6ce2f3-722b-4a12-8537-ae8d362a27b9', 'exists', NOW() - INTERVAL '26 days'),
('550e8400-e29b-41d4-a716-446655440011', 'bacfc056-4fcc-44e3-8148-b2884bfd167f', 'exists', NOW() - INTERVAL '25 days'),
('550e8400-e29b-41d4-a716-446655440011', '1d1f7bf2-9391-490a-8164-823acc57b9c4', 'exists', NOW() - INTERVAL '24 days'),
('550e8400-e29b-41d4-a716-446655440011', '549aa67f-5546-432f-9d4b-61d7d79db30e', 'exists', NOW() - INTERVAL '23 days'),
('550e8400-e29b-41d4-a716-446655440011', 'a000d746-ba55-4be8-9383-464d3cfa82d9', 'not_exists', NOW() - INTERVAL '22 days'),
('550e8400-e29b-41d4-a716-446655440011', 'da104705-299e-4751-b397-94f001aa065c', 'not_exists', NOW() - INTERVAL '21 days');

-- Profile: Aomi (10 votes, 90% exists = 9 exists, 1 not_exists)
INSERT INTO employee_existence_votes (employee_id, user_id, vote_type, created_at) VALUES
('603e06fa-1c52-4de4-92f9-7e96f5ea35f4', '3f152ccd-1002-423c-9f7f-d9fcaacce3df', 'exists', NOW() - INTERVAL '35 days'),
('603e06fa-1c52-4de4-92f9-7e96f5ea35f4', 'c23c165c-cbdf-43a2-a867-6bba4ea3a7af', 'exists', NOW() - INTERVAL '34 days'),
('603e06fa-1c52-4de4-92f9-7e96f5ea35f4', '529be887-53ee-4594-99d5-eb3583b48b75', 'exists', NOW() - INTERVAL '33 days'),
('603e06fa-1c52-4de4-92f9-7e96f5ea35f4', '74c25871-ce55-4aae-bbdc-764ecbd9682b', 'exists', NOW() - INTERVAL '32 days'),
('603e06fa-1c52-4de4-92f9-7e96f5ea35f4', 'de6ce2f3-722b-4a12-8537-ae8d362a27b9', 'exists', NOW() - INTERVAL '31 days'),
('603e06fa-1c52-4de4-92f9-7e96f5ea35f4', 'bacfc056-4fcc-44e3-8148-b2884bfd167f', 'exists', NOW() - INTERVAL '30 days'),
('603e06fa-1c52-4de4-92f9-7e96f5ea35f4', '1d1f7bf2-9391-490a-8164-823acc57b9c4', 'exists', NOW() - INTERVAL '29 days'),
('603e06fa-1c52-4de4-92f9-7e96f5ea35f4', '549aa67f-5546-432f-9d4b-61d7d79db30e', 'exists', NOW() - INTERVAL '28 days'),
('603e06fa-1c52-4de4-92f9-7e96f5ea35f4', 'a000d746-ba55-4be8-9383-464d3cfa82d9', 'exists', NOW() - INTERVAL '27 days'),
('603e06fa-1c52-4de4-92f9-7e96f5ea35f4', 'da104705-299e-4751-b397-94f001aa065c', 'not_exists', NOW() - INTERVAL '26 days');

-- Profile: Apple (10 votes, 70% exists = 7 exists, 3 not_exists)
INSERT INTO employee_existence_votes (employee_id, user_id, vote_type, created_at) VALUES
('04a99241-ab49-4838-91ae-b68a8924ec98', '3f152ccd-1002-423c-9f7f-d9fcaacce3df', 'exists', NOW() - INTERVAL '40 days'),
('04a99241-ab49-4838-91ae-b68a8924ec98', 'c23c165c-cbdf-43a2-a867-6bba4ea3a7af', 'exists', NOW() - INTERVAL '39 days'),
('04a99241-ab49-4838-91ae-b68a8924ec98', '529be887-53ee-4594-99d5-eb3583b48b75', 'exists', NOW() - INTERVAL '38 days'),
('04a99241-ab49-4838-91ae-b68a8924ec98', '74c25871-ce55-4aae-bbdc-764ecbd9682b', 'exists', NOW() - INTERVAL '37 days'),
('04a99241-ab49-4838-91ae-b68a8924ec98', 'de6ce2f3-722b-4a12-8537-ae8d362a27b9', 'exists', NOW() - INTERVAL '36 days'),
('04a99241-ab49-4838-91ae-b68a8924ec98', 'bacfc056-4fcc-44e3-8148-b2884bfd167f', 'exists', NOW() - INTERVAL '35 days'),
('04a99241-ab49-4838-91ae-b68a8924ec98', '1d1f7bf2-9391-490a-8164-823acc57b9c4', 'exists', NOW() - INTERVAL '34 days'),
('04a99241-ab49-4838-91ae-b68a8924ec98', '549aa67f-5546-432f-9d4b-61d7d79db30e', 'not_exists', NOW() - INTERVAL '33 days'),
('04a99241-ab49-4838-91ae-b68a8924ec98', 'a000d746-ba55-4be8-9383-464d3cfa82d9', 'not_exists', NOW() - INTERVAL '32 days'),
('04a99241-ab49-4838-91ae-b68a8924ec98', 'da104705-299e-4751-b397-94f001aa065c', 'not_exists', NOW() - INTERVAL '31 days');

-- =====================================================
-- SCENARIO 3: CONTESTED/WARNING (≥ 10 votes, ≤50%)
-- Badge: "⚠️" Warning (suspected fake)
-- =====================================================

-- Profile: Bam (10 votes, 40% exists = 4 exists, 6 not_exists)
INSERT INTO employee_existence_votes (employee_id, user_id, vote_type, created_at) VALUES
('09406ba6-4915-4858-af49-9af63e388d91', '3f152ccd-1002-423c-9f7f-d9fcaacce3df', 'exists', NOW() - INTERVAL '30 days'),
('09406ba6-4915-4858-af49-9af63e388d91', 'c23c165c-cbdf-43a2-a867-6bba4ea3a7af', 'exists', NOW() - INTERVAL '29 days'),
('09406ba6-4915-4858-af49-9af63e388d91', '529be887-53ee-4594-99d5-eb3583b48b75', 'exists', NOW() - INTERVAL '28 days'),
('09406ba6-4915-4858-af49-9af63e388d91', '74c25871-ce55-4aae-bbdc-764ecbd9682b', 'exists', NOW() - INTERVAL '27 days'),
('09406ba6-4915-4858-af49-9af63e388d91', 'de6ce2f3-722b-4a12-8537-ae8d362a27b9', 'not_exists', NOW() - INTERVAL '26 days'),
('09406ba6-4915-4858-af49-9af63e388d91', 'bacfc056-4fcc-44e3-8148-b2884bfd167f', 'not_exists', NOW() - INTERVAL '25 days'),
('09406ba6-4915-4858-af49-9af63e388d91', '1d1f7bf2-9391-490a-8164-823acc57b9c4', 'not_exists', NOW() - INTERVAL '24 days'),
('09406ba6-4915-4858-af49-9af63e388d91', '549aa67f-5546-432f-9d4b-61d7d79db30e', 'not_exists', NOW() - INTERVAL '23 days'),
('09406ba6-4915-4858-af49-9af63e388d91', 'a000d746-ba55-4be8-9383-464d3cfa82d9', 'not_exists', NOW() - INTERVAL '22 days'),
('09406ba6-4915-4858-af49-9af63e388d91', 'da104705-299e-4751-b397-94f001aa065c', 'not_exists', NOW() - INTERVAL '21 days');

-- Profile: Bee (10 votes, 30% exists = 3 exists, 7 not_exists)
INSERT INTO employee_existence_votes (employee_id, user_id, vote_type, created_at) VALUES
('550e8400-e29b-41d4-a716-446655440006', '3f152ccd-1002-423c-9f7f-d9fcaacce3df', 'exists', NOW() - INTERVAL '35 days'),
('550e8400-e29b-41d4-a716-446655440006', 'c23c165c-cbdf-43a2-a867-6bba4ea3a7af', 'exists', NOW() - INTERVAL '34 days'),
('550e8400-e29b-41d4-a716-446655440006', '529be887-53ee-4594-99d5-eb3583b48b75', 'exists', NOW() - INTERVAL '33 days'),
('550e8400-e29b-41d4-a716-446655440006', '74c25871-ce55-4aae-bbdc-764ecbd9682b', 'not_exists', NOW() - INTERVAL '32 days'),
('550e8400-e29b-41d4-a716-446655440006', 'de6ce2f3-722b-4a12-8537-ae8d362a27b9', 'not_exists', NOW() - INTERVAL '31 days'),
('550e8400-e29b-41d4-a716-446655440006', 'bacfc056-4fcc-44e3-8148-b2884bfd167f', 'not_exists', NOW() - INTERVAL '30 days'),
('550e8400-e29b-41d4-a716-446655440006', '1d1f7bf2-9391-490a-8164-823acc57b9c4', 'not_exists', NOW() - INTERVAL '29 days'),
('550e8400-e29b-41d4-a716-446655440006', '549aa67f-5546-432f-9d4b-61d7d79db30e', 'not_exists', NOW() - INTERVAL '28 days'),
('550e8400-e29b-41d4-a716-446655440006', 'a000d746-ba55-4be8-9383-464d3cfa82d9', 'not_exists', NOW() - INTERVAL '27 days'),
('550e8400-e29b-41d4-a716-446655440006', 'da104705-299e-4751-b397-94f001aa065c', 'not_exists', NOW() - INTERVAL '26 days');

-- Profile: Beer (10 votes, 50% exists = 5 exists, 5 not_exists) EDGE CASE
INSERT INTO employee_existence_votes (employee_id, user_id, vote_type, created_at) VALUES
('3abe9ba7-0f2d-4174-b421-1946c460bdc4', '3f152ccd-1002-423c-9f7f-d9fcaacce3df', 'exists', NOW() - INTERVAL '40 days'),
('3abe9ba7-0f2d-4174-b421-1946c460bdc4', 'c23c165c-cbdf-43a2-a867-6bba4ea3a7af', 'exists', NOW() - INTERVAL '39 days'),
('3abe9ba7-0f2d-4174-b421-1946c460bdc4', '529be887-53ee-4594-99d5-eb3583b48b75', 'exists', NOW() - INTERVAL '38 days'),
('3abe9ba7-0f2d-4174-b421-1946c460bdc4', '74c25871-ce55-4aae-bbdc-764ecbd9682b', 'exists', NOW() - INTERVAL '37 days'),
('3abe9ba7-0f2d-4174-b421-1946c460bdc4', 'de6ce2f3-722b-4a12-8537-ae8d362a27b9', 'exists', NOW() - INTERVAL '36 days'),
('3abe9ba7-0f2d-4174-b421-1946c460bdc4', 'bacfc056-4fcc-44e3-8148-b2884bfd167f', 'not_exists', NOW() - INTERVAL '35 days'),
('3abe9ba7-0f2d-4174-b421-1946c460bdc4', '1d1f7bf2-9391-490a-8164-823acc57b9c4', 'not_exists', NOW() - INTERVAL '34 days'),
('3abe9ba7-0f2d-4174-b421-1946c460bdc4', '549aa67f-5546-432f-9d4b-61d7d79db30e', 'not_exists', NOW() - INTERVAL '33 days'),
('3abe9ba7-0f2d-4174-b421-1946c460bdc4', 'a000d746-ba55-4be8-9383-464d3cfa82d9', 'not_exists', NOW() - INTERVAL '32 days'),
('3abe9ba7-0f2d-4174-b421-1946c460bdc4', 'da104705-299e-4751-b397-94f001aa065c', 'not_exists', NOW() - INTERVAL '31 days');

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================
-- SELECT
--   e.name,
--   COUNT(v.id) as total_votes,
--   COUNT(CASE WHEN v.vote_type = 'exists' THEN 1 END) as exists_votes,
--   COUNT(CASE WHEN v.vote_type = 'not_exists' THEN 1 END) as not_exists_votes,
--   ROUND((COUNT(CASE WHEN v.vote_type = 'exists' THEN 1 END)::numeric / NULLIF(COUNT(v.id), 0) * 100), 2) as validation_percentage
-- FROM employees e
-- LEFT JOIN employee_existence_votes v ON v.employee_id = e.id
-- WHERE e.name IN ('Aiko Yamamoto', 'Amy', 'Aom', 'Aomi', 'Apple', 'Bam', 'Bee', 'Beer')
-- GROUP BY e.id, e.name
-- ORDER BY total_votes DESC;
--
-- EXPECTED RESULTS (Badge threshold lowered to 10 votes for demo):
-- Aomi: 10 votes, 90% → neutral
-- Aom: 10 votes, 80% → neutral
-- Apple: 10 votes, 70% → neutral
-- Beer: 10 votes, 50% → warning ⚠️ (exactly at threshold)
-- Bam: 10 votes, 40% → warning ⚠️
-- Bee: 10 votes, 30% → warning ⚠️
-- Amy: 8 votes, 75% → ? (under review)
-- Aiko Yamamoto: 5 votes, 80% → ? (under review)
-- =====================================================
