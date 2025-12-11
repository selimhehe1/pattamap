import { Router } from 'express';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

const router = Router();

// Utility functions for admin transformations
const uuidToNumber = (uuid: string): number => {
  if (!uuid) return 0;
  let hash = 0;
  for (let i = 0; i < uuid.length; i++) {
    const char = uuid.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

const transformEstablishment = (est: any) => ({
  ...est,
  id: est.id, // Keep original UUID instead of converting to number
  category_id: est.category_id || 1,
  created_by: est.created_by || null, // Keep original UUID if present
  category: est.category ? {
    ...est.category,
    id: est.category.id // Keep original UUID
  } : null,
  user: est.user ? {
    ...est.user,
    id: est.user.id // Keep original UUID
  } : null
});

const transformEmployee = (emp: any) => ({
  ...emp,
  id: emp.id, // Keep original UUID instead of converting to number
  created_by: emp.created_by || null, // Keep original UUID if present
  current_employment: emp.current_employment?.map((job: any) => ({
    ...job,
    id: job.id, // Keep original UUID
    employee_id: job.employee_id, // Keep original UUID
    establishment_id: job.establishment_id, // Keep original UUID
    establishment: job.establishment ? {
      ...job.establishment,
      id: job.establishment.id // Keep original UUID
    } : null
  })) || []
});

// Dashboard stats
router.get('/dashboard-stats', async (req, res) => {
  logger.debug('🎯 TEMP ADMIN STATS ROUTE HIT!');
  try {
    // Compter les établissements
    const { count: totalEstablishments } = await supabase
      .from('establishments')
      .select('*', { count: 'exact', head: true });
    
    const { count: pendingEstablishments } = await supabase
      .from('establishments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Compter les employées
    const { count: totalEmployees } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true });
    
    const { count: pendingEmployees } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Compter les utilisateurs
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    // Compter les commentaires
    const { count: totalComments } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true });
    
    const { count: pendingComments } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Compter les signalements
    const { count: reportedComments } = await supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    const stats = {
      totalEstablishments: totalEstablishments || 0,
      pendingEstablishments: pendingEstablishments || 0,
      totalEmployees: totalEmployees || 0,
      pendingEmployees: pendingEmployees || 0,
      totalUsers: totalUsers || 0,
      totalComments: totalComments || 0,
      pendingComments: pendingComments || 0,
      reportedComments: reportedComments || 0
    };

    logger.debug('📊 Dashboard stats:', stats);
    res.json(stats);
  } catch (error) {
    logger.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

// Establishments list
router.get('/establishments', async (req, res) => {
  logger.debug('🏢 TEMP ADMIN ESTABLISHMENTS ROUTE HIT!');
  try {
    const { status } = req.query;
    logger.debug('Filter status:', status);
    
    let query = supabase
      .from('establishments')
      .select(`
        *,
        category:establishment_categories(id, name, icon, color),
        user:users(id, pseudonym)
      `)
      .order('created_at', { ascending: false });

    // Only filter if status is specified and not 'all' or empty
    if (status && status !== 'all' && status !== '') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Database error:', error);
      throw error;
    }

    logger.debug(`Found ${data?.length || 0} establishments`);

    // Transform data to use numeric IDs
    const transformedData = (data || []).map(transformEstablishment);

    res.json({ establishments: transformedData });
  } catch (error) {
    logger.error('Error fetching establishments:', error);
    res.status(500).json({ error: 'Failed to fetch establishments' });
  }
});

// Employees list
router.get('/employees', async (req, res) => {
  logger.debug('👩 TEMP ADMIN EMPLOYEES ROUTE HIT!');
  try {
    const { status } = req.query;
    
    let query = supabase
      .from('employees')
      .select(`
        *,
        user:users(id, pseudonym),
        employment_history(
          id,
          establishment_id,
          establishment:establishments(name),
          position,
          start_date,
          end_date,
          is_current
        )
      `)
      .order('created_at', { ascending: false });

    // Only filter if status is specified and not 'all' or empty
    if (status && status !== 'all' && status !== '') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    logger.debug(`Found ${data?.length || 0} employees`);

    // Transform data using the utility function
    const transformedEmployees = (data || []).map((emp: any) => {
      const baseEmployee = transformEmployee(emp);
      return {
        ...baseEmployee,
        employment_history: emp.employment_history?.map((eh: any) => ({
          id: eh.id, // Keep original UUID
          employee_id: emp.id, // Keep original UUID
          establishment_id: eh.establishment_id, // Keep original UUID
          establishment_name: eh.establishment?.name || 'Unknown',
          position: eh.position,
          start_date: eh.start_date,
          end_date: eh.end_date,
          is_current: eh.is_current,
          notes: `Working at ${eh.establishment?.name}`,
          created_by: emp.created_by || null, // Keep original UUID if present
          created_at: emp.created_at,
          updated_at: emp.updated_at,
          establishment: eh.establishment ? {
            ...eh.establishment,
            id: eh.establishment.id // Keep original UUID
          } : null
        })) || []
      };
    });

    res.json({ employees: transformedEmployees });
  } catch (error) {
    logger.error('Error fetching employees:', error);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

// Temporary route to make a user admin (for debugging only)
router.post('/make-admin/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    logger.debug('🔧 MAKING USER ADMIN:', userId);

    const { data, error } = await supabase
      .from('users')
      .update({ role: 'admin' })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      logger.error('Error making user admin:', error);
      // SECURITY FIX: Don't expose error details
      return res.status(400).json({ error: 'Failed to upgrade user to admin' });
    }

    logger.debug('✅ User upgraded to admin:', data);
    res.json({ message: 'User upgraded to admin successfully', user: data });
  } catch (error) {
    logger.error('Make admin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;