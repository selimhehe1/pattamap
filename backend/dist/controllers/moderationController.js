"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveReport = exports.getReports = exports.getModerationStats = exports.rejectItem = exports.approveItem = exports.getModerationQueue = void 0;
const supabase_1 = require("../config/supabase");
const logger_1 = require("../utils/logger");
const notificationHelper_1 = require("../utils/notificationHelper");
const gamificationService_1 = require("../services/gamificationService");
const getModerationQueue = async (req, res) => {
    try {
        const { status = 'pending', item_type, limit = 50 } = req.query;
        // 🚀 OPTIMISATION: Utilisation de batch queries avec LEFT JOIN au lieu de N+1 requêtes
        // Gain attendu: 50ms × N items → ~50ms total (-90% pour 50 items)
        let baseQuery = supabase_1.supabase
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
                ? supabase_1.supabase.from('employees').select('*').in('id', employeeIds)
                : Promise.resolve({ data: [] }),
            establishmentIds.length > 0
                ? supabase_1.supabase.from('establishments').select(`
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
                ? supabase_1.supabase.from('comments').select(`
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
    }
    catch (error) {
        logger_1.logger.error('Get moderation queue error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getModerationQueue = getModerationQueue;
const approveItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { moderator_notes } = req.body;
        // Get the moderation item with submitter info
        const { data: moderationItem, error: moderationError } = await supabase_1.supabase
            .from('moderation_queue')
            .select(`
        *,
        submitter:users!moderation_queue_submitted_by_fkey(id, pseudonym)
      `)
            .eq('id', id)
            .single();
        if (moderationError || !moderationItem) {
            return res.status(404).json({ error: 'Moderation item not found' });
        }
        if (moderationItem.status !== 'pending') {
            return res.status(400).json({ error: 'Item has already been reviewed' });
        }
        // Get content details for notification
        let contentName = '';
        let contentData = null;
        if (moderationItem.item_type === 'employee') {
            const { data: employee } = await supabase_1.supabase
                .from('employees')
                .select('name')
                .eq('id', moderationItem.item_id)
                .single();
            contentName = employee?.name || 'Employee';
            contentData = employee;
        }
        else if (moderationItem.item_type === 'establishment') {
            const { data: establishment } = await supabase_1.supabase
                .from('establishments')
                .select('name')
                .eq('id', moderationItem.item_id)
                .single();
            contentName = establishment?.name || 'Establishment';
            contentData = establishment;
        }
        else if (moderationItem.item_type === 'comment') {
            contentName = 'Comment';
            const { data: comment } = await supabase_1.supabase
                .from('comments')
                .select('content')
                .eq('id', moderationItem.item_id)
                .single();
            contentData = comment;
        }
        // Update the item status to approved
        if (moderationItem.item_type === 'employee') {
            await supabase_1.supabase
                .from('employees')
                .update({ status: 'approved' })
                .eq('id', moderationItem.item_id);
        }
        else if (moderationItem.item_type === 'establishment') {
            await supabase_1.supabase
                .from('establishments')
                .update({ status: 'approved' })
                .eq('id', moderationItem.item_id);
        }
        else if (moderationItem.item_type === 'comment') {
            await supabase_1.supabase
                .from('comments')
                .update({ status: 'approved' })
                .eq('id', moderationItem.item_id);
        }
        // Update moderation queue
        const { data: updatedItem, error: updateError } = await supabase_1.supabase
            .from('moderation_queue')
            .update({
            status: 'approved',
            moderator_id: req.user.id,
            moderator_notes,
            reviewed_at: new Date().toISOString()
        })
            .eq('id', id)
            .select()
            .single();
        if (updateError) {
            return res.status(400).json({ error: updateError.message });
        }
        // Notify user that their content was approved
        if (moderationItem.submitter?.id) {
            await (0, notificationHelper_1.notifyUserContentApproved)(moderationItem.submitter.id, moderationItem.item_type, contentName, moderationItem.item_id);
            // 🎮 Award XP for approved content
            try {
                await (0, gamificationService_1.awardXP)(moderationItem.submitter.id, 25, // XP reward for approved content
                'admin_manual', moderationItem.item_type, moderationItem.item_id, `${moderationItem.item_type} approved by moderator`);
            }
            catch (xpError) {
                logger_1.logger.error('XP award error on approval:', xpError);
            }
        }
        // 🔔 Notify users who favorited this employee that they're now available
        if (moderationItem.item_type === 'employee') {
            try {
                // Get employee's current establishment
                const { data: employment } = await supabase_1.supabase
                    .from('employment_history')
                    .select(`
            establishment_id,
            establishments:establishment_id(name)
          `)
                    .eq('employee_id', moderationItem.item_id)
                    .eq('is_current', true)
                    .single();
                const establishmentName = employment?.establishments
                    ? employment.establishments.name
                    : undefined;
                await (0, notificationHelper_1.notifyFavoriteAvailable)(moderationItem.item_id, contentName, establishmentName);
            }
            catch (notifyError) {
                // Log error but don't fail the request if notification fails
                logger_1.logger.error('Favorite available notification error:', notifyError);
            }
        }
        res.json({
            message: 'Item approved successfully',
            moderationItem: updatedItem
        });
    }
    catch (error) {
        logger_1.logger.error('Approve item error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.approveItem = approveItem;
const rejectItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { moderator_notes } = req.body;
        if (!moderator_notes) {
            return res.status(400).json({ error: 'Moderator notes are required for rejection' });
        }
        // Get the moderation item with submitter info
        const { data: moderationItem, error: moderationError } = await supabase_1.supabase
            .from('moderation_queue')
            .select(`
        *,
        submitter:users!moderation_queue_submitted_by_fkey(id, pseudonym)
      `)
            .eq('id', id)
            .single();
        if (moderationError || !moderationItem) {
            return res.status(404).json({ error: 'Moderation item not found' });
        }
        if (moderationItem.status !== 'pending') {
            return res.status(400).json({ error: 'Item has already been reviewed' });
        }
        // Get content details for notification
        let contentName = '';
        if (moderationItem.item_type === 'employee') {
            const { data: employee } = await supabase_1.supabase
                .from('employees')
                .select('name')
                .eq('id', moderationItem.item_id)
                .single();
            contentName = employee?.name || 'Employee';
        }
        else if (moderationItem.item_type === 'establishment') {
            const { data: establishment } = await supabase_1.supabase
                .from('establishments')
                .select('name')
                .eq('id', moderationItem.item_id)
                .single();
            contentName = establishment?.name || 'Establishment';
        }
        else if (moderationItem.item_type === 'comment') {
            contentName = 'Comment';
        }
        // Update the item status to rejected
        if (moderationItem.item_type === 'employee') {
            await supabase_1.supabase
                .from('employees')
                .update({ status: 'rejected' })
                .eq('id', moderationItem.item_id);
        }
        else if (moderationItem.item_type === 'establishment') {
            await supabase_1.supabase
                .from('establishments')
                .update({ status: 'rejected' })
                .eq('id', moderationItem.item_id);
        }
        else if (moderationItem.item_type === 'comment') {
            await supabase_1.supabase
                .from('comments')
                .update({ status: 'rejected' })
                .eq('id', moderationItem.item_id);
        }
        // Update moderation queue
        const { data: updatedItem, error: updateError } = await supabase_1.supabase
            .from('moderation_queue')
            .update({
            status: 'rejected',
            moderator_id: req.user.id,
            moderator_notes,
            reviewed_at: new Date().toISOString()
        })
            .eq('id', id)
            .select()
            .single();
        if (updateError) {
            return res.status(400).json({ error: updateError.message });
        }
        // Notify user that their content was rejected
        if (moderationItem.submitter?.id) {
            await (0, notificationHelper_1.notifyUserContentRejected)(moderationItem.submitter.id, moderationItem.item_type, moderator_notes, moderationItem.item_id);
        }
        res.json({
            message: 'Item rejected successfully',
            moderationItem: updatedItem
        });
    }
    catch (error) {
        logger_1.logger.error('Reject item error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.rejectItem = rejectItem;
const getModerationStats = async (req, res) => {
    try {
        // Get counts for each status
        const { data: pendingCount } = await supabase_1.supabase
            .from('moderation_queue')
            .select('id', { count: 'exact' })
            .eq('status', 'pending');
        const { data: approvedCount } = await supabase_1.supabase
            .from('moderation_queue')
            .select('id', { count: 'exact' })
            .eq('status', 'approved');
        const { data: rejectedCount } = await supabase_1.supabase
            .from('moderation_queue')
            .select('id', { count: 'exact' })
            .eq('status', 'rejected');
        // Get counts by item type
        const { data: employeeCount } = await supabase_1.supabase
            .from('moderation_queue')
            .select('id', { count: 'exact' })
            .eq('item_type', 'employee')
            .eq('status', 'pending');
        const { data: establishmentCount } = await supabase_1.supabase
            .from('moderation_queue')
            .select('id', { count: 'exact' })
            .eq('item_type', 'establishment')
            .eq('status', 'pending');
        const { data: commentCount } = await supabase_1.supabase
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
    }
    catch (error) {
        logger_1.logger.error('Get moderation stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getModerationStats = getModerationStats;
const getReports = async (req, res) => {
    try {
        const { status = 'pending', limit = 50 } = req.query;
        const { data: reports, error } = await supabase_1.supabase
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
    }
    catch (error) {
        logger_1.logger.error('Get reports error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getReports = getReports;
const resolveReport = async (req, res) => {
    try {
        const { id } = req.params;
        const { action, notes } = req.body; // action: 'dismiss' or 'remove_comment'
        if (!action || !['dismiss', 'remove_comment'].includes(action)) {
            return res.status(400).json({ error: 'Valid action is required (dismiss or remove_comment)' });
        }
        // Get the report
        const { data: report, error: reportError } = await supabase_1.supabase
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
            // Get comment details before removing to notify author
            const { data: comment } = await supabase_1.supabase
                .from('comments')
                .select('user_id, employee_id, establishment_id')
                .eq('id', report.comment_id)
                .single();
            await supabase_1.supabase
                .from('comments')
                .update({ status: 'rejected' })
                .eq('id', report.comment_id);
            // Notify comment author that their comment was removed
            if (comment?.user_id) {
                // Determine entity type and get entity name
                const entityType = comment.employee_id ? 'employee' : 'establishment';
                const entityId = comment.employee_id || comment.establishment_id;
                const { data: entityData } = await supabase_1.supabase
                    .from(entityType === 'employee' ? 'employees' : 'establishments')
                    .select('name')
                    .eq('id', entityId)
                    .single();
                if (entityData) {
                    await (0, notificationHelper_1.notifyCommentRemoved)(comment.user_id, notes || report.reason || 'Violated community guidelines', entityType, entityData.name);
                }
            }
        }
        // Update the report
        const { data: updatedReport, error: updateError } = await supabase_1.supabase
            .from('reports')
            .update({
            status: 'resolved',
            reviewed_by: req.user.id,
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
    }
    catch (error) {
        logger_1.logger.error('Resolve report error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.resolveReport = resolveReport;
//# sourceMappingURL=moderationController.js.map