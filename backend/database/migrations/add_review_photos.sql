-- Migration: add_review_photos.sql
-- Description: Add photos support to reviews/comments
-- Date: 2025-12-12
BEGIN;

-- Table pour stocker les photos associées aux commentaires/reviews
CREATE TABLE IF NOT EXISTS comment_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  cloudinary_public_id TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour récupérer rapidement les photos d'un commentaire
CREATE INDEX IF NOT EXISTS idx_comment_photos_comment_id ON comment_photos(comment_id);

-- Index pour le tri par ordre d'affichage
CREATE INDEX IF NOT EXISTS idx_comment_photos_display_order ON comment_photos(comment_id, display_order);

-- Fonction trigger pour limiter à 3 photos par commentaire
CREATE OR REPLACE FUNCTION check_comment_photos_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM comment_photos WHERE comment_id = NEW.comment_id) >= 3 THEN
    RAISE EXCEPTION 'Maximum 3 photos per comment allowed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer le trigger s'il existe déjà (pour permettre les re-exécutions)
DROP TRIGGER IF EXISTS enforce_comment_photos_limit ON comment_photos;

-- Créer le trigger
CREATE TRIGGER enforce_comment_photos_limit
  BEFORE INSERT ON comment_photos
  FOR EACH ROW EXECUTE FUNCTION check_comment_photos_limit();

-- RLS Policies pour comment_photos
ALTER TABLE comment_photos ENABLE ROW LEVEL SECURITY;

-- Policy: Tout le monde peut lire les photos des commentaires approuvés
CREATE POLICY "comment_photos_select_policy" ON comment_photos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM comments c
      WHERE c.id = comment_photos.comment_id
      AND c.status = 'approved'
    )
  );

-- Policy: Les utilisateurs authentifiés peuvent insérer des photos pour leurs propres commentaires
CREATE POLICY "comment_photos_insert_policy" ON comment_photos
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM comments c
      WHERE c.id = comment_photos.comment_id
      AND c.user_id = auth.uid()
    )
  );

-- Policy: Les utilisateurs peuvent supprimer les photos de leurs propres commentaires
CREATE POLICY "comment_photos_delete_policy" ON comment_photos
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM comments c
      WHERE c.id = comment_photos.comment_id
      AND c.user_id = auth.uid()
    )
  );

-- Policy: Les admins/modérateurs peuvent tout faire
CREATE POLICY "comment_photos_admin_policy" ON comment_photos
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'moderator')
    )
  );

-- Commentaire de documentation
COMMENT ON TABLE comment_photos IS 'Photos attachées aux commentaires/reviews. Maximum 3 photos par commentaire.';
COMMENT ON COLUMN comment_photos.photo_url IS 'URL Cloudinary de la photo';
COMMENT ON COLUMN comment_photos.cloudinary_public_id IS 'ID public Cloudinary pour suppression';
COMMENT ON COLUMN comment_photos.display_order IS 'Ordre d''affichage (0, 1, 2)';

COMMIT;
