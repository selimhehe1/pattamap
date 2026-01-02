/**
 * Admin Consumables Routes
 *
 * Handles consumable templates and establishment-consumable associations.
 * Extracted from admin.ts to reduce file size.
 */

import express from 'express';
import { supabase } from '../config/supabase';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = express.Router();

// GET /api/admin/consumables - Liste des consommables
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('consumable_templates')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      throw error;
    }

    res.json({ consumables: data || [] });
  } catch (error: unknown) {
    logger.error('Error fetching consumables:', error);
    res.status(500).json({ error: 'Failed to fetch consumables' });
  }
});

// POST /api/admin/consumables - Créer un consommable
router.post('/', async (req: AuthRequest, res) => {
  try {
    const { name, category, icon, default_price } = req.body;
    const userId = req.user?.id;

    const { data, error } = await supabase
      .from('consumable_templates')
      .insert({
        name,
        category,
        icon,
        default_price,
        status: 'active',
        created_by: userId
      })
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    res.json({ consumable: data });
  } catch (error: unknown) {
    logger.error('Error creating consumable:', error);
    res.status(500).json({ error: 'Failed to create consumable' });
  }
});

// PUT /api/admin/consumables/:id - Éditer un consommable
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const { id: _, created_at: _created_at3, updated_at: _updated_at3, created_by: _created_by, ...cleanData } = updateData;

    const { data, error } = await supabase
      .from('consumable_templates')
      .update({ ...cleanData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    res.json({ consumable: data });
  } catch (error: unknown) {
    logger.error('Error updating consumable:', error);
    res.status(500).json({ error: 'Failed to update consumable' });
  }
});

// DELETE /api/admin/consumables/:id - Supprimer un consommable
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('consumable_templates')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    res.json({ message: 'Consumable deleted successfully' });
  } catch (error: unknown) {
    logger.error('Error deleting consumable:', error);
    res.status(500).json({ error: 'Failed to delete consumable' });
  }
});

// PUT /api/admin/consumables/:id/status - Changer le statut d'un consommable
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const { data, error } = await supabase
      .from('consumable_templates')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    res.json({ consumable: data });
  } catch (error: unknown) {
    logger.error('Error updating consumable status:', error);
    res.status(500).json({ error: 'Failed to update consumable status' });
  }
});

export default router;
