"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rejectProposal = exports.approveProposal = exports.getMyProposals = exports.getProposals = exports.createProposal = void 0;
const supabase_1 = require("../config/supabase");
const logger_1 = require("../utils/logger");
const notificationHelper_1 = require("../utils/notificationHelper");
const createProposal = async (req, res) => {
    try {
        const { item_type, item_id, proposed_changes, current_values } = req.body;
        const proposed_by = req.user?.id;
        if (!proposed_by) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (!item_type || !item_id || !proposed_changes) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const { data: userData, error: userError } = await supabase_1.supabase
            .from('users')
            .select('role')
            .eq('id', proposed_by)
            .single();
        if (userError) {
            logger_1.logger.error('Error fetching user role:', userError);
            return res.status(500).json({ error: 'Failed to verify user role' });
        }
        const isPrivileged = userData?.role === 'admin' || userData?.role === 'moderator';
        if (isPrivileged) {
            const table = item_type === 'employee' ? 'employees' : 'establishments';
            const validChanges = { ...proposed_changes };
            if (item_type === 'employee') {
                delete validChanges.current_establishment_id;
            }
            const { error: updateError } = await supabase_1.supabase
                .from(table)
                .update({
                ...validChanges,
                updated_at: new Date().toISOString()
            })
                .eq('id', item_id);
            if (updateError) {
                logger_1.logger.error('Error applying privileged user changes:', updateError);
                return res.status(500).json({ error: 'Failed to apply changes' });
            }
            const { data, error: proposalError } = await supabase_1.supabase
                .from('edit_proposals')
                .insert([{
                    item_type,
                    item_id,
                    proposed_changes,
                    current_values,
                    proposed_by,
                    status: 'approved',
                    moderator_id: proposed_by,
                    moderator_notes: 'Auto-approved (admin/moderator edit)',
                    reviewed_at: new Date().toISOString()
                }])
                .select()
                .single();
            if (proposalError) {
                logger_1.logger.error('Error creating auto-approved proposal:', proposalError);
            }
            return res.status(201).json({
                proposal: data,
                message: 'Changes applied immediately',
                auto_approved: true
            });
        }
        const { data, error } = await supabase_1.supabase
            .from('edit_proposals')
            .insert([{
                item_type,
                item_id,
                proposed_changes,
                current_values,
                proposed_by
            }])
            .select()
            .single();
        if (error) {
            logger_1.logger.error('Error creating proposal:', error);
            return res.status(500).json({ error: 'Failed to create proposal' });
        }
        // Notify admins of new edit proposal from non-privileged user
        const { data: proposerData } = await supabase_1.supabase
            .from('users')
            .select('pseudonym')
            .eq('id', proposed_by)
            .single();
        const { data: entityData } = await supabase_1.supabase
            .from(item_type === 'employee' ? 'employees' : 'establishments')
            .select('name')
            .eq('id', item_id)
            .single();
        if (proposerData && entityData && data) {
            await (0, notificationHelper_1.notifyAdminsNewEditProposal)(data.id, proposerData.pseudonym, item_type, entityData.name);
        }
        res.status(201).json({
            proposal: data,
            message: 'Edit proposal submitted for review',
            auto_approved: false
        });
    }
    catch (error) {
        logger_1.logger.error('Error in createProposal:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.createProposal = createProposal;
const getProposals = async (req, res) => {
    try {
        const { status, item_type } = req.query;
        let query = supabase_1.supabase
            .from('edit_proposals')
            .select(`
        *,
        proposed_by_user:proposed_by (
          id,
          pseudonym
        ),
        moderator_user:moderator_id (
          id,
          pseudonym
        )
      `);
        if (status) {
            query = query.eq('status', status);
        }
        if (item_type) {
            query = query.eq('item_type', item_type);
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) {
            logger_1.logger.error('Error fetching proposals:', error);
            return res.status(500).json({ error: 'Failed to fetch proposals' });
        }
        res.json({ proposals: data || [] });
    }
    catch (error) {
        logger_1.logger.error('Error in getProposals:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getProposals = getProposals;
const getMyProposals = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const { data, error } = await supabase_1.supabase
            .from('edit_proposals')
            .select('*')
            .eq('proposed_by', userId)
            .order('created_at', { ascending: false });
        if (error) {
            logger_1.logger.error('Error fetching user proposals:', error);
            return res.status(500).json({ error: 'Failed to fetch proposals' });
        }
        res.json({ proposals: data || [] });
    }
    catch (error) {
        logger_1.logger.error('Error in getMyProposals:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getMyProposals = getMyProposals;
const approveProposal = async (req, res) => {
    try {
        const { id } = req.params;
        const { moderator_notes } = req.body;
        const moderator_id = req.user?.id;
        if (!moderator_id) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const { data: proposal, error: fetchError } = await supabase_1.supabase
            .from('edit_proposals')
            .select('*')
            .eq('id', id)
            .single();
        if (fetchError || !proposal) {
            logger_1.logger.error('Error fetching proposal:', fetchError);
            return res.status(404).json({ error: 'Proposal not found' });
        }
        if (proposal.status !== 'pending') {
            return res.status(400).json({ error: 'Proposal already reviewed' });
        }
        const table = proposal.item_type === 'employee' ? 'employees' : 'establishments';
        const validChanges = { ...proposal.proposed_changes };
        if (proposal.item_type === 'employee') {
            delete validChanges.current_establishment_id;
        }
        const { error: updateError } = await supabase_1.supabase
            .from(table)
            .update({
            ...validChanges,
            updated_at: new Date().toISOString()
        })
            .eq('id', proposal.item_id);
        if (updateError) {
            logger_1.logger.error('Error applying changes:', updateError);
            return res.status(500).json({ error: 'Failed to apply changes' });
        }
        const { error: approveError } = await supabase_1.supabase
            .from('edit_proposals')
            .update({
            status: 'approved',
            moderator_id,
            moderator_notes,
            reviewed_at: new Date().toISOString()
        })
            .eq('id', id);
        if (approveError) {
            logger_1.logger.error('Error updating proposal status:', approveError);
            return res.status(500).json({ error: 'Failed to update proposal status' });
        }
        // Notify proposer that their edit was approved
        const { data: entityData } = await supabase_1.supabase
            .from(proposal.item_type === 'employee' ? 'employees' : 'establishments')
            .select('name')
            .eq('id', proposal.item_id)
            .single();
        if (entityData) {
            await (0, notificationHelper_1.notifyEditProposalApproved)(proposal.proposed_by, proposal.item_type, entityData.name);
        }
        res.json({ success: true, message: 'Proposal approved and changes applied' });
    }
    catch (error) {
        logger_1.logger.error('Error in approveProposal:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.approveProposal = approveProposal;
const rejectProposal = async (req, res) => {
    try {
        const { id } = req.params;
        const { moderator_notes } = req.body;
        const moderator_id = req.user?.id;
        if (!moderator_id) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const { data: proposal, error: fetchError } = await supabase_1.supabase
            .from('edit_proposals')
            .select('*')
            .eq('id', id)
            .single();
        if (fetchError || !proposal) {
            return res.status(404).json({ error: 'Proposal not found' });
        }
        if (proposal.status !== 'pending') {
            return res.status(400).json({ error: 'Proposal already reviewed' });
        }
        const { error } = await supabase_1.supabase
            .from('edit_proposals')
            .update({
            status: 'rejected',
            moderator_id,
            moderator_notes,
            reviewed_at: new Date().toISOString()
        })
            .eq('id', id);
        if (error) {
            logger_1.logger.error('Error rejecting proposal:', error);
            return res.status(500).json({ error: 'Failed to reject proposal' });
        }
        // Notify proposer that their edit was rejected
        const { data: entityData } = await supabase_1.supabase
            .from(proposal.item_type === 'employee' ? 'employees' : 'establishments')
            .select('name')
            .eq('id', proposal.item_id)
            .single();
        if (entityData) {
            await (0, notificationHelper_1.notifyEditProposalRejected)(proposal.proposed_by, proposal.item_type, entityData.name, moderator_notes || 'No reason provided');
        }
        res.json({ success: true, message: 'Proposal rejected' });
    }
    catch (error) {
        logger_1.logger.error('Error in rejectProposal:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.rejectProposal = rejectProposal;
//# sourceMappingURL=editProposalController.js.map