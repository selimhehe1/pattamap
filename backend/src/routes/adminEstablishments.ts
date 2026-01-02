/**
 * Admin Establishments Routes
 *
 * Handles establishment management in admin panel.
 * Extracted from admin.ts to reduce file size.
 */

import express from 'express';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';
import { notifyUserContentApproved, notifyUserContentRejected } from '../utils/notificationHelper';
import { findUuidByNumber, transformEstablishment } from './adminUtils';

const router = express.Router();

// GET /api/admin/establishments - Liste des établissements pour admin
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;

    let query = supabase
      .from('establishments')
      .select(`
        *,
        category:establishment_categories(id, name, icon, color),
        user:users(id, pseudonym)
      `)
      .order('created_at', { ascending: false });

    if (status && status !== 'all' && status !== '') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const transformedData = (data || []).map(transformEstablishment);

    res.json({ establishments: transformedData });
  } catch (error: unknown) {
    logger.error('Error fetching establishments:', error);
    res.status(500).json({ error: 'Failed to fetch establishments' });
  }
});

// PUT /api/admin/establishments/:id - Éditer un établissement
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    logger.debug('=== ESTABLISHMENT UPDATE DEBUG ===');
    logger.debug('Establishment ID received:', id);

    const allowedFieldNames = ['name', 'address', 'description', 'phone', 'website', 'logo_url', 'opening_hours', 'services', 'category_id', 'zone', 'grid_row', 'grid_col', 'ladydrink', 'barfine', 'rooms', 'location', 'status', 'pricing'];

    const receivedFields = Object.keys(updateData);
    const invalidFields = receivedFields.filter(field => !allowedFieldNames.includes(field));

    if (invalidFields.length > 0) {
      return res.status(400).json({
        code: 'INVALID_FIELDS',
        error: 'Invalid fields provided',
        invalidFields,
        allowedFields: allowedFieldNames
      });
    }

    const realUuid = await findUuidByNumber('establishments', id);
    if (!realUuid) {
      logger.error(`Could not find establishment with ID: ${id}`);
      return res.status(404).json({
        error: 'Establishment not found',
        message: `No establishment found with ID: ${id}.`,
        suggestions: [
          'The establishment might have been deleted',
          'This could be a legacy ID from an old database structure',
          'Try refreshing the admin panel to get current establishment IDs'
        ]
      });
    }

    const allowedFields = {
      name: updateData.name,
      address: updateData.address,
      description: updateData.description,
      phone: updateData.phone,
      website: updateData.website,
      logo_url: updateData.logo_url,
      opening_hours: updateData.opening_hours,
      services: updateData.services,
      category_id: updateData.category_id,
      zone: updateData.zone,
      grid_row: updateData.grid_row,
      grid_col: updateData.grid_col,
      ladydrink: updateData.ladydrink,
      barfine: updateData.barfine,
      rooms: updateData.rooms
    };

    const cleanData = Object.fromEntries(
      Object.entries(allowedFields).filter(([_, value]) => value !== undefined)
    );

    const { data, error } = await supabase
      .from('establishments')
      .update({ ...cleanData, updated_at: new Date().toISOString() })
      .eq('id', realUuid)
      .select(`
        id, name, address, zone, grid_row, grid_col, category_id,
        phone, website, logo_url, location, opening_hours,
        ladydrink, barfine, rooms, services, status,
        created_at, updated_at, created_by
      `)
      .single();

    if (error) {
      throw error;
    }

    res.json({ establishment: data });
  } catch (error: unknown) {
    logger.error('Error updating establishment:', error);
    res.status(500).json({ error: 'Failed to update establishment' });
  }
});

// POST /api/admin/establishments/:id/approve - Approuver un établissement
router.post('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;

    const realUuid = await findUuidByNumber('establishments', id);
    if (!realUuid) {
      return res.status(404).json({
        error: 'Establishment not found',
        message: `No establishment found with ID: ${id}. Cannot approve non-existent establishment.`
      });
    }

    const { data, error } = await supabase
      .from('establishments')
      .update({ status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', realUuid)
      .select(`
        id, name, address, zone, grid_row, grid_col, category_id,
        phone, website, location, opening_hours, ladydrink, barfine,
        rooms, services, status, created_at, updated_at, created_by
      `)
      .single();

    if (error) {
      throw error;
    }

    if (data.created_by) {
      await notifyUserContentApproved(data.created_by, 'establishment', data.name, data.id);
    }

    res.json({ establishment: data });
  } catch (error: unknown) {
    logger.error('Error approving establishment:', error);
    res.status(500).json({ error: 'Failed to approve establishment' });
  }
});

