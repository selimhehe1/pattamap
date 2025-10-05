import { Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

export const getModerationQueue = async (req: AuthRequest, res: Response) => {
  try {
    const { status = 'pending', item_type, limit = 50 } = req.query;

    // 🚀 OPTIMISATION: Utilisation de batch queries avec LEFT JOIN au lieu de N+1 requêtes
    // Gain attendu: 50ms × N items → ~50ms total (-90% pour 50 items)

    let baseQuery = supabase
      .from('moderation_queue')
      .select(`
        *,
        submitter:users!moderation_queue_submitted_by_fkey(pseudonym),
        moderator:users!moderation_queue_moderator_id_fkey(pseudonym)
      `)
      .order('created_at', { ascending: false });

    if (status) {
      baseQuery = baseQuery.eq('status', status);
    }

    if (item_type) {
      baseQuery = baseQuery.eq('item_type', item_type);
    }

    baseQuery = baseQuery.limit(Number(limit));

    const { data: moderationItems, error } = await baseQuery;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (!moderationItems || moderationItems.length === 0) {
      return res.json({ moderationItems: [] });
    }

    // Extraire les IDs par type pour les requêtes batch
    const employeeIds = moderationItems
      .filter(item => item.item_type === 'employee')
      .map(item => item.item_id);

    const establishmentIds = moderationItems
      .filter(item => item.item_type === 'establishment')
      .map(item => item.item_id);

    const commentIds = moderationItems
      .filter(item => item.item_type === 'comment')
      .map(item => item.item_id);

    // Requêtes batch parallèles au lieu de N requêtes séquentielles
    const [employeesData, establishmentsData, commentsData] = await Promise.all([
      employeeIds.length > 0
        ? supabase.from('employees').select('*').in('id', employeeIds)
        : Promise.resolve({ data: [] }),

      establishmentIds.length > 0
        ? supabase.from('establishments').select(`
            id,
            name,
            address,
            zone,
            grid_row,
            grid_col,
            category_id,
            phone,
            website,
            location,
            opening_hours,
            services,
            status,
            created_at,
            updated_at,
            created_by,
            category:establishment_categories(*)
          `).in('id', establishmentIds)
        : Promise.resolve({ data: [] }),

      commentIds.length > 0
        ? supabase.from('comments').select(`
            *,
            user:users(pseudonym),
            employee:employees(name)
          `).in('id', commentIds)
        : Promise.resolve({ data: [] })
    ]);

    // Créer des maps pour un accès O(1) au lieu de O(n) per item
    const employeesMap = new Map((employeesData.data || []).map(emp => [emp.id, emp]));
    const establishmentsMap = new Map((establishmentsData.data || []).map(est => [est.id, est]));
    const commentsMap = new Map((commentsData.data || []).map(comment => [comment.id, comment]));

    // Associer les données optimisées
    const itemsWithData = moderationItems.map(item => {
      let itemData = null;

      switch (item.item_type) {
        case 'employee':
          itemData = employeesMap.get(item.item_id) || null;
          break;
        case 'establishment':
          itemData = establishmentsMap.get(item.item_id) || null;
          break;
        case 'comment':
          itemData = commentsMap.get(item.item_id) || null;
          break;
      }

      return {
        ...item,
        item_data: itemData
      };
    });

    res.json({ moderationItems: itemsWithData });
  } catch (error) {
    logger.error('Get moderation queue error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const approveItem = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { moderator_notes } = req.body;

    // Get the moderation item
    const { data: moderationItem, error: moderationError } = await supabase
      .from('moderation_queue')
      .select('*')
      .eq('id', id)
      .single();

    if (moderationError || !moderationItem) {
      return res.status(404).json({ error: 'Moderation item not found' });
    }

    if (moderationItem.status !== 'pending') {
      return res.status(400).json({ error: 'Item has already been reviewed' });
    }

    // Update the item status to approved
    if (moderationItem.item_type === 'employee') {
      await supabase
        .from('employees')
        .update({ status: 'approved' })
        .eq('id', moderationItem.item_id);
    } else if (moderationItem.item_type === 'establishment') {
      await supabase
        .from('establishments')
        .update({ status: 'approved' })
        .eq('id', moderationItem.item_id);
    } else if (moderationItem.item_type === 'comment') {
      await supabase
        .from('comments')
        .update({ status: 'approved' })
        .eq('id', moderationItem.item_id);
    }

    // Update moderation queue
    const { data: updatedItem, error: updateError } = await supabase
      .from('moderation_queue')
      .update({
        status: 'approved',
        moderator_id: req.user!.id,
        moderator_notes,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return res.status(400).json({ error: updateError.message });
    }

    res.json({
      message: 'Item approved successfully',
      moderationItem: updatedItem
    });
  } catch (error) {
    logger.error('Approve item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const rejectItem = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { moderator_notes } = req.body;

    if (!moderator_notes) {
      return res.status(400).json({ error: 'Moderator notes are required for rejection' });
    }

    // Get the moderation item
    const { data: moderationItem, error: moderationError } = await supabase
      .from('moderation_queue')
      .select('*')
      .eq('id', id)
      .single();

    if (moderationError || !moderationItem) {
      return res.status(404).json({ error: 'Moderation item not found' });
    }

    if (moderationItem.status !== 'pending') {
      return res.status(400).json({ error: 'Item has already been reviewed' });
    }

    // Update the item status to rejected
    if (moderationItem.item_type === 'employee') {
      await supabase
        .from('employees')
        .update({ status: 'rejected' })
        .eq('id', moderationItem.item_id);
    } else if (moderationItem.item_type === 'establishment') {
      await supabase
        .from('establishments')
        .update({ status: 'rejected' })
        .eq('id', moderationItem.item_id);
    } else if (moderationItem.item_type === 'comment') {
      await supabase
        .from('comments')
        .update({ status: 'rejected' })
        .eq('id', moderationItem.item_id);
    }

    // Update moderation queue
    const { data: updatedItem, error: updateError } = await supabase
      .from('moderation_queue')
      .update({
        status: 'rejected',
        moderator_id: req.user!.id,
        moderator_notes,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return res.status(400).json({ error: updateError.message });
    }

    res.json({
      message: 'Item rejected successfully',
      moderationItem: updatedItem
    });
  } catch (error) {
    logger.error('Reject item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getModerationStats = async (req: AuthRequest, res: Response) => {
  try {
    // Get counts for each status
    const { data: pendingCount } = await supabase
      .from('moderation_queue')
      .select('id', { count: 'exact' })
      .eq('status', 'pending');

    const { data: approvedCount } = await supabase
      .from('moderation_queue')
      .select('id', { count: 'exact' })
      .eq('status', 'approved');

    const { data: rejectedCount } = await supabase
      .from('moderation_queue')
      .select('id', { count: 'exact' })
      .eq('status', 'rejected');

    // Get counts by item type
    const { data: employeeCount } = await supabase
      .from('moderation_queue')
      .select('id', { count: 'exact' })
      .eq('item_type', 'employee')
      .eq('status', 'pending');

    const { data: establishmentCount } = await supabase
      .from('moderation_queue')
      .select('id', { count: 'exact' })
      .eq('item_type', 'establishment')
      .eq('status', 'pending');

    const { data: commentCount } = await supabase
      .from('moderation_queue')
      .select('id', { count: 'exact' })
      .eq('item_type', 'comment')
      .eq('status', 'pending');

    res.json({
      stats: {
        total_pending: pendingCount?.length || 0,
        total_approved: approvedCount?.length || 0,
        total_rejected: rejectedCount?.length || 0,
        pending_by_type: {
          employees: employeeCount?.length || 0,
          establishments: establishmentCount?.length || 0,
          comments: commentCount?.length || 0
        }
      }
    });
  } catch (error) {
    logger.error('Get moderation stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getReports = async (req: AuthRequest, res: Response) => {
  try {
    const { status = 'pending', limit = 50 } = req.query;

    const { data: reports, error } = await supabase
      .from('reports')
      .select(`
        *,
        comment:comments(*),
        reporter:users!reports_reported_by_fkey(pseudonym),
        reviewer:users!reports_reviewed_by_fkey(pseudonym)
      `)
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(Number(limit));

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ reports });
  } catch (error) {
    logger.error('Get reports error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const resolveReport = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { action, notes } = req.body; // action: 'dismiss' or 'remove_comment'

    if (!action || !['dismiss', 'remove_comment'].includes(action)) {
      return res.status(400).json({ error: 'Valid action is required (dismiss or remove_comment)' });
    }

    // Get the report
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select('*')
      .eq('id', id)
      .single();

    if (reportError || !report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    if (report.status !== 'pending') {
      return res.status(400).json({ error: 'Report has already been resolved' });
    }

    // Take action on the comment if needed
    if (action === 'remove_comment') {
      await supabase
        .from('comments')
        .update({ status: 'rejected' })
        .eq('id', report.comment_id);
    }

    // Update the report
    const { data: updatedReport, error: updateError } = await supabase
      .from('reports')
      .update({
        status: 'resolved',
        reviewed_by: req.user!.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return res.status(400).json({ error: updateError.message });
    }

    res.json({
      message: `Report resolved successfully. Comment ${action === 'remove_comment' ? 'removed' : 'kept'}.`,
      report: updatedReport
    });
  } catch (error) {
    logger.error('Resolve report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};