/**
 * Admin User Routes
 *
 * Handles user management in admin panel.
 * Extracted from admin.ts to reduce file size.
 */

import express from 'express';
import { supabase } from '../config/supabase';
import { authenticateToken, requireRole } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = express.Router();

// GET /api/admin/user-stats/:id - Statistiques d'un utilisateur spécifique
router.get('/user-stats/:id', authenticateToken, requireRole(['admin', 'moderator']), async (req, res) => {
  try {
    const { id } = req.params;
    logger.debug('Fetching user stats for:', id);

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', id)
      .single();

    if (userError) {
      if (userError.code === 'PGRST116') {
        return res.status(404).json({ error: 'User not found' });
      }
      throw userError;
    }
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { data: establishmentsData, error: estError } = await supabase
      .from('establishments')
      .select('id')
      .eq('created_by', id);

    const { data: employeesData, error: empError } = await supabase
      .from('employees')
      .select('id')
      .eq('created_by', id);

    const { data: commentsData, error: comError } = await supabase
      .from('comments')
      .select('id')
      .eq('user_id', id)
      .is('rating', null);

    if (estError || empError || comError) {
      logger.error('Error fetching user stats:', { estError, empError, comError });
    }

    const stats = {
      establishments_submitted: establishmentsData?.length || 0,
      employees_submitted: employeesData?.length || 0,
      comments_made: commentsData?.length || 0
    };

    res.json({ stats });

  } catch (error) {
    logger.error('Error calculating user stats:', error);
    res.status(500).json({
      error: 'Failed to calculate user stats',
      stats: {
        establishments_submitted: 0,
        employees_submitted: 0,
        comments_made: 0
      }
    });
  }
});

// GET /api/admin/users - Liste des utilisateurs pour admin
router.get('/users', async (req, res) => {
  try {
    const { role, active, search } = req.query;

    let query = supabase
      .from('users')
      .select(`
        id,
        pseudonym,
        email,
        role,
        created_at,
        updated_at,
        is_active,
        avatar_url
      `)
      .order('created_at', { ascending: false });

    if (role && role !== 'all') {
      if (role === 'inactive') {
        query = query.eq('is_active', false);
      } else {
        query = query.eq('role', role);
      }
    }

    if (active === 'false') {
      query = query.eq('is_active', false);
    }

    if (search) {
      query = query.or(`pseudonym.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const usersWithStats = await Promise.all(
      (data || []).map(async (user) => {
        const { count: establishments_submitted } = await supabase
          .from('establishments')
          .select('*', { count: 'exact', head: true })
          .eq('created_by', user.id);

        const { count: employees_submitted } = await supabase
          .from('employees')
          .select('*', { count: 'exact', head: true })
          .eq('created_by', user.id);

        const { count: comments_made } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        return {
          ...user,
          stats: {
            establishments_submitted: establishments_submitted || 0,
            employees_submitted: employees_submitted || 0,
            comments_made: comments_made || 0
          }
        };
      })
    );

    res.json({ users: usersWithStats });
  } catch (error: unknown) {
    logger.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// PUT /api/admin/users/:id - Éditer un utilisateur
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const allowedFields = ['pseudonym', 'email', 'role', 'is_active'];

    const receivedFields = Object.keys(updateData);
    const invalidFields = receivedFields.filter(field => !allowedFields.includes(field));

    if (invalidFields.length > 0) {
      return res.status(400).json({
        code: 'INVALID_FIELDS',
        error: 'Invalid fields provided',
        invalidFields,
        allowedFields
      });
    }

    const { id: _, created_at: _created_at2, updated_at: _updated_at2, stats: _stats, password: _password, ...cleanData } = updateData;

    const { data, error } = await supabase
      .from('users')
      .update({ ...cleanData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, pseudonym, email, role, created_at, updated_at, is_active')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'User not found' });
      }
      throw error;
    }
    if (!data) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: data });
  } catch (error: unknown) {
    logger.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// POST /api/admin/users/:id/role - Changer le rôle d'un utilisateur
router.post('/users/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['user', 'moderator', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const { data, error } = await supabase
      .from('users')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, pseudonym, email, role, created_at, updated_at, is_active')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'User not found' });
      }
      throw error;
    }
    if (!data) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: data });
  } catch (error: unknown) {
    logger.error('Error updating user role:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// POST /api/admin/users/:id/toggle-active - Activer/désactiver un utilisateur
router.post('/users/:id/toggle-active', async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError || !existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { data, error } = await supabase
      .from('users')
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, pseudonym, email, role, created_at, updated_at, is_active')
      .single();

    if (error) {
      throw error;
    }
    if (!data) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: data });
  } catch (error: unknown) {
    logger.error('Error toggling user status:', error);
    res.status(500).json({ error: 'Failed to toggle user status' });
  }
});

export default router;