// POST /api/admin/establishments/:id/reject - Rejeter un établissement
router.post('/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim() === '') {
      return res.status(400).json({
        code: 'REASON_REQUIRED',
        error: 'Rejection reason is required'
      });
    }

    const realUuid = await findUuidByNumber('establishments', id);
    if (!realUuid) {
      return res.status(404).json({
        error: 'Establishment not found',
        message: `No establishment found with ID: ${id}. Cannot reject non-existent establishment.`
      });
    }

    const { data, error } = await supabase
      .from('establishments')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', realUuid)
      .select(`
        id, name, address, zone, grid_row, grid_col, category_id,
        phone, website, location, opening_hours, ladydrink, barfine,
        rooms, services, status, created_at, updated_at, created_by
      `)
      .single();

    if (error) {
      throw error;
    }

    if (data.created_by) {
      await notifyUserContentRejected(data.created_by, 'establishment', reason, data.id);
    }

    res.json({ establishment: data });
  } catch (error: unknown) {
    logger.error('Error rejecting establishment:', error);
    res.status(500).json({ error: 'Failed to reject establishment' });
  }
});

// DELETE /api/admin/establishments/:id - Supprimer un établissement
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('establishments')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Establishment not found' });
      }
      throw error;
    }

    res.json({ message: 'Establishment deleted successfully', establishment: data });
  } catch (error: unknown) {
    logger.error('Error deleting establishment:', error);
    res.status(500).json({ error: 'Failed to delete establishment' });
  }
});

// ========================================
// ESTABLISHMENT ↔ CONSUMABLES ASSOCIATIONS
// ========================================

// GET /api/admin/establishments/:id/consumables - Menu d'un établissement
router.get('/:id/consumables', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('establishment_consumables')
      .select(`
        id,
        establishment_id,
        consumable_id,
        price,
        is_available,
        consumable:consumable_templates(*)
      `)
      .eq('establishment_id', id);

    if (error) {
      throw error;
    }

    res.json({ consumables: data || [] });
  } catch (error: unknown) {
    logger.error('Error fetching establishment consumables:', error);
    res.status(500).json({ error: 'Failed to fetch establishment consumables' });
  }
});

// POST /api/admin/establishments/:id/consumables - Ajouter un consommable au menu
router.post('/:id/consumables', async (req, res) => {
  try {
    const { id } = req.params;
    const { consumable_id, price, is_available = true } = req.body;

    const { data, error } = await supabase
      .from('establishment_consumables')
      .insert({
        establishment_id: id,
        consumable_id,
        price,
        is_available
      })
      .select(`
        id,
        establishment_id,
        consumable_id,
        price,
        is_available,
        consumable:consumable_templates(*)
      `)
      .single();

    if (error) {
      throw error;
    }

    res.json({ consumable: data });
  } catch (error: unknown) {
    logger.error('Error adding consumable to establishment:', error);
    res.status(500).json({ error: 'Failed to add consumable to establishment' });
  }
});

// PUT /api/admin/establishments/:establishment_id/consumables/:consumable_id
router.put('/:establishment_id/consumables/:consumable_id', async (req, res) => {
  try {
    const { establishment_id, consumable_id } = req.params;
    const { price, is_available } = req.body;

    const { data, error } = await supabase
      .from('establishment_consumables')
      .update({ price, is_available })
      .eq('establishment_id', establishment_id)
      .eq('id', consumable_id)
      .select(`
        id,
        establishment_id,
        consumable_id,
        price,
        is_available,
        consumable:consumable_templates(*)
      `)
      .single();

    if (error) {
      throw error;
    }

    res.json({ consumable: data });
  } catch (error: unknown) {
    logger.error('Error updating establishment consumable:', error);
    res.status(500).json({ error: 'Failed to update establishment consumable' });
  }
});

// DELETE /api/admin/establishments/:establishment_id/consumables/:consumable_id
router.delete('/:establishment_id/consumables/:consumable_id', async (req, res) => {
  try {
    const { establishment_id, consumable_id } = req.params;

    const { error } = await supabase
      .from('establishment_consumables')
      .delete()
      .eq('establishment_id', establishment_id)
      .eq('id', consumable_id);

    if (error) {
      throw error;
    }

    res.json({ message: 'Consumable removed from establishment successfully' });
  } catch (error: unknown) {
    logger.error('Error removing consumable from establishment:', error);
    res.status(500).json({ error: 'Failed to remove consumable from establishment' });
  }
});

export default router;
