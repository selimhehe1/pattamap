/**
 * Admin Comments Routes
 *
 * Handles comment moderation in admin panel.
 * Extracted from admin.ts to reduce file size.
 */

import express from 'express';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

const router = express.Router();

// GET /api/admin/comments - Liste des commentaires pour modération
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;

    let query = supabase
      .from('comments')
      .select(`
        *,
        user:users(id, pseudonym),
        employee:employees(id, name, nickname, photos)
      `)
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    res.json({ comments: data || [] });
  } catch (error: unknown) {
    logger.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// POST /api/admin/comments/:id/approve - Approuver un commentaire
router.post('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('comments')
      .update({ status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Comment not found' });
      }
      throw error;
    }
    if (!data) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    res.json({ comment: data });
  } catch (error: unknown) {
    logger.error('Error approving comment:', error);
    res.status(500).json({ error: 'Failed to approve comment' });
  }
});

// POST /api/admin/comments/:id/reject - Rejeter un commentaire
router.post('/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason: _reason } = req.body;

    const { data, error } = await supabase
      .from('comments')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Comment not found' });
      }
      throw error;
    }
    if (!data) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    res.json({ comment: data });
  } catch (error: unknown) {
    logger.error('Error rejecting comment:', error);
    res.status(500).json({ error: 'Failed to reject comment' });
  }
});

// POST /api/admin/comments/:id/dismiss-reports - Rejeter les signalements d'un commentaire
router.post('/:id/dismiss-reports', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .select('id')
      .eq('id', id)
      .single();

    if (commentError) {
      if (commentError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Comment not found' });
      }
      throw commentError;
    }
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const { error } = await supabase
      .from('reports')
      .update({ status: 'dismissed', updated_at: new Date().toISOString() })
      .eq('comment_id', id)
      .eq('status', 'pending');

    if (error) {
      throw error;
    }

    res.json({ message: 'Reports dismissed successfully' });
  } catch (error: unknown) {
    logger.error('Error dismissing reports:', error);
    res.status(500).json({ error: 'Failed to dismiss reports' });
  }
});

export default router;
