-- Redistribution Walking Street: 27 establishments on 12×5 grid
-- Old grid: 3 rows × 20 cols → New grid: 12 rows × 5 cols
-- Distribution: 3 establishments per row on rows 1-9, rows 10-12 empty

-- Transaction for atomic update
BEGIN;

-- Update Row 1 establishments (9 → 3 per row spread on rows 1-3)
UPDATE establishments SET grid_row = 1, grid_col = 1, updated_at = NOW() WHERE zone = 'walkingstreet' AND name = 'Shark Club';
UPDATE establishments SET grid_row = 1, grid_col = 2, updated_at = NOW() WHERE zone = 'walkingstreet' AND name = 'Champagne Gogo';
UPDATE establishments SET grid_row = 1, grid_col = 3, updated_at = NOW() WHERE zone = 'walkingstreet' AND name = 'Misty''s Gogo';

UPDATE establishments SET grid_row = 2, grid_col = 1, updated_at = NOW() WHERE zone = 'walkingstreet' AND name = 'Electric Blue';
UPDATE establishments SET grid_row = 2, grid_col = 2, updated_at = NOW() WHERE zone = 'walkingstreet' AND name = 'Club Electric Blue';
UPDATE establishments SET grid_row = 2, grid_col = 3, updated_at = NOW() WHERE zone = 'walkingstreet' AND name = 'Hollywood Gogo';

UPDATE establishments SET grid_row = 3, grid_col = 1, updated_at = NOW() WHERE zone = 'walkingstreet' AND name = 'Cosmos Gogo';
UPDATE establishments SET grid_row = 3, grid_col = 2, updated_at = NOW() WHERE zone = 'walkingstreet' AND name = 'Striphouse Gogo';
UPDATE establishments SET grid_row = 3, grid_col = 3, updated_at = NOW() WHERE zone = 'walkingstreet' AND name = 'Angelwitch Gogo';

-- Update Row 2 establishments (18 → 3 per row spread on rows 4-9)
UPDATE establishments SET grid_row = 4, grid_col = 1, updated_at = NOW() WHERE zone = 'walkingstreet' AND name = 'MYST Nightclub';
UPDATE establishments SET grid_row = 4, grid_col = 2, updated_at = NOW() WHERE zone = 'walkingstreet' AND name = 'Republic Club';
UPDATE establishments SET grid_row = 4, grid_col = 3, updated_at = NOW() WHERE zone = 'walkingstreet' AND name = 'Lucifer Gogo';

UPDATE establishments SET grid_row = 5, grid_col = 1, updated_at = NOW() WHERE zone = 'walkingstreet' AND name = 'Marine 2 Disco';
UPDATE establishments SET grid_row = 5, grid_col = 2, updated_at = NOW() WHERE zone = 'walkingstreet' AND name = 'Insomnia Nightclub';
UPDATE establishments SET grid_row = 5, grid_col = 3, updated_at = NOW() WHERE zone = 'walkingstreet' AND name = 'Dollhouse Gogo';

UPDATE establishments SET grid_row = 6, grid_col = 1, updated_at = NOW() WHERE zone = 'walkingstreet' AND name = '808 Club';
UPDATE establishments SET grid_row = 6, grid_col = 2, updated_at = NOW() WHERE zone = 'walkingstreet' AND name = 'What''s Up Gogo';
UPDATE establishments SET grid_row = 6, grid_col = 3, updated_at = NOW() WHERE zone = 'walkingstreet' AND name = 'Mixx Discotheque';

UPDATE establishments SET grid_row = 7, grid_col = 1, updated_at = NOW() WHERE zone = 'walkingstreet' AND name = 'Sapphire Gogo';
UPDATE establishments SET grid_row = 7, grid_col = 2, updated_at = NOW() WHERE zone = 'walkingstreet' AND name = 'Marine Disco';
UPDATE establishments SET grid_row = 7, grid_col = 3, updated_at = NOW() WHERE zone = 'walkingstreet' AND name = 'X-Zone Gogo';

UPDATE establishments SET grid_row = 8, grid_col = 1, updated_at = NOW() WHERE zone = 'walkingstreet' AND name = 'Baccara Gogo';
UPDATE establishments SET grid_row = 8, grid_col = 2, updated_at = NOW() WHERE zone = 'walkingstreet' AND name = 'Climax Gogo';
UPDATE establishments SET grid_row = 8, grid_col = 3, updated_at = NOW() WHERE zone = 'walkingstreet' AND name = 'Windmill Gogo';

UPDATE establishments SET grid_row = 9, grid_col = 1, updated_at = NOW() WHERE zone = 'walkingstreet' AND name = 'Kiss Gogo';
UPDATE establishments SET grid_row = 9, grid_col = 2, updated_at = NOW() WHERE zone = 'walkingstreet' AND name = 'Showgirls Gogo';
UPDATE establishments SET grid_row = 9, grid_col = 3, updated_at = NOW() WHERE zone = 'walkingstreet' AND name = 'Baby Gogo';

-- Rows 10-12 are reserved for future growth

-- Verification query
SELECT
  grid_row,
  grid_col,
  name,
  updated_at
FROM establishments
WHERE zone = 'walkingstreet'
ORDER BY grid_row, grid_col;

-- Commit transaction
COMMIT;

-- Summary
SELECT
  'Total Walking Street establishments' as metric,
  COUNT(*) as count
FROM establishments
WHERE zone = 'walkingstreet';

SELECT
  'Establishments per row' as metric,
  grid_row as row,
  COUNT(*) as count
FROM establishments
WHERE zone = 'walkingstreet'
GROUP BY grid_row
ORDER BY grid_row;
