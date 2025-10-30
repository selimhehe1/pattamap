import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

/**
 * Employee Validation Controller
 * Handles community voting on employee profile existence
 * and owner/admin visibility control
 *
 * Version: v10.3
 * Date: 2025-01-19
 */

// ============================================
// PUBLIC ENDPOINTS (Community Voting)
// ============================================

/**
 * POST /api/employees/:id/validation-vote
 * Vote on employee profile existence
 * Auth: Required
 * CSRF: Required
 */
export const voteOnEmployee = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: employeeId } = req.params;
    const { voteType } = req.body; // 'exists' or 'not_exists'
    const userId = (req as any).user?.id;

    // Validation
    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!voteType || !['exists', 'not_exists'].includes(voteType)) {
      res.status(400).json({ error: 'Invalid vote type. Must be "exists" or "not_exists"' });
      return;
    }

    // Verify employee exists
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('id')
      .eq('id', employeeId)
      .single();

    if (employeeError || !employee) {
      res.status(404).json({ error: 'Employee not found' });
      return;
    }

    // Insert vote (UNIQUE constraint will prevent duplicates)
    const { data: vote, error: voteError } = await supabase
      .from('employee_existence_votes')
      .insert({
        employee_id: employeeId,
        user_id: userId,
        vote_type: voteType
      })
      .select()
      .single();

    if (voteError) {
      // Check if duplicate vote
      if (voteError.code === '23505') { // Unique violation
        res.status(409).json({ error: 'You have already voted on this profile' });
        return;
      }
      logger.error('Error inserting vote:', voteError);
      res.status(500).json({ error: 'Failed to record vote' });
      return;
    }

    // Award +2 XP for community contribution
    await supabase.rpc('award_xp', {
      p_user_id: userId,
      p_xp_amount: 2,
      p_reason: 'validation_vote',
      p_entity_type: 'employee',
      p_entity_id: employeeId
    });

    // Get updated stats
    const stats = await getEmployeeValidationStats(employeeId, userId);

    logger.info(`User ${userId} voted "${voteType}" on employee ${employeeId}`);
    res.status(201).json({
      message: 'Vote recorded successfully',
      vote,
      stats,
      xpAwarded: 2
    });
  } catch (error) {
    logger.error('Error in voteOnEmployee:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/employees/:id/validation-stats
 * Get validation statistics for an employee profile
 * Auth: Optional (returns userVote if authenticated)
 */
export const getValidationStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: employeeId } = req.params;
    const userId = (req as any).user?.id;

    const stats = await getEmployeeValidationStats(employeeId, userId);

    res.status(200).json(stats);
  } catch (error) {
    logger.error('Error in getValidationStats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/my-validation-votes
 * Get current user's vote history
 * Auth: Required
 */
export const getMyVotes = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { data: votes, error } = await supabase
      .from('employee_existence_votes')
      .select(`
        id,
        vote_type,
        created_at,
        employees:employee_id (
          id,
          stage_name,
          photo_url
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      logger.error('Error fetching user votes:', error);
      res.status(500).json({ error: 'Failed to fetch vote history' });
      return;
    }

    res.status(200).json({ votes });
  } catch (error) {
    logger.error('Error in getMyVotes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================
// OWNER ENDPOINTS (Visibility Control)
// ============================================

/**
 * GET /api/owner/my-employees-validation
 * Get all employees from owner's establishments with validation stats
 * Auth: Required (establishment_owner)
 */
export const getMyEmployeesValidation = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Get owner's establishments
    const { data: ownerships, error: ownershipError } = await supabase
      .from('establishment_owners')
      .select('establishment_id')
      .eq('user_id', userId);

    if (ownershipError) {
      logger.error('Error fetching ownerships:', ownershipError);
      res.status(500).json({ error: 'Failed to fetch establishments' });
      return;
    }

    if (!ownerships || ownerships.length === 0) {
      res.status(200).json({ employees: [] });
      return;
    }

    const establishmentIds = ownerships.map(o => o.establishment_id);

    // Get employees from owned establishments
    const { data: employees, error: employeeError } = await supabase
      .from('employees')
      .select(`
        id,
        stage_name,
        photo_url,
        is_hidden,
        hidden_by,
        hidden_at,
        hide_reason,
        establishment_id,
        establishments:establishment_id (
          id,
          name
        )
      `)
      .in('establishment_id', establishmentIds)
      .order('stage_name');

    if (employeeError) {
      logger.error('Error fetching employees:', employeeError);
      res.status(500).json({ error: 'Failed to fetch employees' });
      return;
    }

    // Enrich with validation stats
    const enrichedEmployees = await Promise.all(
      (employees || []).map(async (emp) => {
        const stats = await getEmployeeValidationStats(emp.id);
        return {
          employeeId: emp.id,
          employeeName: emp.stage_name,
          photoUrl: emp.photo_url,
          establishmentId: emp.establishment_id,
          establishmentName: (emp.establishments as any)?.name,
          totalVotes: stats.totalVotes,
          existsVotes: stats.existsVotes,
          notExistsVotes: stats.notExistsVotes,
          validationPercentage: stats.validationPercentage,
          isHidden: emp.is_hidden,
          hiddenBy: emp.hidden_by,
          hiddenAt: emp.hidden_at,
          hideReason: emp.hide_reason
        };
      })
    );

    res.status(200).json({ employees: enrichedEmployees });
  } catch (error) {
    logger.error('Error in getMyEmployeesValidation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * PATCH /api/owner/employees/:id/visibility
 * Toggle employee visibility (owner only for their establishments)
 * Auth: Required (establishment_owner)
 * CSRF: Required
 */
export const toggleEmployeeVisibilityAsOwner = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: employeeId } = req.params;
    const { isHidden, reason } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (typeof isHidden !== 'boolean') {
      res.status(400).json({ error: 'isHidden must be a boolean' });
      return;
    }

    // Verify employee exists and get establishment_id
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('id, establishment_id')
      .eq('id', employeeId)
      .single();

    if (employeeError || !employee) {
      res.status(404).json({ error: 'Employee not found' });
      return;
    }

    // Verify user owns this establishment
    const { data: ownership, error: ownershipError } = await supabase
      .from('establishment_owners')
      .select('id')
      .eq('user_id', userId)
      .eq('establishment_id', employee.establishment_id)
      .single();

    if (ownershipError || !ownership) {
      res.status(403).json({ error: 'You do not own this establishment' });
      return;
    }

    // Update visibility
    const updateData: any = {
      is_hidden: isHidden,
      hidden_by: isHidden ? userId : null,
      hidden_at: isHidden ? new Date().toISOString() : null,
      hide_reason: isHidden ? reason : null
    };

    const { error: updateError } = await supabase
      .from('employees')
      .update(updateData)
      .eq('id', employeeId);

    if (updateError) {
      logger.error('Error updating employee visibility:', updateError);
      res.status(500).json({ error: 'Failed to update visibility' });
      return;
    }

    logger.info(`Owner ${userId} set employee ${employeeId} visibility to ${isHidden}`);
    res.status(200).json({
      message: 'Visibility updated successfully',
      isHidden,
      reason
    });
  } catch (error) {
    logger.error('Error in toggleEmployeeVisibilityAsOwner:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================
// ADMIN ENDPOINTS (Full Control)
// ============================================

/**
 * GET /api/admin/employees-validation
 * Get ALL employees with validation stats (admin/moderator only)
 * Auth: Required (admin/moderator)
 * Query: ?filter=contested (optional)
 */
export const getAllEmployeesValidation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { filter } = req.query;

    // Get all employees
    const { data: employees, error: employeeError } = await supabase
      .from('employees')
      .select(`
        id,
        stage_name,
        photo_url,
        is_hidden,
        hidden_by,
        hidden_at,
        hide_reason,
        user_id,
        is_self_profile,
        establishment_id,
        establishments:establishment_id (
          id,
          name
        )
      `)
      .order('stage_name');

    if (employeeError) {
      logger.error('Error fetching employees:', employeeError);
      res.status(500).json({ error: 'Failed to fetch employees' });
      return;
    }

    // Enrich with validation stats
    let enrichedEmployees = await Promise.all(
      (employees || []).map(async (emp) => {
        const stats = await getEmployeeValidationStats(emp.id);
        return {
          employeeId: emp.id,
          employeeName: emp.stage_name,
          photoUrl: emp.photo_url,
          establishmentId: emp.establishment_id,
          establishmentName: (emp.establishments as any)?.name,
          totalVotes: stats.totalVotes,
          existsVotes: stats.existsVotes,
          notExistsVotes: stats.notExistsVotes,
          validationPercentage: stats.validationPercentage,
          isHidden: emp.is_hidden,
          hiddenBy: emp.hidden_by,
          hiddenAt: emp.hidden_at,
          hideReason: emp.hide_reason,
          isClaimed: !!emp.user_id || emp.is_self_profile
        };
      })
    );

    // Apply filter if requested
    if (filter === 'contested') {
      enrichedEmployees = enrichedEmployees.filter(
        emp => emp.totalVotes >= 20 && emp.validationPercentage <= 50
      );
    }

    res.status(200).json({ employees: enrichedEmployees });
  } catch (error) {
    logger.error('Error in getAllEmployeesValidation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * PATCH /api/admin/employees/:id/visibility
 * Toggle employee visibility (admin/moderator - any profile)
 * Auth: Required (admin/moderator)
 * CSRF: Required
 */
export const toggleEmployeeVisibilityAsAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: employeeId } = req.params;
    const { isHidden, reason } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (typeof isHidden !== 'boolean') {
      res.status(400).json({ error: 'isHidden must be a boolean' });
      return;
    }

    // Update visibility (admin can update any profile)
    const updateData: any = {
      is_hidden: isHidden,
      hidden_by: isHidden ? userId : null,
      hidden_at: isHidden ? new Date().toISOString() : null,
      hide_reason: isHidden ? reason : null
    };

    const { error: updateError } = await supabase
      .from('employees')
      .update(updateData)
      .eq('id', employeeId);

    if (updateError) {
      logger.error('Error updating employee visibility (admin):', updateError);
      res.status(500).json({ error: 'Failed to update visibility' });
      return;
    }

    logger.info(`Admin ${userId} set employee ${employeeId} visibility to ${isHidden}`);
    res.status(200).json({
      message: 'Visibility updated successfully',
      isHidden,
      reason
    });
  } catch (error) {
    logger.error('Error in toggleEmployeeVisibilityAsAdmin:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get validation statistics for an employee
 * Returns badge type, counts, and user's vote if authenticated
 */
async function getEmployeeValidationStats(
  employeeId: string,
  userId?: string
): Promise<{
  totalVotes: number;
  existsVotes: number;
  notExistsVotes: number;
  validationPercentage: number;
  badgeType: '?' | 'neutral' | 'warning';
  userVote: 'exists' | 'not_exists' | null;
}> {
  // Get all votes for this employee
  const { data: votes, error } = await supabase
    .from('employee_existence_votes')
    .select('vote_type, user_id')
    .eq('employee_id', employeeId);

  if (error) {
    logger.error('Error fetching validation stats:', error);
    return {
      totalVotes: 0,
      existsVotes: 0,
      notExistsVotes: 0,
      validationPercentage: 0,
      badgeType: '?',
      userVote: null
    };
  }

  const totalVotes = votes?.length || 0;
  const existsVotes = votes?.filter(v => v.vote_type === 'exists').length || 0;
  const notExistsVotes = votes?.filter(v => v.vote_type === 'not_exists').length || 0;
  const validationPercentage = totalVotes > 0 ? (existsVotes / totalVotes) * 100 : 0;

  // Determine badge type
  let badgeType: '?' | 'neutral' | 'warning';
  if (totalVotes < 20) {
    badgeType = '?'; // Under review
  } else if (validationPercentage > 50) {
    badgeType = 'neutral'; // Positive validation
  } else {
    badgeType = 'warning'; // Contested profile
  }

  // Get user's vote if authenticated
  let userVote: 'exists' | 'not_exists' | null = null;
  if (userId && votes) {
    const userVoteData = votes.find(v => v.user_id === userId);
    userVote = userVoteData?.vote_type as 'exists' | 'not_exists' || null;
  }

  return {
    totalVotes,
    existsVotes,
    notExistsVotes,
    validationPercentage: Math.round(validationPercentage * 100) / 100, // 2 decimals
    badgeType,
    userVote
  };
}
