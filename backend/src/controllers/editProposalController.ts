import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

export const createProposal = async (req: Request, res: Response) => {
  try {
    const { item_type, item_id, proposed_changes, current_values } = req.body;
    const proposed_by = (req as any).user?.id;

    if (!proposed_by) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!item_type || !item_id || !proposed_changes) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', proposed_by)
      .single();

    if (userError) {
      logger.error('Error fetching user role:', userError);
      return res.status(500).json({ error: 'Failed to verify user role' });
    }

    const isPrivileged = userData?.role === 'admin' || userData?.role === 'moderator';

    if (isPrivileged) {
      const table = item_type === 'employee' ? 'employees' : 'establishments';
      const validChanges = { ...proposed_changes };

      if (item_type === 'employee') {
        delete validChanges.current_establishment_id;
      }

      const { error: updateError } = await supabase
        .from(table)
        .update({
          ...validChanges,
          updated_at: new Date().toISOString()
        })
        .eq('id', item_id);

      if (updateError) {
        logger.error('Error applying privileged user changes:', updateError);
        return res.status(500).json({ error: 'Failed to apply changes' });
      }

      const { data, error: proposalError } = await supabase
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
        logger.error('Error creating auto-approved proposal:', proposalError);
      }

      return res.status(201).json({
        proposal: data,
        message: 'Changes applied immediately',
        auto_approved: true
      });
    }

    const { data, error } = await supabase
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
      logger.error('Error creating proposal:', error);
      return res.status(500).json({ error: 'Failed to create proposal' });
    }

    res.status(201).json({
      proposal: data,
      message: 'Edit proposal submitted for review',
      auto_approved: false
    });
  } catch (error) {
    logger.error('Error in createProposal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getProposals = async (req: Request, res: Response) => {
  try {
    const { status, item_type } = req.query;

    let query = supabase
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
      logger.error('Error fetching proposals:', error);
      return res.status(500).json({ error: 'Failed to fetch proposals' });
    }

    res.json({ proposals: data || [] });
  } catch (error) {
    logger.error('Error in getProposals:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMyProposals = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data, error } = await supabase
      .from('edit_proposals')
      .select('*')
      .eq('proposed_by', userId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching user proposals:', error);
      return res.status(500).json({ error: 'Failed to fetch proposals' });
    }

    res.json({ proposals: data || [] });
  } catch (error) {
    logger.error('Error in getMyProposals:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const approveProposal = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { moderator_notes } = req.body;
    const moderator_id = (req as any).user?.id;

    if (!moderator_id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: proposal, error: fetchError } = await supabase
      .from('edit_proposals')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !proposal) {
      logger.error('Error fetching proposal:', fetchError);
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

    const { error: updateError } = await supabase
      .from(table)
      .update({
        ...validChanges,
        updated_at: new Date().toISOString()
      })
      .eq('id', proposal.item_id);

    if (updateError) {
      logger.error('Error applying changes:', updateError);
      return res.status(500).json({ error: 'Failed to apply changes' });
    }

    const { error: approveError } = await supabase
      .from('edit_proposals')
      .update({
        status: 'approved',
        moderator_id,
        moderator_notes,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', id);

    if (approveError) {
      logger.error('Error updating proposal status:', approveError);
      return res.status(500).json({ error: 'Failed to update proposal status' });
    }

    res.json({ success: true, message: 'Proposal approved and changes applied' });
  } catch (error) {
    logger.error('Error in approveProposal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const rejectProposal = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { moderator_notes } = req.body;
    const moderator_id = (req as any).user?.id;

    if (!moderator_id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: proposal, error: fetchError } = await supabase
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

    const { error } = await supabase
      .from('edit_proposals')
      .update({
        status: 'rejected',
        moderator_id,
        moderator_notes,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      logger.error('Error rejecting proposal:', error);
      return res.status(500).json({ error: 'Failed to reject proposal' });
    }

    res.json({ success: true, message: 'Proposal rejected' });
  } catch (error) {
    logger.error('Error in rejectProposal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};