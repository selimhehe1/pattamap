import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';
import {
  notifyAdminsNewEditProposal,
  notifyEditProposalApproved,
  notifyEditProposalRejected
} from '../utils/notificationHelper';
import { asyncHandler, UnauthorizedError, BadRequestError, NotFoundError, InternalServerError } from '../middleware/asyncHandler';

/** Type for employment history query with establishment and category join
 *  Note: Supabase returns arrays for join relations */
interface EmploymentJobWithEstablishment {
  id: string;
  establishment_id: string;
  establishments: Array<{
    id: string;
    name: string;
    category: Array<{ name: string }> | null;
  }>;
}

/**
 * Helper: Update employment_history when changing employee's establishment
 * Used by both createProposal (auto-approve) and approveProposal
 */
async function updateEmploymentHistory(
  employeeId: string,
  newEstablishmentId: string | null,
  createdBy: string,
  notes: string
): Promise<void> {
  if (!newEstablishmentId) {
    logger.info('updateEmploymentHistory: No newEstablishmentId provided, skipping');
    return;
  }

  logger.info(`updateEmploymentHistory: Starting for employee ${employeeId} -> establishment ${newEstablishmentId}`);

  // 1. End current employment
  const { error: endError } = await supabase
    .from('employment_history')
    .update({
      is_current: false,
      end_date: new Date().toISOString()
    })
    .eq('employee_id', employeeId)
    .eq('is_current', true);

  if (endError) {
    logger.error('updateEmploymentHistory: Error ending current employment:', endError);
  } else {
    logger.info('updateEmploymentHistory: Ended current employment successfully');
  }

  // 2. Create new current employment
  const { error: insertError } = await supabase
    .from('employment_history')
    .insert({
      employee_id: employeeId,
      establishment_id: newEstablishmentId,
      position: 'Employee',
      start_date: new Date().toISOString(),
      is_current: true,
      notes,
      created_by: createdBy
    });

  if (insertError) {
    logger.error('updateEmploymentHistory: Error inserting new employment:', insertError);
  } else {
    logger.info(`updateEmploymentHistory: Created new employment for employee ${employeeId} at establishment ${newEstablishmentId}`);
  }
}

/**
 * Helper: End all current employment for an employee
 * Used when clearing establishment (freelance without nightclub)
 */
async function endCurrentEmployment(employeeId: string): Promise<void> {
  logger.info(`endCurrentEmployment: Ending all current employment for ${employeeId}`);

  const { error } = await supabase
    .from('employment_history')
    .update({
      is_current: false,
      end_date: new Date().toISOString()
    })
    .eq('employee_id', employeeId)
    .eq('is_current', true);

  if (error) {
    logger.error('endCurrentEmployment: Error:', error);
  } else {
    logger.info(`endCurrentEmployment: Successfully ended current employment for ${employeeId}`);
  }
}

/**
 * Helper: Handle freelance mode switch
 * When switching TO freelance, end all non-Nightclub employment
 * Freelancers can only work in Nightclubs
 */
async function handleFreelanceSwitch(
  employeeId: string,
  isFreelance: boolean
): Promise<void> {
  if (!isFreelance) return;

  logger.info(`handleFreelanceSwitch: Processing freelance switch for employee ${employeeId}`);

  // Get current jobs with establishment category
  const { data: currentJobs, error: fetchError } = await supabase
    .from('employment_history')
    .select(`
      id,
      establishment_id,
      establishments!inner(
        id,
        name,
        category:establishment_categories(name)
      )
    `)
    .eq('employee_id', employeeId)
    .eq('is_current', true);

  if (fetchError) {
    logger.error('handleFreelanceSwitch: Error fetching current jobs:', fetchError);
    return;
  }

  if (!currentJobs || currentJobs.length === 0) {
    logger.info('handleFreelanceSwitch: No current jobs to process');
    return;
  }

  // End only NON-Nightclub jobs
  for (const job of currentJobs as EmploymentJobWithEstablishment[]) {
    const establishment = job.establishments[0];
    const categoryName = establishment?.category?.[0]?.name;

    if (categoryName !== 'Nightclub') {
      logger.info(`handleFreelanceSwitch: Ending non-nightclub job at "${establishment?.name}" (${categoryName})`);

      const { error: endError } = await supabase
        .from('employment_history')
        .update({
          is_current: false,
          end_date: new Date().toISOString()
        })
        .eq('id', job.id);

      if (endError) {
        logger.error(`handleFreelanceSwitch: Error ending job ${job.id}:`, endError);
      }
    } else {
      logger.info(`handleFreelanceSwitch: Keeping Nightclub job at "${establishment?.name}"`);
    }
  }
}

