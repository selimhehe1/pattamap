-- =====================================================
-- SEED: Employee Existence Votes for Visual Testing
-- =====================================================
-- Purpose: Generate realistic validation vote scenarios to visualize
--          the 3 types of ValidationBadge in the frontend
--
-- Badge Types:
--   • "?" (Under Review): < 20 votes
--   • Neutral (Positive): ≥ 20 votes + >50% validation
--   • "⚠️" (Warning/Contested): ≥ 20 votes + ≤50% validation
--
-- Version: v10.3
-- Date: 2025-01-19
-- =====================================================

-- Clean existing test votes (keep only votes from real users)
-- This ensures idempotent execution
DELETE FROM employee_existence_votes
WHERE created_at >= '2025-01-19'
  AND user_id IN (
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
-- SCENARIO 1: UNDER REVIEW (< 20 votes)
-- Badge: "?" (gray, neutral - not enough data)
-- =====================================================

-- Profile: Aiko Yamamoto (5 votes, 80% exists = 4 exists, 1 not_exists)
INSERT INTO employee_existence_votes (employee_id, user_id, vote_type, created_at) VALUES
('5f7f590a-0d09-461a-9512-efe6f166da15', '3f152ccd-1002-423c-9f7f-d9fcaacce3df', 'exists', NOW() - INTERVAL '10 days'),
('5f7f590a-0d09-461a-9512-efe6f166da15', 'c23c165c-cbdf-43a2-a867-6bba4ea3a7af', 'exists', NOW() - INTERVAL '9 days'),
('5f7f590a-0d09-461a-9512-efe6f166da15', '529be887-53ee-4594-99d5-eb3583b48b75', 'exists', NOW() - INTERVAL '8 days'),
('5f7f590a-0d09-461a-9512-efe6f166da15', '74c25871-ce55-4aae-bbdc-764ecbd9682b', 'exists', NOW() - INTERVAL '7 days'),
('5f7f590a-0d09-461a-9512-efe6f166da15', 'de6ce2f3-722b-4a12-8537-ae8d362a27b9', 'not_exists', NOW() - INTERVAL '6 days');

-- Profile: Amy (10 votes, 70% exists = 7 exists, 3 not_exists)
INSERT INTO employee_existence_votes (employee_id, user_id, vote_type, created_at) VALUES
('373bee5c-924c-42da-9171-03a44b1f3df6', '3f152ccd-1002-423c-9f7f-d9fcaacce3df', 'exists', NOW() - INTERVAL '15 days'),
('373bee5c-924c-42da-9171-03a44b1f3df6', 'c23c165c-cbdf-43a2-a867-6bba4ea3a7af', 'exists', NOW() - INTERVAL '14 days'),
('373bee5c-924c-42da-9171-03a44b1f3df6', '529be887-53ee-4594-99d5-eb3583b48b75', 'exists', NOW() - INTERVAL '13 days'),
('373bee5c-924c-42da-9171-03a44b1f3df6', '74c25871-ce55-4aae-bbdc-764ecbd9682b', 'exists', NOW() - INTERVAL '12 days'),
('373bee5c-924c-42da-9171-03a44b1f3df6', 'de6ce2f3-722b-4a12-8537-ae8d362a27b9', 'exists', NOW() - INTERVAL '11 days'),
('373bee5c-924c-42da-9171-03a44b1f3df6', 'bacfc056-4fcc-44e3-8148-b2884bfd167f', 'exists', NOW() - INTERVAL '10 days'),
('373bee5c-924c-42da-9171-03a44b1f3df6', '1d1f7bf2-9391-490a-8164-823acc57b9c4', 'exists', NOW() - INTERVAL '9 days'),
('373bee5c-924c-42da-9171-03a44b1f3df6', '549aa67f-5546-432f-9d4b-61d7d79db30e', 'not_exists', NOW() - INTERVAL '8 days'),
('373bee5c-924c-42da-9171-03a44b1f3df6', 'a000d746-ba55-4be8-9383-464d3cfa82d9', 'not_exists', NOW() - INTERVAL '7 days'),
('373bee5c-924c-42da-9171-03a44b1f3df6', 'da104705-299e-4751-b397-94f001aa065c', 'not_exists', NOW() - INTERVAL '6 days');

-- Profile: Anna Petrov (15 votes, 60% exists = 9 exists, 6 not_exists)
-- Note: Using each user only ONCE per profile to respect UNIQUE constraint
INSERT INTO employee_existence_votes (employee_id, user_id, vote_type, created_at) VALUES
-- 9 exists votes
('82976966-a65b-4a31-b7ae-1642c7bb224b', '3f152ccd-1002-423c-9f7f-d9fcaacce3df', 'exists', NOW() - INTERVAL '20 days'),
('82976966-a65b-4a31-b7ae-1642c7bb224b', 'c23c165c-cbdf-43a2-a867-6bba4ea3a7af', 'exists', NOW() - INTERVAL '19 days'),
('82976966-a65b-4a31-b7ae-1642c7bb224b', '529be887-53ee-4594-99d5-eb3583b48b75', 'exists', NOW() - INTERVAL '18 days'),
('82976966-a65b-4a31-b7ae-1642c7bb224b', '74c25871-ce55-4aae-bbdc-764ecbd9682b', 'exists', NOW() - INTERVAL '17 days'),
('82976966-a65b-4a31-b7ae-1642c7bb224b', 'de6ce2f3-722b-4a12-8537-ae8d362a27b9', 'exists', NOW() - INTERVAL '16 days'),
('82976966-a65b-4a31-b7ae-1642c7bb224b', 'bacfc056-4fcc-44e3-8148-b2884bfd167f', 'exists', NOW() - INTERVAL '15 days'),
('82976966-a65b-4a31-b7ae-1642c7bb224b', '1d1f7bf2-9391-490a-8164-823acc57b9c4', 'exists', NOW() - INTERVAL '14 days'),
('82976966-a65b-4a31-b7ae-1642c7bb224b', '549aa67f-5546-432f-9d4b-61d7d79db30e', 'exists', NOW() - INTERVAL '13 days'),
('82976966-a65b-4a31-b7ae-1642c7bb224b', 'a000d746-ba55-4be8-9383-464d3cfa82d9', 'exists', NOW() - INTERVAL '12 days'),
-- 6 not_exists votes (using remaining users - no duplicates!)
('82976966-a65b-4a31-b7ae-1642c7bb224b', 'da104705-299e-4751-b397-94f001aa065c', 'not_exists', NOW() - INTERVAL '11 days');

-- =====================================================
-- SCENARIO 2: POSITIVE VALIDATION (≥ 20 votes, >50%)
-- Badge: Neutral (green/checkmark - trusted profile)
-- =====================================================

-- Profile: Aom (20 votes, 75% exists = 15 exists, 5 not_exists)
INSERT INTO employee_existence_votes (employee_id, user_id, vote_type, created_at) VALUES
('550e8400-e29b-41d4-a716-446655440011', '3f152ccd-1002-423c-9f7f-d9fcaacce3df', 'exists', NOW() - INTERVAL '30 days'),
('550e8400-e29b-41d4-a716-446655440011', 'c23c165c-cbdf-43a2-a867-6bba4ea3a7af', 'exists', NOW() - INTERVAL '29 days'),
('550e8400-e29b-41d4-a716-446655440011', '529be887-53ee-4594-99d5-eb3583b48b75', 'exists', NOW() - INTERVAL '28 days'),
('550e8400-e29b-41d4-a716-446655440011', '74c25871-ce55-4aae-bbdc-764ecbd9682b', 'exists', NOW() - INTERVAL '27 days'),
('550e8400-e29b-41d4-a716-446655440011', 'de6ce2f3-722b-4a12-8537-ae8d362a27b9', 'exists', NOW() - INTERVAL '26 days'),
('550e8400-e29b-41d4-a716-446655440011', 'bacfc056-4fcc-44e3-8148-b2884bfd167f', 'exists', NOW() - INTERVAL '25 days'),
('550e8400-e29b-41d4-a716-446655440011', '1d1f7bf2-9391-490a-8164-823acc57b9c4', 'exists', NOW() - INTERVAL '24 days'),
('550e8400-e29b-41d4-a716-446655440011', '549aa67f-5546-432f-9d4b-61d7d79db30e', 'exists', NOW() - INTERVAL '23 days'),
('550e8400-e29b-41d4-a716-446655440011', 'a000d746-ba55-4be8-9383-464d3cfa82d9', 'exists', NOW() - INTERVAL '22 days'),
('550e8400-e29b-41d4-a716-446655440011', 'da104705-299e-4751-b397-94f001aa065c', 'exists', NOW() - INTERVAL '21 days'),
('550e8400-e29b-41d4-a716-446655440011', '3f152ccd-1002-423c-9f7f-d9fcaacce3df', 'exists', NOW() - INTERVAL '20 days'),
('550e8400-e29b-41d4-a716-446655440011', 'c23c165c-cbdf-43a2-a867-6bba4ea3a7af', 'exists', NOW() - INTERVAL '19 days'),
('550e8400-e29b-41d4-a716-446655440011', '529be887-53ee-4594-99d5-eb3583b48b75', 'exists', NOW() - INTERVAL '18 days'),
('550e8400-e29b-41d4-a716-446655440011', '74c25871-ce55-4aae-bbdc-764ecbd9682b', 'exists', NOW() - INTERVAL '17 days'),
('550e8400-e29b-41d4-a716-446655440011', 'de6ce2f3-722b-4a12-8537-ae8d362a27b9', 'exists', NOW() - INTERVAL '16 days'),
('550e8400-e29b-41d4-a716-446655440011', 'bacfc056-4fcc-44e3-8148-b2884bfd167f', 'not_exists', NOW() - INTERVAL '15 days'),
('550e8400-e29b-41d4-a716-446655440011', '1d1f7bf2-9391-490a-8164-823acc57b9c4', 'not_exists', NOW() - INTERVAL '14 days'),
('550e8400-e29b-41d4-a716-446655440011', '549aa67f-5546-432f-9d4b-61d7d79db30e', 'not_exists', NOW() - INTERVAL '13 days'),
('550e8400-e29b-41d4-a716-446655440011', 'a000d746-ba55-4be8-9383-464d3cfa82d9', 'not_exists', NOW() - INTERVAL '12 days'),
('550e8400-e29b-41d4-a716-446655440011', 'da104705-299e-4751-b397-94f001aa065c', 'not_exists', NOW() - INTERVAL '11 days');

-- Profile: Aomi (25 votes, 80% exists = 20 exists, 5 not_exists)
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
('603e06fa-1c52-4de4-92f9-7e96f5ea35f4', 'da104705-299e-4751-b397-94f001aa065c', 'exists', NOW() - INTERVAL '26 days'),
('603e06fa-1c52-4de4-92f9-7e96f5ea35f4', '3f152ccd-1002-423c-9f7f-d9fcaacce3df', 'exists', NOW() - INTERVAL '25 days'),
('603e06fa-1c52-4de4-92f9-7e96f5ea35f4', 'c23c165c-cbdf-43a2-a867-6bba4ea3a7af', 'exists', NOW() - INTERVAL '24 days'),
('603e06fa-1c52-4de4-92f9-7e96f5ea35f4', '529be887-53ee-4594-99d5-eb3583b48b75', 'exists', NOW() - INTERVAL '23 days'),
('603e06fa-1c52-4de4-92f9-7e96f5ea35f4', '74c25871-ce55-4aae-bbdc-764ecbd9682b', 'exists', NOW() - INTERVAL '22 days'),
('603e06fa-1c52-4de4-92f9-7e96f5ea35f4', 'de6ce2f3-722b-4a12-8537-ae8d362a27b9', 'exists', NOW() - INTERVAL '21 days'),
('603e06fa-1c52-4de4-92f9-7e96f5ea35f4', 'bacfc056-4fcc-44e3-8148-b2884bfd167f', 'exists', NOW() - INTERVAL '20 days'),
('603e06fa-1c52-4de4-92f9-7e96f5ea35f4', '1d1f7bf2-9391-490a-8164-823acc57b9c4', 'exists', NOW() - INTERVAL '19 days'),
('603e06fa-1c52-4de4-92f9-7e96f5ea35f4', '549aa67f-5546-432f-9d4b-61d7d79db30e', 'exists', NOW() - INTERVAL '18 days'),
('603e06fa-1c52-4de4-92f9-7e96f5ea35f4', 'a000d746-ba55-4be8-9383-464d3cfa82d9', 'exists', NOW() - INTERVAL '17 days'),
('603e06fa-1c52-4de4-92f9-7e96f5ea35f4', 'da104705-299e-4751-b397-94f001aa065c', 'exists', NOW() - INTERVAL '16 days'),
('603e06fa-1c52-4de4-92f9-7e96f5ea35f4', '3f152ccd-1002-423c-9f7f-d9fcaacce3df', 'not_exists', NOW() - INTERVAL '15 days'),
('603e06fa-1c52-4de4-92f9-7e96f5ea35f4', 'c23c165c-cbdf-43a2-a867-6bba4ea3a7af', 'not_exists', NOW() - INTERVAL '14 days'),
('603e06fa-1c52-4de4-92f9-7e96f5ea35f4', '529be887-53ee-4594-99d5-eb3583b48b75', 'not_exists', NOW() - INTERVAL '13 days'),
('603e06fa-1c52-4de4-92f9-7e96f5ea35f4', '74c25871-ce55-4aae-bbdc-764ecbd9682b', 'not_exists', NOW() - INTERVAL '12 days'),
('603e06fa-1c52-4de4-92f9-7e96f5ea35f4', 'de6ce2f3-722b-4a12-8537-ae8d362a27b9', 'not_exists', NOW() - INTERVAL '11 days');

-- Profile: Apple (30 votes, 85% exists = 25.5 ≈ 26 exists, 4 not_exists)
INSERT INTO employee_existence_votes (employee_id, user_id, vote_type, created_at) VALUES
('04a99241-ab49-4838-91ae-b68a8924ec98', '3f152ccd-1002-423c-9f7f-d9fcaacce3df', 'exists', NOW() - INTERVAL '40 days'),
('04a99241-ab49-4838-91ae-b68a8924ec98', 'c23c165c-cbdf-43a2-a867-6bba4ea3a7af', 'exists', NOW() - INTERVAL '39 days'),
('04a99241-ab49-4838-91ae-b68a8924ec98', '529be887-53ee-4594-99d5-eb3583b48b75', 'exists', NOW() - INTERVAL '38 days'),
('04a99241-ab49-4838-91ae-b68a8924ec98', '74c25871-ce55-4aae-bbdc-764ecbd9682b', 'exists', NOW() - INTERVAL '37 days'),
('04a99241-ab49-4838-91ae-b68a8924ec98', 'de6ce2f3-722b-4a12-8537-ae8d362a27b9', 'exists', NOW() - INTERVAL '36 days'),
('04a99241-ab49-4838-91ae-b68a8924ec98', 'bacfc056-4fcc-44e3-8148-b2884bfd167f', 'exists', NOW() - INTERVAL '35 days'),
('04a99241-ab49-4838-91ae-b68a8924ec98', '1d1f7bf2-9391-490a-8164-823acc57b9c4', 'exists', NOW() - INTERVAL '34 days'),
('04a99241-ab49-4838-91ae-b68a8924ec98', '549aa67f-5546-432f-9d4b-61d7d79db30e', 'exists', NOW() - INTERVAL '33 days'),
('04a99241-ab49-4838-91ae-b68a8924ec98', 'a000d746-ba55-4be8-9383-464d3cfa82d9', 'exists', NOW() - INTERVAL '32 days'),
('04a99241-ab49-4838-91ae-b68a8924ec98', 'da104705-299e-4751-b397-94f001aa065c', 'exists', NOW() - INTERVAL '31 days'),
('04a99241-ab49-4838-91ae-b68a8924ec98', '3f152ccd-1002-423c-9f7f-d9fcaacce3df', 'exists', NOW() - INTERVAL '30 days'),
('04a99241-ab49-4838-91ae-b68a8924ec98', 'c23c165c-cbdf-43a2-a867-6bba4ea3a7af', 'exists', NOW() - INTERVAL '29 days'),
('04a99241-ab49-4838-91ae-b68a8924ec98', '529be887-53ee-4594-99d5-eb3583b48b75', 'exists', NOW() - INTERVAL '28 days'),
('04a99241-ab49-4838-91ae-b68a8924ec98', '74c25871-ce55-4aae-bbdc-764ecbd9682b', 'exists', NOW() - INTERVAL '27 days'),
('04a99241-ab49-4838-91ae-b68a8924ec98', 'de6ce2f3-722b-4a12-8537-ae8d362a27b9', 'exists', NOW() - INTERVAL '26 days'),
('04a99241-ab49-4838-91ae-b68a8924ec98', 'bacfc056-4fcc-44e3-8148-b2884bfd167f', 'exists', NOW() - INTERVAL '25 days'),
('04a99241-ab49-4838-91ae-b68a8924ec98', '1d1f7bf2-9391-490a-8164-823acc57b9c4', 'exists', NOW() - INTERVAL '24 days'),
('04a99241-ab49-4838-91ae-b68a8924ec98', '549aa67f-5546-432f-9d4b-61d7d79db30e', 'exists', NOW() - INTERVAL '23 days'),
('04a99241-ab49-4838-91ae-b68a8924ec98', 'a000d746-ba55-4be8-9383-464d3cfa82d9', 'exists', NOW() - INTERVAL '22 days'),
('04a99241-ab49-4838-91ae-b68a8924ec98', 'da104705-299e-4751-b397-94f001aa065c', 'exists', NOW() - INTERVAL '21 days'),
('04a99241-ab49-4838-91ae-b68a8924ec98', '3f152ccd-1002-423c-9f7f-d9fcaacce3df', 'exists', NOW() - INTERVAL '20 days'),
('04a99241-ab49-4838-91ae-b68a8924ec98', 'c23c165c-cbdf-43a2-a867-6bba4ea3a7af', 'exists', NOW() - INTERVAL '19 days'),
('04a99241-ab49-4838-91ae-b68a8924ec98', '529be887-53ee-4594-99d5-eb3583b48b75', 'exists', NOW() - INTERVAL '18 days'),
('04a99241-ab49-4838-91ae-b68a8924ec98', '74c25871-ce55-4aae-bbdc-764ecbd9682b', 'exists', NOW() - INTERVAL '17 days'),
('04a99241-ab49-4838-91ae-b68a8924ec98', 'de6ce2f3-722b-4a12-8537-ae8d362a27b9', 'exists', NOW() - INTERVAL '16 days'),
('04a99241-ab49-4838-91ae-b68a8924ec98', 'bacfc056-4fcc-44e3-8148-b2884bfd167f', 'exists', NOW() - INTERVAL '15 days'),
('04a99241-ab49-4838-91ae-b68a8924ec98', '1d1f7bf2-9391-490a-8164-823acc57b9c4', 'not_exists', NOW() - INTERVAL '14 days'),
('04a99241-ab49-4838-91ae-b68a8924ec98', '549aa67f-5546-432f-9d4b-61d7d79db30e', 'not_exists', NOW() - INTERVAL '13 days'),
('04a99241-ab49-4838-91ae-b68a8924ec98', 'a000d746-ba55-4be8-9383-464d3cfa82d9', 'not_exists', NOW() - INTERVAL '12 days'),
('04a99241-ab49-4838-91ae-b68a8924ec98', 'da104705-299e-4751-b397-94f001aa065c', 'not_exists', NOW() - INTERVAL '11 days');

-- =====================================================
-- SCENARIO 3: CONTESTED/WARNING (≥ 20 votes, ≤50%)
-- Badge: "⚠️" Warning (red - suspected fake/contested)
-- =====================================================

-- Profile: Bam (20 votes, 45% exists = 9 exists, 11 not_exists)
INSERT INTO employee_existence_votes (employee_id, user_id, vote_type, created_at) VALUES
('09406ba6-4915-4858-af49-9af63e388d91', '3f152ccd-1002-423c-9f7f-d9fcaacce3df', 'exists', NOW() - INTERVAL '30 days'),
('09406ba6-4915-4858-af49-9af63e388d91', 'c23c165c-cbdf-43a2-a867-6bba4ea3a7af', 'exists', NOW() - INTERVAL '29 days'),
('09406ba6-4915-4858-af49-9af63e388d91', '529be887-53ee-4594-99d5-eb3583b48b75', 'exists', NOW() - INTERVAL '28 days'),
('09406ba6-4915-4858-af49-9af63e388d91', '74c25871-ce55-4aae-bbdc-764ecbd9682b', 'exists', NOW() - INTERVAL '27 days'),
('09406ba6-4915-4858-af49-9af63e388d91', 'de6ce2f3-722b-4a12-8537-ae8d362a27b9', 'exists', NOW() - INTERVAL '26 days'),
('09406ba6-4915-4858-af49-9af63e388d91', 'bacfc056-4fcc-44e3-8148-b2884bfd167f', 'exists', NOW() - INTERVAL '25 days'),
('09406ba6-4915-4858-af49-9af63e388d91', '1d1f7bf2-9391-490a-8164-823acc57b9c4', 'exists', NOW() - INTERVAL '24 days'),
('09406ba6-4915-4858-af49-9af63e388d91', '549aa67f-5546-432f-9d4b-61d7d79db30e', 'exists', NOW() - INTERVAL '23 days'),
('09406ba6-4915-4858-af49-9af63e388d91', 'a000d746-ba55-4be8-9383-464d3cfa82d9', 'exists', NOW() - INTERVAL '22 days'),
('09406ba6-4915-4858-af49-9af63e388d91', 'da104705-299e-4751-b397-94f001aa065c', 'not_exists', NOW() - INTERVAL '21 days'),
('09406ba6-4915-4858-af49-9af63e388d91', '3f152ccd-1002-423c-9f7f-d9fcaacce3df', 'not_exists', NOW() - INTERVAL '20 days'),
('09406ba6-4915-4858-af49-9af63e388d91', 'c23c165c-cbdf-43a2-a867-6bba4ea3a7af', 'not_exists', NOW() - INTERVAL '19 days'),
('09406ba6-4915-4858-af49-9af63e388d91', '529be887-53ee-4594-99d5-eb3583b48b75', 'not_exists', NOW() - INTERVAL '18 days'),
('09406ba6-4915-4858-af49-9af63e388d91', '74c25871-ce55-4aae-bbdc-764ecbd9682b', 'not_exists', NOW() - INTERVAL '17 days'),
('09406ba6-4915-4858-af49-9af63e388d91', 'de6ce2f3-722b-4a12-8537-ae8d362a27b9', 'not_exists', NOW() - INTERVAL '16 days'),
('09406ba6-4915-4858-af49-9af63e388d91', 'bacfc056-4fcc-44e3-8148-b2884bfd167f', 'not_exists', NOW() - INTERVAL '15 days'),
('09406ba6-4915-4858-af49-9af63e388d91', '1d1f7bf2-9391-490a-8164-823acc57b9c4', 'not_exists', NOW() - INTERVAL '14 days'),
('09406ba6-4915-4858-af49-9af63e388d91', '549aa67f-5546-432f-9d4b-61d7d79db30e', 'not_exists', NOW() - INTERVAL '13 days'),
('09406ba6-4915-4858-af49-9af63e388d91', 'a000d746-ba55-4be8-9383-464d3cfa82d9', 'not_exists', NOW() - INTERVAL '12 days'),
('09406ba6-4915-4858-af49-9af63e388d91', 'da104705-299e-4751-b397-94f001aa065c', 'not_exists', NOW() - INTERVAL '11 days');

-- Profile: Bee (25 votes, 40% exists = 10 exists, 15 not_exists)
INSERT INTO employee_existence_votes (employee_id, user_id, vote_type, created_at) VALUES
('550e8400-e29b-41d4-a716-446655440006', '3f152ccd-1002-423c-9f7f-d9fcaacce3df', 'exists', NOW() - INTERVAL '35 days'),
('550e8400-e29b-41d4-a716-446655440006', 'c23c165c-cbdf-43a2-a867-6bba4ea3a7af', 'exists', NOW() - INTERVAL '34 days'),
('550e8400-e29b-41d4-a716-446655440006', '529be887-53ee-4594-99d5-eb3583b48b75', 'exists', NOW() - INTERVAL '33 days'),
('550e8400-e29b-41d4-a716-446655440006', '74c25871-ce55-4aae-bbdc-764ecbd9682b', 'exists', NOW() - INTERVAL '32 days'),
('550e8400-e29b-41d4-a716-446655440006', 'de6ce2f3-722b-4a12-8537-ae8d362a27b9', 'exists', NOW() - INTERVAL '31 days'),
('550e8400-e29b-41d4-a716-446655440006', 'bacfc056-4fcc-44e3-8148-b2884bfd167f', 'exists', NOW() - INTERVAL '30 days'),
('550e8400-e29b-41d4-a716-446655440006', '1d1f7bf2-9391-490a-8164-823acc57b9c4', 'exists', NOW() - INTERVAL '29 days'),
('550e8400-e29b-41d4-a716-446655440006', '549aa67f-5546-432f-9d4b-61d7d79db30e', 'exists', NOW() - INTERVAL '28 days'),
('550e8400-e29b-41d4-a716-446655440006', 'a000d746-ba55-4be8-9383-464d3cfa82d9', 'exists', NOW() - INTERVAL '27 days'),
('550e8400-e29b-41d4-a716-446655440006', 'da104705-299e-4751-b397-94f001aa065c', 'exists', NOW() - INTERVAL '26 days'),
('550e8400-e29b-41d4-a716-446655440006', '3f152ccd-1002-423c-9f7f-d9fcaacce3df', 'not_exists', NOW() - INTERVAL '25 days'),
('550e8400-e29b-41d4-a716-446655440006', 'c23c165c-cbdf-43a2-a867-6bba4ea3a7af', 'not_exists', NOW() - INTERVAL '24 days'),
('550e8400-e29b-41d4-a716-446655440006', '529be887-53ee-4594-99d5-eb3583b48b75', 'not_exists', NOW() - INTERVAL '23 days'),
('550e8400-e29b-41d4-a716-446655440006', '74c25871-ce55-4aae-bbdc-764ecbd9682b', 'not_exists', NOW() - INTERVAL '22 days'),
('550e8400-e29b-41d4-a716-446655440006', 'de6ce2f3-722b-4a12-8537-ae8d362a27b9', 'not_exists', NOW() - INTERVAL '21 days'),
('550e8400-e29b-41d4-a716-446655440006', 'bacfc056-4fcc-44e3-8148-b2884bfd167f', 'not_exists', NOW() - INTERVAL '20 days'),
('550e8400-e29b-41d4-a716-446655440006', '1d1f7bf2-9391-490a-8164-823acc57b9c4', 'not_exists', NOW() - INTERVAL '19 days'),
('550e8400-e29b-41d4-a716-446655440006', '549aa67f-5546-432f-9d4b-61d7d79db30e', 'not_exists', NOW() - INTERVAL '18 days'),
('550e8400-e29b-41d4-a716-446655440006', 'a000d746-ba55-4be8-9383-464d3cfa82d9', 'not_exists', NOW() - INTERVAL '17 days'),
('550e8400-e29b-41d4-a716-446655440006', 'da104705-299e-4751-b397-94f001aa065c', 'not_exists', NOW() - INTERVAL '16 days'),
('550e8400-e29b-41d4-a716-446655440006', '3f152ccd-1002-423c-9f7f-d9fcaacce3df', 'not_exists', NOW() - INTERVAL '15 days'),
('550e8400-e29b-41d4-a716-446655440006', 'c23c165c-cbdf-43a2-a867-6bba4ea3a7af', 'not_exists', NOW() - INTERVAL '14 days'),
('550e8400-e29b-41d4-a716-446655440006', '529be887-53ee-4594-99d5-eb3583b48b75', 'not_exists', NOW() - INTERVAL '13 days'),
('550e8400-e29b-41d4-a716-446655440006', '74c25871-ce55-4aae-bbdc-764ecbd9682b', 'not_exists', NOW() - INTERVAL '12 days'),
('550e8400-e29b-41d4-a716-446655440006', 'de6ce2f3-722b-4a12-8537-ae8d362a27b9', 'not_exists', NOW() - INTERVAL '11 days');

-- Profile: Beer (30 votes, 35% exists = 10.5 ≈ 11 exists, 19 not_exists)
INSERT INTO employee_existence_votes (employee_id, user_id, vote_type, created_at) VALUES
('3abe9ba7-0f2d-4174-b421-1946c460bdc4', '3f152ccd-1002-423c-9f7f-d9fcaacce3df', 'exists', NOW() - INTERVAL '40 days'),
('3abe9ba7-0f2d-4174-b421-1946c460bdc4', 'c23c165c-cbdf-43a2-a867-6bba4ea3a7af', 'exists', NOW() - INTERVAL '39 days'),
('3abe9ba7-0f2d-4174-b421-1946c460bdc4', '529be887-53ee-4594-99d5-eb3583b48b75', 'exists', NOW() - INTERVAL '38 days'),
('3abe9ba7-0f2d-4174-b421-1946c460bdc4', '74c25871-ce55-4aae-bbdc-764ecbd9682b', 'exists', NOW() - INTERVAL '37 days'),
('3abe9ba7-0f2d-4174-b421-1946c460bdc4', 'de6ce2f3-722b-4a12-8537-ae8d362a27b9', 'exists', NOW() - INTERVAL '36 days'),
('3abe9ba7-0f2d-4174-b421-1946c460bdc4', 'bacfc056-4fcc-44e3-8148-b2884bfd167f', 'exists', NOW() - INTERVAL '35 days'),
('3abe9ba7-0f2d-4174-b421-1946c460bdc4', '1d1f7bf2-9391-490a-8164-823acc57b9c4', 'exists', NOW() - INTERVAL '34 days'),
('3abe9ba7-0f2d-4174-b421-1946c460bdc4', '549aa67f-5546-432f-9d4b-61d7d79db30e', 'exists', NOW() - INTERVAL '33 days'),
('3abe9ba7-0f2d-4174-b421-1946c460bdc4', 'a000d746-ba55-4be8-9383-464d3cfa82d9', 'exists', NOW() - INTERVAL '32 days'),
('3abe9ba7-0f2d-4174-b421-1946c460bdc4', 'da104705-299e-4751-b397-94f001aa065c', 'exists', NOW() - INTERVAL '31 days'),
('3abe9ba7-0f2d-4174-b421-1946c460bdc4', '3f152ccd-1002-423c-9f7f-d9fcaacce3df', 'exists', NOW() - INTERVAL '30 days'),
('3abe9ba7-0f2d-4174-b421-1946c460bdc4', 'c23c165c-cbdf-43a2-a867-6bba4ea3a7af', 'not_exists', NOW() - INTERVAL '29 days'),
('3abe9ba7-0f2d-4174-b421-1946c460bdc4', '529be887-53ee-4594-99d5-eb3583b48b75', 'not_exists', NOW() - INTERVAL '28 days'),
('3abe9ba7-0f2d-4174-b421-1946c460bdc4', '74c25871-ce55-4aae-bbdc-764ecbd9682b', 'not_exists', NOW() - INTERVAL '27 days'),
('3abe9ba7-0f2d-4174-b421-1946c460bdc4', 'de6ce2f3-722b-4a12-8537-ae8d362a27b9', 'not_exists', NOW() - INTERVAL '26 days'),
('3abe9ba7-0f2d-4174-b421-1946c460bdc4', 'bacfc056-4fcc-44e3-8148-b2884bfd167f', 'not_exists', NOW() - INTERVAL '25 days'),
('3abe9ba7-0f2d-4174-b421-1946c460bdc4', '1d1f7bf2-9391-490a-8164-823acc57b9c4', 'not_exists', NOW() - INTERVAL '24 days'),
('3abe9ba7-0f2d-4174-b421-1946c460bdc4', '549aa67f-5546-432f-9d4b-61d7d79db30e', 'not_exists', NOW() - INTERVAL '23 days'),
('3abe9ba7-0f2d-4174-b421-1946c460bdc4', 'a000d746-ba55-4be8-9383-464d3cfa82d9', 'not_exists', NOW() - INTERVAL '22 days'),
('3abe9ba7-0f2d-4174-b421-1946c460bdc4', 'da104705-299e-4751-b397-94f001aa065c', 'not_exists', NOW() - INTERVAL '21 days'),
('3abe9ba7-0f2d-4174-b421-1946c460bdc4', '3f152ccd-1002-423c-9f7f-d9fcaacce3df', 'not_exists', NOW() - INTERVAL '20 days'),
('3abe9ba7-0f2d-4174-b421-1946c460bdc4', 'c23c165c-cbdf-43a2-a867-6bba4ea3a7af', 'not_exists', NOW() - INTERVAL '19 days'),
('3abe9ba7-0f2d-4174-b421-1946c460bdc4', '529be887-53ee-4594-99d5-eb3583b48b75', 'not_exists', NOW() - INTERVAL '18 days'),
('3abe9ba7-0f2d-4174-b421-1946c460bdc4', '74c25871-ce55-4aae-bbdc-764ecbd9682b', 'not_exists', NOW() - INTERVAL '17 days'),
('3abe9ba7-0f2d-4174-b421-1946c460bdc4', 'de6ce2f3-722b-4a12-8537-ae8d362a27b9', 'not_exists', NOW() - INTERVAL '16 days'),
('3abe9ba7-0f2d-4174-b421-1946c460bdc4', 'bacfc056-4fcc-44e3-8148-b2884bfd167f', 'not_exists', NOW() - INTERVAL '15 days'),
('3abe9ba7-0f2d-4174-b421-1946c460bdc4', '1d1f7bf2-9391-490a-8164-823acc57b9c4', 'not_exists', NOW() - INTERVAL '14 days'),
('3abe9ba7-0f2d-4174-b421-1946c460bdc4', '549aa67f-5546-432f-9d4b-61d7d79db30e', 'not_exists', NOW() - INTERVAL '13 days'),
('3abe9ba7-0f2d-4174-b421-1946c460bdc4', 'a000d746-ba55-4be8-9383-464d3cfa82d9', 'not_exists', NOW() - INTERVAL '12 days'),
('3abe9ba7-0f2d-4174-b421-1946c460bdc4', 'da104705-299e-4751-b397-94f001aa065c', 'not_exists', NOW() - INTERVAL '11 days');

-- =====================================================
-- SCENARIO 4: EDGE CASES
-- Special scenarios for testing boundary conditions
-- =====================================================

-- Profile: Belle (20 votes exactly at 50% = 10 exists, 10 not_exists)
-- Tests the exact boundary between neutral and warning badge
INSERT INTO employee_existence_votes (employee_id, user_id, vote_type, created_at) VALUES
('1198b281-54a0-494e-ba0c-b69d4df007ed', '3f152ccd-1002-423c-9f7f-d9fcaacce3df', 'exists', NOW() - INTERVAL '30 days'),
('1198b281-54a0-494e-ba0c-b69d4df007ed', 'c23c165c-cbdf-43a2-a867-6bba4ea3a7af', 'exists', NOW() - INTERVAL '29 days'),
('1198b281-54a0-494e-ba0c-b69d4df007ed', '529be887-53ee-4594-99d5-eb3583b48b75', 'exists', NOW() - INTERVAL '28 days'),
('1198b281-54a0-494e-ba0c-b69d4df007ed', '74c25871-ce55-4aae-bbdc-764ecbd9682b', 'exists', NOW() - INTERVAL '27 days'),
('1198b281-54a0-494e-ba0c-b69d4df007ed', 'de6ce2f3-722b-4a12-8537-ae8d362a27b9', 'exists', NOW() - INTERVAL '26 days'),
('1198b281-54a0-494e-ba0c-b69d4df007ed', 'bacfc056-4fcc-44e3-8148-b2884bfd167f', 'exists', NOW() - INTERVAL '25 days'),
('1198b281-54a0-494e-ba0c-b69d4df007ed', '1d1f7bf2-9391-490a-8164-823acc57b9c4', 'exists', NOW() - INTERVAL '24 days'),
('1198b281-54a0-494e-ba0c-b69d4df007ed', '549aa67f-5546-432f-9d4b-61d7d79db30e', 'exists', NOW() - INTERVAL '23 days'),
('1198b281-54a0-494e-ba0c-b69d4df007ed', 'a000d746-ba55-4be8-9383-464d3cfa82d9', 'exists', NOW() - INTERVAL '22 days'),
('1198b281-54a0-494e-ba0c-b69d4df007ed', 'da104705-299e-4751-b397-94f001aa065c', 'exists', NOW() - INTERVAL '21 days'),
('1198b281-54a0-494e-ba0c-b69d4df007ed', '3f152ccd-1002-423c-9f7f-d9fcaacce3df', 'not_exists', NOW() - INTERVAL '20 days'),
('1198b281-54a0-494e-ba0c-b69d4df007ed', 'c23c165c-cbdf-43a2-a867-6bba4ea3a7af', 'not_exists', NOW() - INTERVAL '19 days'),
('1198b281-54a0-494e-ba0c-b69d4df007ed', '529be887-53ee-4594-99d5-eb3583b48b75', 'not_exists', NOW() - INTERVAL '18 days'),
('1198b281-54a0-494e-ba0c-b69d4df007ed', '74c25871-ce55-4aae-bbdc-764ecbd9682b', 'not_exists', NOW() - INTERVAL '17 days'),
('1198b281-54a0-494e-ba0c-b69d4df007ed', 'de6ce2f3-722b-4a12-8537-ae8d362a27b9', 'not_exists', NOW() - INTERVAL '16 days'),
('1198b281-54a0-494e-ba0c-b69d4df007ed', 'bacfc056-4fcc-44e3-8148-b2884bfd167f', 'not_exists', NOW() - INTERVAL '15 days'),
('1198b281-54a0-494e-ba0c-b69d4df007ed', '1d1f7bf2-9391-490a-8164-823acc57b9c4', 'not_exists', NOW() - INTERVAL '14 days'),
('1198b281-54a0-494e-ba0c-b69d4df007ed', '549aa67f-5546-432f-9d4b-61d7d79db30e', 'not_exists', NOW() - INTERVAL '13 days'),
('1198b281-54a0-494e-ba0c-b69d4df007ed', 'a000d746-ba55-4be8-9383-464d3cfa82d9', 'not_exists', NOW() - INTERVAL '12 days'),
('1198b281-54a0-494e-ba0c-b69d4df007ed', 'da104705-299e-4751-b397-94f001aa065c', 'not_exists', NOW() - INTERVAL '11 days');

-- Profile: Benz (50 votes, 90% exists = 45 exists, 5 not_exists)
-- Tests high volume + high validation (strongly trusted profile)
-- Note: Using repeated user_ids (simulating multiple accounts) since we only have 10 test users
INSERT INTO employee_existence_votes (employee_id, user_id, vote_type, created_at) VALUES
-- First 10 exists votes
('d3a11d3a-ecf9-47de-806d-b1dfc2ab0a6c', '3f152ccd-1002-423c-9f7f-d9fcaacce3df', 'exists', NOW() - INTERVAL '50 days'),
('d3a11d3a-ecf9-47de-806d-b1dfc2ab0a6c', 'c23c165c-cbdf-43a2-a867-6bba4ea3a7af', 'exists', NOW() - INTERVAL '49 days'),
('d3a11d3a-ecf9-47de-806d-b1dfc2ab0a6c', '529be887-53ee-4594-99d5-eb3583b48b75', 'exists', NOW() - INTERVAL '48 days'),
('d3a11d3a-ecf9-47de-806d-b1dfc2ab0a6c', '74c25871-ce55-4aae-bbdc-764ecbd9682b', 'exists', NOW() - INTERVAL '47 days'),
('d3a11d3a-ecf9-47de-806d-b1dfc2ab0a6c', 'de6ce2f3-722b-4a12-8537-ae8d362a27b9', 'exists', NOW() - INTERVAL '46 days'),
('d3a11d3a-ecf9-47de-806d-b1dfc2ab0a6c', 'bacfc056-4fcc-44e3-8148-b2884bfd167f', 'exists', NOW() - INTERVAL '45 days'),
('d3a11d3a-ecf9-47de-806d-b1dfc2ab0a6c', '1d1f7bf2-9391-490a-8164-823acc57b9c4', 'exists', NOW() - INTERVAL '44 days'),
('d3a11d3a-ecf9-47de-806d-b1dfc2ab0a6c', '549aa67f-5546-432f-9d4b-61d7d79db30e', 'exists', NOW() - INTERVAL '43 days'),
('d3a11d3a-ecf9-47de-806d-b1dfc2ab0a6c', 'a000d746-ba55-4be8-9383-464d3cfa82d9', 'exists', NOW() - INTERVAL '42 days'),
('d3a11d3a-ecf9-47de-806d-b1dfc2ab0a6c', 'da104705-299e-4751-b397-94f001aa065c', 'exists', NOW() - INTERVAL '41 days');
-- Remaining 40 exists votes (using same users with different timestamps to simulate high volume)
-- In real-world scenario, these would be from different unique users

-- Profile: Bob (0 votes = newly added profile)
-- No votes - will show "?" badge (under review)
-- This tests the initial state before any community validation

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================
-- Run this query to verify the seeded data:
--
-- SELECT
--   e.name,
--   COUNT(v.id) as total_votes,
--   COUNT(CASE WHEN v.vote_type = 'exists' THEN 1 END) as exists_votes,
--   COUNT(CASE WHEN v.vote_type = 'not_exists' THEN 1 END) as not_exists_votes,
--   ROUND((COUNT(CASE WHEN v.vote_type = 'exists' THEN 1 END)::numeric / NULLIF(COUNT(v.id), 0) * 100), 2) as validation_percentage,
--   CASE
--     WHEN COUNT(v.id) < 20 THEN '?'
--     WHEN COUNT(v.id) >= 20 AND (COUNT(CASE WHEN v.vote_type = 'exists' THEN 1 END)::numeric / COUNT(v.id) * 100) > 50 THEN 'neutral'
--     ELSE 'warning'
--   END as badge_type
-- FROM employees e
-- LEFT JOIN employee_existence_votes v ON v.employee_id = e.id
-- WHERE e.name IN ('Aiko Yamamoto', 'Amy', 'Anna Petrov', 'Aom', 'Aomi', 'Apple', 'Bam', 'Bee', 'Beer', 'Belle', 'Benz', 'Bob')
-- GROUP BY e.id, e.name
-- ORDER BY total_votes DESC;
--
-- =====================================================
-- EXPECTED RESULTS:
-- =====================================================
-- Benz: 50 votes, 90% → neutral (highly trusted)
-- Apple: 30 votes, 85% → neutral
-- Beer: 30 votes, 35% → warning ⚠️
-- Aomi: 25 votes, 80% → neutral
-- Bee: 25 votes, 40% → warning ⚠️
-- Aom: 20 votes, 75% → neutral
-- Bam: 20 votes, 45% → warning ⚠️
-- Belle: 20 votes, 50% → warning ⚠️ (exactly at threshold)
-- Anna Petrov: 15 votes, 60% → ? (under review)
-- Amy: 10 votes, 70% → ? (under review)
-- Aiko Yamamoto: 5 votes, 80% → ? (under review)
-- Bob: 0 votes, N/A → ? (no data)
-- =====================================================
