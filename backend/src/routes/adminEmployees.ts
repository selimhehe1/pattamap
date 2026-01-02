/**
 * Admin Employee Routes
 *
 * Handles employee management in admin panel.
 * Extracted from admin.ts to reduce file size.
 */

import express, { Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { notifyUserContentApproved, notifyUserContentRejected } from '../utils/notificationHelper';
import { awardXP } from '../services/gamificationService';
import { DbEmploymentHistory, findUuidByNumber, transformEmployee } from './adminUtils';

const router = express.Router();

// GET /api/admin/employees - Liste des employées pour admin
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;

    let query = supabase
      .from('employees')
      .select(`
        *,
        employment_history(
          id,
          establishment_id,
          establishment:establishments(id, name),
          position,
          start_date,
          end_date,
          is_current
        )
      `)
      .order('created_at', { ascending: false });

    if (status && status !== 'all' && status !== '') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Supabase query error:', error);
      throw error;
    }

    logger.debug(`Found ${data?.length || 0} employees`);

    const transformedEmployees = (data || []).map((emp, index) => {
      try {
        const baseEmployee = transformEmployee(emp);
        return {
          ...baseEmployee,
          employment_history: emp.employment_history?.map((eh: DbEmploymentHistory) => ({
            id: eh.id,
            employee_id: emp.id,
            establishment_id: eh.establishment_id,
            establishment_name: eh.establishment?.name || 'Unknown',
            position: eh.position,
            start_date: eh.start_date,
            end_date: eh.end_date,
            is_current: eh.is_current,
            notes: `Working at ${eh.establishment?.name || 'Unknown'}`,
            created_by: emp.created_by || null,
            created_at: emp.created_at,
            updated_at: emp.updated_at,
            establishment: eh.establishment ? { ...eh.establishment, id: eh.establishment.id } : null
          })) || []
        };
      } catch (transformError) {
        logger.error(`Error transforming employee ${index}:`, transformError);
        throw transformError;
      }
    });

    res.json({ employees: transformedEmployees });
  } catch (error: unknown) {
    logger.error('Error fetching employees:', error);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

// PUT /api/admin/employees/:id - Éditer une employée
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    logger.info('Employee update request:', { id, keys: Object.keys(req.body) });

    const allowedFields = [
      'name', 'nickname', 'age', 'nationality', 'languages_spoken',
      'description', 'photos', 'social_media', 'status', 'self_removal_requested',
      'current_establishment_id', 'is_freelance'
    ];

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

    const realUuid = await findUuidByNumber('employees', id);
    if (!realUuid) {
      return res.status(404).json({
        error: 'Employee not found',
        message: `No employee found with ID: ${id}`
      });
    }

    const { id: _, created_at: _created_at, updated_at: _updated_at, user: _user, employment_history: _employment_history, current_establishment_id: requestedEstablishmentId, ...cleanData } = updateData;

    const { data, error } = await supabase
      .from('employees')
      .update({ ...cleanData, updated_at: new Date().toISOString() })
      .eq('id', realUuid)
      .select('*')
      .single();

    if (error) {
      logger.error('Supabase update error:', error);
      throw error;
    }

    // Handle current_establishment_id change via employment_history
    if (requestedEstablishmentId) {
      let establishmentUuid = requestedEstablishmentId;

      if (typeof establishmentUuid === 'number' || /^\d+$/.test(establishmentUuid)) {
        establishmentUuid = await findUuidByNumber('establishments', establishmentUuid.toString());
      }

      if (establishmentUuid) {
        await supabase
          .from('employment_history')
          .update({ is_current: false, end_date: new Date().toISOString() })
          .eq('employee_id', realUuid)
          .eq('is_current', true);

        const { error: empError } = await supabase
          .from('employment_history')
          .insert({
            employee_id: realUuid,
            establishment_id: establishmentUuid,
            position: 'Employee',
            start_date: new Date().toISOString(),
            is_current: true,
            notes: 'Updated via admin panel',
            created_by: req.user?.id || realUuid
          });

        if (empError) {
          logger.error('Employment history insert error:', empError);
        }
      }
    }

    res.json({ employee: data });
  } catch (error: unknown) {
    logger.error('Error updating employee:', error);
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

// POST /api/admin/employees/:id/approve - Approuver une employée
router.post('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('employees')
      .update({ status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Employee not found' });
      }
      throw error;
    }
    if (!data) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    if (data.created_by) {
      await notifyUserContentApproved(data.created_by, 'employee', data.name, data.id);

      try {
        await awardXP(
          data.created_by,
          10,
          'profile_approved',
          'employee',
          data.id,
          'Employee profile approved by admin'
        );
        logger.info(`Bonus XP awarded: +10 XP for approved employee ${data.id}`);
      } catch (xpError) {
        logger.error('Bonus XP award error:', xpError);
      }
    }

    res.json({ employee: data });
  } catch (error: unknown) {
    logger.error('Error approving employee:', error);
    res.status(500).json({ error: 'Failed to approve employee' });
  }
});

// POST /api/admin/employees/:id/reject - Rejeter une employée
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

    const { data, error } = await supabase
      .from('employees')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    if (data.created_by) {
      await notifyUserContentRejected(data.created_by, 'employee', reason, data.id);
    }

    res.json({ employee: data });
  } catch (error: unknown) {
    logger.error('Error rejecting employee:', error);
    res.status(500).json({ error: 'Failed to reject employee' });
  }
});

export default router;
