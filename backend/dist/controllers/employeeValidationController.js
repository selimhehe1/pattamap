"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleEmployeeVisibilityAsAdmin = exports.getAllEmployeesValidation = exports.toggleEmployeeVisibilityAsOwner = exports.getMyEmployeesValidation = exports.getMyVotes = exports.getValidationStats = exports.voteOnEmployee = void 0;
const supabase_1 = require("../config/supabase");
const logger_1 = require("../utils/logger");
/**
 * Employee Validation Controller
 * Handles community voting on employee profile existence
 * and owner/admin visibility control
 *
 * Version: v10.3
 * Date: 2025-01-19
 */
// ============================================
// VOTE WEIGHT BY XP LEVEL
// ============================================
// Higher level users have more influence on validation scores
// Levels 1-3: Standard weight (1.0x) - New users build trust
// Levels 4-7: Progressive weight (1.5x-3.0x) - Experienced users
const LEVEL_WEIGHTS = {
    1: 1.0, // Newbie (0 XP)
    2: 1.0, // Explorer (100 XP)
    3: 1.0, // Regular (300 XP)
    4: 1.5, // Insider (700 XP)
    5: 2.0, // VIP (1500 XP)
    6: 2.5, // Legend (3000 XP)
    7: 3.0 // Ambassador (6000 XP)
};
// ============================================
// PUBLIC ENDPOINTS (Community Voting)
// ============================================
/**
 * POST /api/employees/:id/validation-vote
 * Vote on employee profile existence
 * Auth: Required
 * CSRF: Required
 */