export const createProposal = asyncHandler(async (req: Request, res: Response) => {
  const { item_type, item_id, proposed_changes, current_values } = req.body;
  const proposed_by = req.user?.id;

  if (!proposed_by) {
    throw UnauthorizedError();
  }

  if (!item_type || !item_id || !proposed_changes) {
    throw BadRequestError('Missing required fields');
  }

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('role')
    .eq('id', proposed_by)
    .single();

  if (userError) {
    logger.error('Error fetching user role:', userError);
    throw InternalServerError('Failed to verify user role');
  }

  const isPrivileged = userData?.role === 'admin' || userData?.role === 'moderator';

  if (isPrivileged) {
    const table = item_type === 'employee' ? 'employees' : 'establishments';
    const validChanges = { ...proposed_changes };

    if (item_type === 'employee') {
      // Handle establishment change via employment_history (before deleting)
      // Check if the key exists in proposed_changes (including null/empty values)
      logger.info(`createProposal: Employee edit - current_establishment_id = ${proposed_changes.current_establishment_id}`);
      if ('current_establishment_id' in proposed_changes) {
        if (proposed_changes.current_establishment_id) {
          // New establishment selected - create new employment
          logger.info(`createProposal: Calling updateEmploymentHistory for employee ${item_id}`);
          await updateEmploymentHistory(
            item_id,
            proposed_changes.current_establishment_id,
            proposed_by,
            'Updated via edit proposal (auto-approved)'
          );
        } else {
          // Clearing establishment (null or empty) - end current employment
          logger.info(`createProposal: Clearing establishment, calling endCurrentEmployment for employee ${item_id}`);
          await endCurrentEmployment(item_id);
        }
      }
      delete validChanges.current_establishment_id;

      // Handle freelance switch - end non-nightclub jobs
      if (proposed_changes.is_freelance === true) {
        logger.info(`createProposal: Freelance switch detected, calling handleFreelanceSwitch`);
        await handleFreelanceSwitch(item_id, true);
      }
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
      throw InternalServerError('Failed to apply changes');
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
    throw InternalServerError('Failed to create proposal');
  }

  // Notify admins of new edit proposal from non-privileged user
  const { data: proposerData } = await supabase
    .from('users')
    .select('pseudonym')
    .eq('id', proposed_by)
    .single();

  const { data: entityData } = await supabase
    .from(item_type === 'employee' ? 'employees' : 'establishments')
    .select('name')
    .eq('id', item_id)
    .single();

  if (proposerData && entityData && data) {
    await notifyAdminsNewEditProposal(
      data.id,
      proposerData.pseudonym,
      item_type,
      entityData.name
    );
  }

  res.status(201).json({
    proposal: data,
    message: 'Edit proposal submitted for review',
    auto_approved: false
  });
});

export const getProposals = asyncHandler(async (req: Request, res: Response) => {
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
    throw InternalServerError('Failed to fetch proposals');
  }

  res.json({ proposals: data || [] });
});

export const getMyProposals = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    throw UnauthorizedError();
  }

  const { data, error } = await supabase
    .from('edit_proposals')
    .select('*')
    .eq('proposed_by', userId)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Error fetching user proposals:', error);
    throw InternalServerError('Failed to fetch proposals');
  }

  res.json({ proposals: data || [] });
});

export const approveProposal = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { moderator_notes } = req.body;
  const moderator_id = req.user?.id;

  if (!moderator_id) {
    throw UnauthorizedError();
  }

  const { data: proposal, error: fetchError } = await supabase
    .from('edit_proposals')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !proposal) {
    logger.error('Error fetching proposal:', fetchError);
    throw NotFoundError('Proposal not found');
  }

  if (proposal.status !== 'pending') {
    throw BadRequestError('Proposal already reviewed');
  }

  const table = proposal.item_type === 'employee' ? 'employees' : 'establishments';

  const validChanges = { ...proposal.proposed_changes };
  if (proposal.item_type === 'employee') {
    // Handle establishment change via employment_history (before deleting)
    // Check if the key exists in proposed_changes (including null/empty values)
    if ('current_establishment_id' in proposal.proposed_changes) {
      if (proposal.proposed_changes.current_establishment_id) {
        // New establishment selected - create new employment
        await updateEmploymentHistory(
          proposal.item_id,
          proposal.proposed_changes.current_establishment_id,
          moderator_id,
          'Updated via edit proposal'
        );
      } else {
        // Clearing establishment (null or empty) - end current employment
        logger.info(`approveProposal: Clearing establishment, calling endCurrentEmployment for employee ${proposal.item_id}`);
        await endCurrentEmployment(proposal.item_id);
      }
    }
    delete validChanges.current_establishment_id;

    // Handle freelance switch - end non-nightclub jobs
    if (proposal.proposed_changes.is_freelance === true) {
      logger.info(`approveProposal: Freelance switch detected, calling handleFreelanceSwitch`);
      await handleFreelanceSwitch(proposal.item_id, true);
    }
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
    throw InternalServerError('Failed to apply changes');
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
    throw InternalServerError('Failed to update proposal status');
  }

  // Notify proposer that their edit was approved
  const { data: entityData } = await supabase
    .from(proposal.item_type === 'employee' ? 'employees' : 'establishments')
    .select('name')
    .eq('id', proposal.item_id)
    .single();

  if (entityData) {
    await notifyEditProposalApproved(
      proposal.proposed_by,
      proposal.item_type,
      entityData.name
    );
  }

  res.json({ success: true, message: 'Proposal approved and changes applied' });
});

export const rejectProposal = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { moderator_notes } = req.body;
  const moderator_id = req.user?.id;

  if (!moderator_id) {
    throw UnauthorizedError();
  }

  const { data: proposal, error: fetchError } = await supabase
    .from('edit_proposals')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !proposal) {
    throw NotFoundError('Proposal not found');
  }

  if (proposal.status !== 'pending') {
    throw BadRequestError('Proposal already reviewed');
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
    throw InternalServerError('Failed to reject proposal');
  }

  // Notify proposer that their edit was rejected
  const { data: entityData } = await supabase
    .from(proposal.item_type === 'employee' ? 'employees' : 'establishments')
    .select('name')
    .eq('id', proposal.item_id)
    .single();

  if (entityData) {
    await notifyEditProposalRejected(
      proposal.proposed_by,
      proposal.item_type,
      entityData.name,
      moderator_notes || 'No reason provided'
    );
  }

  res.json({ success: true, message: 'Proposal rejected' });
});