const voteOnEmployee = async (req, res) => {
    try {
        const { id: employeeId } = req.params;
        const { voteType } = req.body; // 'exists' or 'not_exists'
        const userId = req.user?.id;
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
        const { data: employee, error: employeeError } = await supabase_1.supabase
            .from('employees')
            .select('id')
            .eq('id', employeeId)
            .single();
        if (employeeError || !employee) {
            res.status(404).json({ error: 'Employee not found' });
            return;
        }
        // Insert vote (UNIQUE constraint will prevent duplicates)
        const { data: vote, error: voteError } = await supabase_1.supabase
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
            logger_1.logger.error('Error inserting vote:', voteError);
            res.status(500).json({ error: 'Failed to record vote' });
            return;
        }
        // Award +2 XP for community contribution
        await supabase_1.supabase.rpc('award_xp', {
            p_user_id: userId,
            p_xp_amount: 2,
            p_reason: 'validation_vote',
            p_entity_type: 'employee',
            p_entity_id: employeeId
        });
        // Get updated stats
        const stats = await getEmployeeValidationStats(employeeId, userId);
        logger_1.logger.info(`User ${userId} voted "${voteType}" on employee ${employeeId}`);
        res.status(201).json({
            message: 'Vote recorded successfully',
            vote,
            stats,
            xpAwarded: 2
        });
    }
    catch (error) {
        logger_1.logger.error('Error in voteOnEmployee:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.voteOnEmployee = voteOnEmployee;
/**
 * GET /api/employees/:id/validation-stats
 * Get validation statistics for an employee profile
 * Auth: Optional (returns userVote if authenticated)
 */
const getValidationStats = async (req, res) => {
    try {
        const { id: employeeId } = req.params;
        const userId = req.user?.id;
        const stats = await getEmployeeValidationStats(employeeId, userId);
        res.status(200).json(stats);
    }
    catch (error) {
        logger_1.logger.error('Error in getValidationStats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getValidationStats = getValidationStats;
/**
 * GET /api/my-validation-votes
 * Get current user's vote history
 * Auth: Required
 */
const getMyVotes = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        const { data: votes, error } = await supabase_1.supabase
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
            logger_1.logger.error('Error fetching user votes:', error);
            res.status(500).json({ error: 'Failed to fetch vote history' });
            return;
        }
        res.status(200).json({ votes });
    }
    catch (error) {
        logger_1.logger.error('Error in getMyVotes:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getMyVotes = getMyVotes;
// ============================================
// OWNER ENDPOINTS (Visibility Control)
// ============================================
/**
 * GET /api/owner/my-employees-validation
 * Get all employees from owner's establishments with validation stats
 * Auth: Required (establishment_owner)
 */
const getMyEmployeesValidation = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        // Get owner's establishments
        const { data: ownerships, error: ownershipError } = await supabase_1.supabase
            .from('establishment_owners')
            .select('establishment_id')
            .eq('user_id', userId);
        if (ownershipError) {
            logger_1.logger.error('Error fetching ownerships:', ownershipError);
            res.status(500).json({ error: 'Failed to fetch establishments' });
            return;
        }
        if (!ownerships || ownerships.length === 0) {
            res.status(200).json({ employees: [] });
            return;
        }
        const establishmentIds = ownerships.map(o => o.establishment_id);
        // Get employees from owned establishments
        const { data: employees, error: employeeError } = await supabase_1.supabase
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
            logger_1.logger.error('Error fetching employees:', employeeError);
            res.status(500).json({ error: 'Failed to fetch employees' });
            return;
        }
        // Enrich with validation stats
        const enrichedEmployees = await Promise.all((employees || []).map(async (emp) => {
            const stats = await getEmployeeValidationStats(emp.id);
            return {
                employeeId: emp.id,
                employeeName: emp.stage_name,
                photoUrl: emp.photo_url,
                establishmentId: emp.establishment_id,
                establishmentName: emp.establishments?.name,
                totalVotes: stats.totalVotes,
                existsVotes: stats.existsVotes,
                notExistsVotes: stats.notExistsVotes,
                validationPercentage: stats.validationPercentage,
                isHidden: emp.is_hidden,
                hiddenBy: emp.hidden_by,
                hiddenAt: emp.hidden_at,
                hideReason: emp.hide_reason
            };
        }));
        res.status(200).json({ employees: enrichedEmployees });
    }
    catch (error) {
        logger_1.logger.error('Error in getMyEmployeesValidation:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getMyEmployeesValidation = getMyEmployeesValidation;
/**
 * PATCH /api/owner/employees/:id/visibility
 * Toggle employee visibility (owner only for their establishments)
 * Auth: Required (establishment_owner)
 * CSRF: Required
 */
const toggleEmployeeVisibilityAsOwner = async (req, res) => {
    try {
        const { id: employeeId } = req.params;
        const { isHidden, reason } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        if (typeof isHidden !== 'boolean') {
            res.status(400).json({ error: 'isHidden must be a boolean' });
            return;
        }
        // Verify employee exists and get establishment_id
        const { data: employee, error: employeeError } = await supabase_1.supabase
            .from('employees')
            .select('id, establishment_id')
            .eq('id', employeeId)
            .single();
        if (employeeError || !employee) {
            res.status(404).json({ error: 'Employee not found' });
            return;
        }
        // Verify user owns this establishment
        const { data: ownership, error: ownershipError } = await supabase_1.supabase
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
        const updateData = {
            is_hidden: isHidden,
            hidden_by: isHidden ? userId : null,
            hidden_at: isHidden ? new Date().toISOString() : null,
            hide_reason: isHidden ? reason : null
        };
        const { error: updateError } = await supabase_1.supabase
            .from('employees')
            .update(updateData)
            .eq('id', employeeId);
        if (updateError) {
            logger_1.logger.error('Error updating employee visibility:', updateError);
            res.status(500).json({ error: 'Failed to update visibility' });
            return;
        }
        logger_1.logger.info(`Owner ${userId} set employee ${employeeId} visibility to ${isHidden}`);
        res.status(200).json({
            message: 'Visibility updated successfully',
            isHidden,
            reason
        });
    }
    catch (error) {
        logger_1.logger.error('Error in toggleEmployeeVisibilityAsOwner:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.toggleEmployeeVisibilityAsOwner = toggleEmployeeVisibilityAsOwner;
// ============================================
// ADMIN ENDPOINTS (Full Control)
// ============================================
/**
 * GET /api/admin/employees-validation
 * Get ALL employees with validation stats (admin/moderator only)
 * Auth: Required (admin/moderator)
 * Query: ?filter=contested (optional)
 */
const getAllEmployeesValidation = async (req, res) => {
    try {
        const { filter } = req.query;
        // Get all employees
        const { data: employees, error: employeeError } = await supabase_1.supabase
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
            logger_1.logger.error('Error fetching employees:', employeeError);
            res.status(500).json({ error: 'Failed to fetch employees' });
            return;
        }
        // Enrich with validation stats
        let enrichedEmployees = await Promise.all((employees || []).map(async (emp) => {
            const stats = await getEmployeeValidationStats(emp.id);
            return {
                employeeId: emp.id,
                employeeName: emp.stage_name,
                photoUrl: emp.photo_url,
                establishmentId: emp.establishment_id,
                establishmentName: emp.establishments?.name,
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
        }));
        // Apply filter if requested
        if (filter === 'contested') {
            enrichedEmployees = enrichedEmployees.filter(emp => emp.totalVotes >= 20 && emp.validationPercentage <= 50);
        }
        res.status(200).json({ employees: enrichedEmployees });
    }
    catch (error) {
        logger_1.logger.error('Error in getAllEmployeesValidation:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getAllEmployeesValidation = getAllEmployeesValidation;
/**
 * PATCH /api/admin/employees/:id/visibility
 * Toggle employee visibility (admin/moderator - any profile)
 * Auth: Required (admin/moderator)
 * CSRF: Required
 */
const toggleEmployeeVisibilityAsAdmin = async (req, res) => {
    try {
        const { id: employeeId } = req.params;
        const { isHidden, reason } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        if (typeof isHidden !== 'boolean') {
            res.status(400).json({ error: 'isHidden must be a boolean' });
            return;
        }
        // Update visibility (admin can update any profile)
        const updateData = {
            is_hidden: isHidden,
            hidden_by: isHidden ? userId : null,
            hidden_at: isHidden ? new Date().toISOString() : null,
            hide_reason: isHidden ? reason : null
        };
        const { error: updateError } = await supabase_1.supabase
            .from('employees')
            .update(updateData)
            .eq('id', employeeId);
        if (updateError) {
            logger_1.logger.error('Error updating employee visibility (admin):', updateError);
            res.status(500).json({ error: 'Failed to update visibility' });
            return;
        }
        logger_1.logger.info(`Admin ${userId} set employee ${employeeId} visibility to ${isHidden}`);
        res.status(200).json({
            message: 'Visibility updated successfully',
            isHidden,
            reason
        });
    }
    catch (error) {
        logger_1.logger.error('Error in toggleEmployeeVisibilityAsAdmin:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.toggleEmployeeVisibilityAsAdmin = toggleEmployeeVisibilityAsAdmin;
// ============================================
// HELPER FUNCTIONS
// ============================================
/**
 * Get validation statistics for an employee
 * Returns badge type, weighted counts, and user's vote if authenticated
 *
 * Vote weights are based on voter's XP level:
 * - Levels 1-3: 1.0x weight (new users)
 * - Level 4: 1.5x weight (Insider)
 * - Level 5: 2.0x weight (VIP)
 * - Level 6: 2.5x weight (Legend)
 * - Level 7: 3.0x weight (Ambassador)
 */
async function getEmployeeValidationStats(employeeId, userId) {
    // Get all votes for this employee
    const { data: votes, error } = await supabase_1.supabase
        .from('employee_existence_votes')
        .select('vote_type, user_id')
        .eq('employee_id', employeeId);
    if (error) {
        logger_1.logger.error('Error fetching validation stats:', error);
        return {
            totalVotes: 0,
            existsVotes: 0,
            notExistsVotes: 0,
            weightedExistsVotes: 0,
            weightedNotExistsVotes: 0,
            totalWeight: 0,
            validationPercentage: 0,
            badgeType: '?',
            userVote: null
        };
    }
    const totalVotes = votes?.length || 0;
    // If no votes, return early
    if (totalVotes === 0) {
        return {
            totalVotes: 0,
            existsVotes: 0,
            notExistsVotes: 0,
            weightedExistsVotes: 0,
            weightedNotExistsVotes: 0,
            totalWeight: 0,
            validationPercentage: 0,
            badgeType: '?',
            userVote: null
        };
    }
    // Get voter IDs to fetch their levels
    const voterIds = [...new Set(votes.map(v => v.user_id))];
    // Fetch voter levels from user_points
    const { data: userLevels, error: levelError } = await supabase_1.supabase
        .from('user_points')
        .select('user_id, current_level')
        .in('user_id', voterIds);
    if (levelError) {
        logger_1.logger.warn('Could not fetch user levels, using default weight:', levelError);
    }
    // Create a map of user_id -> level (default to level 1 if not found)
    const levelMap = new Map();
    if (userLevels) {
        for (const ul of userLevels) {
            levelMap.set(ul.user_id, ul.current_level || 1);
        }
    }
    // Calculate weighted votes
    let weightedExistsVotes = 0;
    let weightedNotExistsVotes = 0;
    let totalWeight = 0;
    let existsVotes = 0;
    let notExistsVotes = 0;
    for (const vote of votes) {
        const voterLevel = levelMap.get(vote.user_id) || 1;
        const weight = LEVEL_WEIGHTS[voterLevel] || 1.0;
        if (vote.vote_type === 'exists') {
            existsVotes++;
            weightedExistsVotes += weight;
        }
        else {
            notExistsVotes++;
            weightedNotExistsVotes += weight;
        }
        totalWeight += weight;
    }
    // Calculate weighted validation percentage
    const validationPercentage = totalWeight > 0
        ? (weightedExistsVotes / totalWeight) * 100
        : 0;
    // Determine badge type based on weighted percentage
    let badgeType;
    if (totalVotes < 20) {
        badgeType = '?'; // Under review (still use raw vote count for threshold)
    }
    else if (validationPercentage > 50) {
        badgeType = 'neutral'; // Positive validation
    }
    else {
        badgeType = 'warning'; // Contested profile
    }
    // Get user's vote if authenticated
    let userVote = null;
    if (userId && votes) {
        const userVoteData = votes.find(v => v.user_id === userId);
        userVote = userVoteData?.vote_type || null;
    }
    return {
        totalVotes,
        existsVotes,
        notExistsVotes,
        weightedExistsVotes: Math.round(weightedExistsVotes * 100) / 100,
        weightedNotExistsVotes: Math.round(weightedNotExistsVotes * 100) / 100,
        totalWeight: Math.round(totalWeight * 100) / 100,
        validationPercentage: Math.round(validationPercentage * 100) / 100, // 2 decimals
        badgeType,
        userVote
    };
}
//# sourceMappingURL=employeeValidationController.js.map