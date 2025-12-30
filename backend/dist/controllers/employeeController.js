"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordProfileView = exports.getEmployeeReviews = exports.getEmployeeStats = exports.rejectClaimRequest = exports.approveClaimRequest = exports.getClaimRequests = exports.getMyLinkedProfile = exports.claimEmployeeProfile = exports.createOwnEmployeeProfile = exports.searchEmployees = exports.getEmployeeNameSuggestions = exports.addEmployment = exports.requestSelfRemoval = exports.deleteEmployee = exports.updateEmployee = exports.createEmployee = exports.getEmployee = exports.getEmployees = void 0;
const supabase_1 = require("../config/supabase");
const logger_1 = require("../utils/logger");
const notificationHelper_1 = require("../utils/notificationHelper");
const gamificationService_1 = require("../services/gamificationService");
const validation_1 = require("../utils/validation");
const getEmployees = async (req, res) => {
    try {
        const { status = 'approved', type = 'all', // v10.3: 'all', 'freelance', 'regular'
        search, establishment_id, nationality, age_min, age_max, zone, verified, // 🆕 v10.3: Filter by verification status
        sort_by = 'created_at', sort_order = 'desc', page = 1, limit = 20 } = req.query;
        // Build query based on parameters
        // Calculate offset for pagination
        const offset = (Number(page) - 1) * Number(limit);
        // 🆕 v10.x: Changed to LEFT join to include freelances (who have no employment_history)
        // Will filter manually after query to include: employment OR freelance
        let query = supabase_1.supabase
            .from('employees')
            .select(`
        *,
        current_employment:employment_history(
          *,
          establishment:establishments(
            *,
            category:establishment_categories(*)
          )
        )
      `, { count: 'exact' });
        // Filter by status
        if (status) {
            query = query.eq('status', status);
        }
        // 🆕 v10.3: Filter by verification status
        // Cast query param to string to avoid TypeScript type mismatch warnings
        if (verified !== undefined && verified !== null && String(verified) !== '') {
            const isVerified = String(verified) === 'true';
            query = query.eq('is_verified', isVerified);
        }
        // Advanced search functionality
        // 🔧 FIX S1: Escape LIKE wildcards to prevent pattern injection
        if (search) {
            const escapedSearch = (0, validation_1.escapeLikeWildcards)(String(search));
            query = query.or(`name.ilike.%${escapedSearch}%,nickname.ilike.%${escapedSearch}%,description.ilike.%${escapedSearch}%`);
        }
        // Filter by establishment
        if (establishment_id) {
            query = query.eq('employment_history.establishment_id', establishment_id);
        }
        // Filter by nationality
        // 🔧 FIX S1: Escape LIKE wildcards
        if (nationality) {
            const escapedNationality = (0, validation_1.escapeLikeWildcards)(String(nationality));
            query = query.ilike('nationality', `%${escapedNationality}%`);
        }
        // Filter by age range
        if (age_min) {
            query = query.gte('age', Number(age_min));
        }
        if (age_max) {
            query = query.lte('age', Number(age_max));
        }
        // Filter by zone (via establishment)
        if (zone) {
            query = query.eq('employment_history.establishment.zone', zone);
        }
        // Sorting - VIP employees ALWAYS appear first (v10.3 Phase 4)
        // Add VIP-first ordering BEFORE all other sort criteria
        query = query.order('is_vip', { ascending: false, nullsFirst: false });
        switch (sort_by) {
            case 'name':
                query = query.order('name', { ascending: sort_order === 'asc' });
                break;
            case 'age':
                query = query.order('age', {
                    ascending: sort_order === 'asc',
                    nullsFirst: false
                });
                break;
            case 'nationality':
                query = query.order('nationality', {
                    ascending: sort_order === 'asc',
                    nullsFirst: false
                });
                break;
            case 'created_at':
            default:
                query = query.order('created_at', { ascending: sort_order === 'asc' });
                break;
        }
        // Pagination
        query = query.range(offset, offset + Number(limit) - 1);
        const { data: allEmployees, error, count } = await query;
        // Process query results
        if (error) {
            logger_1.logger.error('❌ Supabase query error:', error);
            return res.status(400).json({ error: error.message });
        }
        // 🆕 v10.3: Filter by employee type (freelance vs regular)
        const employees = (allEmployees || []).filter(emp => {
            const hasCurrentEmployment = emp.current_employment?.some((ce) => ce.is_current === true);
            const isFreelance = emp.is_freelance === true;
            // Base filter: must have active position (employment OR freelance)
            const hasActivePosition = hasCurrentEmployment || isFreelance;
            if (!hasActivePosition)
                return false;
            // Type filter
            if (type === 'freelance') {
                return isFreelance;
            }
            else if (type === 'regular') {
                return !isFreelance && hasCurrentEmployment;
            }
            else { // type === 'all' or undefined
                return true;
            }
        });
        // Calculate rating averages for each employee
        const employeeIds = employees?.map(emp => emp.id) || [];
        let ratingsData = [];
        let votesData = [];
        if (employeeIds.length > 0) {
            const { data: ratings } = await supabase_1.supabase
                .from('comments')
                .select('employee_id, rating')
                .in('employee_id', employeeIds)
                .eq('status', 'approved')
                .not('rating', 'is', null);
            ratingsData = ratings || [];
            // 🆕 Get vote counts for each employee
            const { data: votes } = await supabase_1.supabase
                .from('employee_existence_votes')
                .select('employee_id')
                .in('employee_id', employeeIds);
            votesData = votes || [];
        }
        // Enrich employees with average ratings and vote counts
        const enrichedEmployees = employees?.map(employee => {
            const employeeRatings = ratingsData
                .filter(r => r.employee_id === employee.id)
                .map(r => r.rating);
            const averageRating = employeeRatings.length > 0
                ? employeeRatings.reduce((sum, rating) => sum + rating, 0) / employeeRatings.length
                : null;
            // 🆕 Count votes for this employee
            const voteCount = votesData.filter(v => v.employee_id === employee.id).length;
            return {
                ...employee,
                average_rating: averageRating,
                comment_count: employeeRatings.length,
                vote_count: voteCount
            };
        }) || [];
        // If sorting by popularity (rating), sort the enriched results
        if (sort_by === 'popularity') {
            enrichedEmployees.sort((a, b) => {
                const ratingA = a.average_rating || 0;
                const ratingB = b.average_rating || 0;
                return sort_order === 'asc' ? ratingA - ratingB : ratingB - ratingA;
            });
        }
        // Return enriched employees with ratings and employment data
        res.json({
            employees: enrichedEmployees,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total: count || 0,
                totalPages: Math.ceil((count || 0) / Number(limit)),
                hasMore: offset + Number(limit) < (count || 0)
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Get employees error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getEmployees = getEmployees;
const getEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        // Get employee with current employment
        const { data: employee, error: employeeError } = await supabase_1.supabase
            .from('employees')
            .select(`
        *,
        created_by_user:users!employees_created_by_fkey(pseudonym)
      `)
            .eq('id', id)
            .single();
        if (employeeError || !employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        // Get employment history
        const { data: employmentHistory, error: historyError } = await supabase_1.supabase
            .from('employment_history')
            .select(`
        *,
        establishment:establishments(
          *,
          category:establishment_categories(*)
        )
      `)
            .eq('employee_id', id)
            .order('start_date', { ascending: false });
        if (historyError) {
            logger_1.logger.error('Employment history error:', historyError);
        }
        // Get comments and rating statistics
        const { data: comments, error: commentsError } = await supabase_1.supabase
            .from('comments')
            .select(`
        *,
        user:users(pseudonym)
      `)
            .eq('employee_id', id)
            .eq('status', 'approved')
            .order('created_at', { ascending: false });
        if (commentsError) {
            logger_1.logger.error('Comments error:', commentsError);
        }
        // Calculate average rating
        const ratings = comments?.filter(c => c.rating).map(c => c.rating) || [];
        const averageRating = ratings.length > 0
            ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
            : null;
        // 🆕 Get vote count for this employee
        const { data: votes, error: votesError } = await supabase_1.supabase
            .from('employee_existence_votes')
            .select('id')
            .eq('employee_id', id);
        if (votesError) {
            logger_1.logger.error('Votes error:', votesError);
        }
        const voteCount = votes?.length || 0;
        // Separate current and past employment
        const currentEmployment = employmentHistory?.filter(eh => eh.is_current) || [];
        const pastEmployment = employmentHistory?.filter(eh => !eh.is_current) || [];
        const enrichedEmployee = {
            ...employee,
            current_employment: currentEmployment,
            employment_history: pastEmployment,
            comments: comments || [],
            average_rating: averageRating,
            comment_count: comments?.length || 0,
            vote_count: voteCount
        };
        res.json({ employee: enrichedEmployee });
    }
    catch (error) {
        logger_1.logger.error('Get employee error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getEmployee = getEmployee;
const createEmployee = async (req, res) => {
    try {
        const { name, nickname, age, nationality, description, photos, social_media, is_freelance, current_establishment_id, current_establishment_ids, position, start_date } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }
        // ========================================
        // v10.4 - Validate nationality array
        // ========================================
        // Nationality must be an array of strings (max 2 for "half/mixed")
        if (nationality !== undefined && nationality !== null) {
            if (!Array.isArray(nationality)) {
                return res.status(400).json({
                    error: 'Nationality must be an array',
                    code: 'INVALID_NATIONALITY_FORMAT'
                });
            }
            if (nationality.length === 0) {
                return res.status(400).json({
                    error: 'Nationality array cannot be empty (omit field if no nationality)',
                    code: 'EMPTY_NATIONALITY_ARRAY'
                });
            }
            if (nationality.length > 2) {
                return res.status(400).json({
                    error: 'Maximum 2 nationalities allowed (for half/mixed heritage)',
                    code: 'TOO_MANY_NATIONALITIES'
                });
            }
            // Validate each nationality is a non-empty string
            for (const nat of nationality) {
                if (typeof nat !== 'string' || nat.trim().length === 0) {
                    return res.status(400).json({
                        error: 'Each nationality must be a non-empty string',
                        code: 'INVALID_NATIONALITY_VALUE'
                    });
                }
            }
        }
        // ========================================
        // BUG #12 FIX - Validate image URLs
        // ========================================
        // Security: Prevent malicious URLs (XSS, invalid formats)
        const photoValidation = (0, validation_1.validateImageUrls)(photos || [], 0, 5); // Photos optional
        if (!photoValidation.valid) {
            return res.status(400).json({
                error: photoValidation.error,
                code: 'INVALID_PHOTO_URLS'
            });
        }
        // ========================================
        // v10.3 - Freelance Nightclub Validation
        // ========================================
        // Determine establishment IDs to associate
        const establishmentIds = [];
        if (current_establishment_ids && current_establishment_ids.length > 0) {
            // Freelance with multiple nightclubs
            establishmentIds.push(...current_establishment_ids);
        }
        else if (current_establishment_id) {
            // Regular employee or freelance with single nightclub
            establishmentIds.push(current_establishment_id);
        }
        // Validate freelance business rules
        const { validateFreelanceRules } = await Promise.resolve().then(() => __importStar(require('../utils/freelanceValidation')));
        const validation = await validateFreelanceRules(null, is_freelance || false, establishmentIds);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }
        // Create employee
        const { data: employee, error: employeeError } = await supabase_1.supabase
            .from('employees')
            .insert({
            name,
            nickname,
            age,
            nationality,
            description,
            photos,
            social_media,
            is_freelance: is_freelance || false, // v10.3: Support freelance flag
            status: 'pending', // All new employees need approval
            created_by: req.user.id
        })
            .select()
            .single();
        if (employeeError) {
            return res.status(400).json({ error: employeeError.message });
        }
        // ========================================
        // v10.3 - Add employment associations (single or multiple)
        // ========================================
        // Freelances can have multiple nightclub associations
        // Regular employees can only have one establishment
        if (establishmentIds.length > 0) {
            const employmentRecords = establishmentIds.map(estId => ({
                employee_id: employee.id,
                establishment_id: estId,
                position,
                start_date: start_date || new Date().toISOString().split('T')[0],
                is_current: true,
                created_by: req.user.id
            }));
            const { error: employmentError } = await supabase_1.supabase
                .from('employment_history')
                .insert(employmentRecords);
            if (employmentError) {
                logger_1.logger.error('Employment history error:', employmentError);
                // 🔧 ROLLBACK FIX: Delete employee if employment_history fails
                await supabase_1.supabase.from('employees').delete().eq('id', employee.id);
                return res.status(400).json({
                    error: 'Failed to add employment history: ' + employmentError.message
                });
            }
            logger_1.logger.info(`Created employee ${employee.id} with ${establishmentIds.length} establishment(s)`);
        }
        // Add to moderation queue
        const { error: moderationError } = await supabase_1.supabase
            .from('moderation_queue')
            .insert({
            item_type: 'employee',
            item_id: employee.id,
            submitted_by: req.user.id,
            status: 'pending'
        });
        // ========================================
        // BUG #5 FIX - Complete rollback if moderation queue fails
        // ========================================
        // Issue: If moderation_queue insert fails, employment_history becomes orphaned
        // Fix: Delete both employee AND employment_history
        if (moderationError) {
            logger_1.logger.error('Moderation queue error:', moderationError);
            logger_1.logger.warn('Rolling back employee creation (deleting employee + related records)');
            // Delete employment_history if it was created (v10.3: supports multiple)
            if (establishmentIds.length > 0) {
                await supabase_1.supabase
                    .from('employment_history')
                    .delete()
                    .eq('employee_id', employee.id);
            }
            // Delete employee (cascades to other foreign keys)
            await supabase_1.supabase.from('employees').delete().eq('id', employee.id);
            return res.status(400).json({
                error: 'Failed to submit for moderation: ' + moderationError.message
            });
        }
        // 🔔 Notify admins of new pending content
        try {
            // Get submitter pseudonym
            const { data: submitterData } = await supabase_1.supabase
                .from('users')
                .select('pseudonym')
                .eq('id', req.user.id)
                .single();
            const submitterName = submitterData?.pseudonym || 'A user';
            await (0, notificationHelper_1.notifyAdminsPendingContent)('employee', employee.name, submitterName, employee.id);
        }
        catch (notifyError) {
            // Log error but don't fail the request if notification fails
            logger_1.logger.error('Admin notification error:', notifyError);
        }
        // 🔔 Notify the creator that their profile is pending review
        try {
            await (0, notificationHelper_1.notifyUserContentPendingReview)(req.user.id, 'employee', employee.name, employee.id);
        }
        catch (notifyError) {
            logger_1.logger.error('Creator notification error:', notifyError);
        }
        // 🎮 Award XP for creating employee profile
        try {
            await (0, gamificationService_1.awardXP)(req.user.id, 20, // XP for creating employee profile
            'profile_updated', 'employee', employee.id, 'Created new employee profile');
        }
        catch (xpError) {
            logger_1.logger.error('XP award error:', xpError);
        }
        res.status(201).json({
            message: 'Employee profile submitted for approval',
            employee
        });
    }
    catch (error) {
        logger_1.logger.error('Create employee error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.createEmployee = createEmployee;
const updateEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        // Check permissions
        const { data: employee } = await supabase_1.supabase
            .from('employees')
            .select('*')
            .eq('id', id)
            .single();
        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        // Allow update if: owner (created_by), linked user (user_id), or admin/moderator
        if (employee.created_by !== req.user.id &&
            employee.user_id !== req.user.id &&
            !['admin', 'moderator'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Not authorized to update this employee' });
        }
        // ========================================
        // BUG #12 FIX - Validate image URLs (update)
        // ========================================
        // Security: Prevent malicious URLs (XSS, invalid formats)
        if (updates.photos) {
            const photoValidation = (0, validation_1.validateImageUrls)(updates.photos, 0, 5); // Photos optional
            if (!photoValidation.valid) {
                return res.status(400).json({
                    error: photoValidation.error,
                    code: 'INVALID_PHOTO_URLS'
                });
            }
        }
        // ========================================
        // v10.4 - Validate nationality array (update)
        // ========================================
        if (updates.nationality !== undefined && updates.nationality !== null) {
            if (!Array.isArray(updates.nationality)) {
                return res.status(400).json({
                    error: 'Nationality must be an array',
                    code: 'INVALID_NATIONALITY_FORMAT'
                });
            }
            if (updates.nationality.length === 0) {
                return res.status(400).json({
                    error: 'Nationality array cannot be empty (omit field to remove nationality)',
                    code: 'EMPTY_NATIONALITY_ARRAY'
                });
            }
            if (updates.nationality.length > 2) {
                return res.status(400).json({
                    error: 'Maximum 2 nationalities allowed (for half/mixed heritage)',
                    code: 'TOO_MANY_NATIONALITIES'
                });
            }
            for (const nat of updates.nationality) {
                if (typeof nat !== 'string' || nat.trim().length === 0) {
                    return res.status(400).json({
                        error: 'Each nationality must be a non-empty string',
                        code: 'INVALID_NATIONALITY_VALUE'
                    });
                }
            }
        }
        // ========================================
        // v10.3 - Handle freelance and establishment updates
        // ========================================
        const { current_establishment_id, current_establishment_ids, ...employeeUpdates } = updates;
        // Determine if employee is/will be freelance
        const isFreelance = updates.is_freelance !== undefined ? updates.is_freelance : employee.is_freelance;
        // Determine establishment IDs to associate
        const newEstablishmentIds = [];
        if (current_establishment_ids && current_establishment_ids.length > 0) {
            // Freelance with multiple nightclubs (array provided)
            newEstablishmentIds.push(...current_establishment_ids);
        }
        else if (current_establishment_id !== undefined) {
            // Single establishment (could be null to remove all)
            if (current_establishment_id) {
                newEstablishmentIds.push(current_establishment_id);
            }
            // If current_establishment_id is null/empty, newEstablishmentIds stays empty (remove all)
        }
        // Validate freelance business rules if establishments are being updated
        if (current_establishment_id !== undefined || current_establishment_ids !== undefined) {
            const { validateFreelanceRules } = await Promise.resolve().then(() => __importStar(require('../utils/freelanceValidation')));
            const validation = await validateFreelanceRules(id, isFreelance, newEstablishmentIds);
            if (!validation.valid) {
                return res.status(400).json({ error: validation.error });
            }
            // Update employment associations
            // 1. Deactivate all current employment
            const { error: deactivateError } = await supabase_1.supabase
                .from('employment_history')
                .update({ is_current: false, end_date: new Date().toISOString().split('T')[0] })
                .eq('employee_id', id)
                .eq('is_current', true);
            if (deactivateError) {
                logger_1.logger.error('Failed to deactivate employment history:', deactivateError);
                // Don't fail the request, just log the error
            }
            // 2. Create new employment associations
            if (newEstablishmentIds.length > 0) {
                const employmentRecords = newEstablishmentIds.map(estId => ({
                    employee_id: id,
                    establishment_id: estId,
                    start_date: new Date().toISOString().split('T')[0],
                    is_current: true,
                    created_by: req.user.id
                }));
                const { error: createError } = await supabase_1.supabase
                    .from('employment_history')
                    .insert(employmentRecords);
                if (createError) {
                    logger_1.logger.error('Failed to create employment history:', createError);
                    return res.status(400).json({ error: 'Failed to update establishments: ' + createError.message });
                }
                logger_1.logger.info(`Employee ${id} updated with ${newEstablishmentIds.length} establishment(s)`);
            }
            else {
                logger_1.logger.info(`Employee ${id} removed from all establishments (free freelance or no employment)`);
            }
        }
        // ========================================
        // BUG #4 FIX - Enforce moderation for all non-admin updates
        // ========================================
        // Security Issue (v10.2): Linked users (user_id) could bypass moderation
        // This allowed malicious employees to update profiles with inappropriate content
        // Fix: All non-admin updates now require re-moderation for security
        // Note: Admins can still approve instantly if needed
        if (req.user.role !== 'admin') {
            employeeUpdates.status = 'pending';
            logger_1.logger.info(`Employee ${id} update requires moderation (non-admin user)`);
        }
        const { data: updatedEmployee, error } = await supabase_1.supabase
            .from('employees')
            .update(employeeUpdates)
            .eq('id', id)
            .select()
            .single();
        if (error) {
            return res.status(400).json({ error: error.message });
        }
        // Notify followers of profile updates
        try {
            // Get all users who favorited this employee
            const { data: followers } = await supabase_1.supabase
                .from('user_favorites')
                .select('user_id')
                .eq('employee_id', id);
            const followerIds = followers?.map(f => f.user_id) || [];
            if (followerIds.length > 0 && updatedEmployee) {
                // Determine update type based on what changed
                let updateType = null;
                // Photos update
                if (updates.photos && updates.photos !== employee.photos) {
                    updateType = 'photos';
                }
                // Position changes (establishment or freelance mode)
                else if (current_establishment_id !== undefined || updates.is_freelance !== undefined) {
                    updateType = 'position';
                }
                // Profile info updates (name, nickname, age, nationality, description, social_media)
                else if (updates.name || updates.nickname || updates.age !== undefined ||
                    updates.nationality || updates.description || updates.social_media) {
                    updateType = 'profile';
                }
                // Send notification if we detected a meaningful update
                if (updateType) {
                    await (0, notificationHelper_1.notifyEmployeeUpdate)(followerIds, updatedEmployee.name, updateType, id);
                }
            }
        }
        catch (notifyError) {
            // Log error but don't fail the request if notification fails
            logger_1.logger.error('Employee update notification error:', notifyError);
        }
        res.json({
            message: 'Employee updated successfully',
            employee: updatedEmployee
        });
    }
    catch (error) {
        logger_1.logger.error('Update employee error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.updateEmployee = updateEmployee;
const deleteEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        // Check permissions
        const { data: employee } = await supabase_1.supabase
            .from('employees')
            .select('created_by')
            .eq('id', id)
            .single();
        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        if (employee.created_by !== req.user.id && !['admin', 'moderator'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Not authorized to delete this employee' });
        }
        const { error } = await supabase_1.supabase
            .from('employees')
            .delete()
            .eq('id', id);
        if (error) {
            return res.status(400).json({ error: error.message });
        }
        res.json({ message: 'Employee deleted successfully' });
    }
    catch (error) {
        logger_1.logger.error('Delete employee error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.deleteEmployee = deleteEmployee;
const requestSelfRemoval = async (req, res) => {
    try {
        const { id } = req.params;
        const { verification_info } = req.body;
        if (!verification_info) {
            return res.status(400).json({ error: 'Verification information required for self-removal' });
        }
        const { data: employee, error } = await supabase_1.supabase
            .from('employees')
            .update({
            self_removal_requested: true,
            updated_at: new Date().toISOString()
        })
            .eq('id', id)
            .select()
            .single();
        if (error) {
            return res.status(400).json({ error: error.message });
        }
        // TODO: Send notification to admins about self-removal request
        // This could be implemented with email notifications or admin dashboard alerts
        res.json({
            message: 'Self-removal request submitted. Administrators will review your request.',
            employee
        });
    }
    catch (error) {
        logger_1.logger.error('Self removal request error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.requestSelfRemoval = requestSelfRemoval;
const addEmployment = async (req, res) => {
    try {
        const { id } = req.params;
        const { establishment_id, position, start_date, end_date } = req.body;
        if (!establishment_id || !start_date) {
            return res.status(400).json({ error: 'Establishment and start date are required' });
        }
        // If this is a current position, mark other positions as not current
        const is_current = !end_date;
        if (is_current) {
            await supabase_1.supabase
                .from('employment_history')
                .update({ is_current: false })
                .eq('employee_id', id)
                .eq('is_current', true);
        }
        const { data: employment, error } = await supabase_1.supabase
            .from('employment_history')
            .insert({
            employee_id: id,
            establishment_id,
            position,
            start_date,
            end_date,
            is_current,
            created_by: req.user.id
        })
            .select(`
        *,
        establishment:establishments(
          *,
          category:establishment_categories(*)
        )
      `)
            .single();
        if (error) {
            return res.status(400).json({ error: error.message });
        }
        res.status(201).json({
            message: 'Employment added successfully',
            employment
        });
    }
    catch (error) {
        logger_1.logger.error('Add employment error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.addEmployment = addEmployment;
const suggestionCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes TTL
const MAX_CACHE_SIZE = 1000; // 🔧 FIX S2: Limit cache size to prevent memory leak
/**
 * 🔧 FIX S2: Simple LRU eviction - removes oldest entries when cache is full
 */
const evictOldestCacheEntries = () => {
    if (suggestionCache.size <= MAX_CACHE_SIZE)
        return;
    // Convert to array, sort by timestamp, keep only newest MAX_CACHE_SIZE entries
    const entries = Array.from(suggestionCache.entries())
        .sort((a, b) => b[1].timestamp - a[1].timestamp) // newest first
        .slice(0, MAX_CACHE_SIZE);
    suggestionCache.clear();
    entries.forEach(([key, value]) => suggestionCache.set(key, value));
    logger_1.logger.debug(`🧹 Cache eviction: reduced to ${suggestionCache.size} entries`);
};
const getEmployeeNameSuggestions = async (req, res) => {
    try {
        const { q } = req.query;
        logger_1.logger.debug(`🔍 Autocomplete request: "${q}"`); // Debug log
        if (!q || typeof q !== 'string' || q.length < 1) {
            return res.json({ suggestions: [] });
        }
        const searchTerm = q.trim().toLowerCase();
        const cacheKey = searchTerm;
        // 🔍 Check cache first
        const cached = suggestionCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
            logger_1.logger.debug(`📦 Cache HIT for "${searchTerm}"`);
            return res.json({ suggestions: cached.suggestions });
        }
        logger_1.logger.debug(`🔍 Cache MISS for "${searchTerm}" - Fetching from DB`);
        // 🚀 Méthode optimisée Supabase avec double requête parallèle
        // 🔧 FIX S1: Escape LIKE wildcards to prevent pattern injection
        const escapedSearchTerm = (0, validation_1.escapeLikeWildcards)(searchTerm);
        const [namesQuery, nicknamesQuery] = await Promise.all([
            supabase_1.supabase
                .from('employees')
                .select('name')
                .eq('status', 'approved')
                .like('name', `%${escapedSearchTerm}%`)
                .not('name', 'is', null)
                .limit(8),
            supabase_1.supabase
                .from('employees')
                .select('nickname')
                .eq('status', 'approved')
                .like('nickname', `%${escapedSearchTerm}%`)
                .not('nickname', 'is', null)
                .limit(8)
        ]);
        if (namesQuery.error || nicknamesQuery.error) {
            logger_1.logger.error('🔍 Query errors:', {
                namesError: namesQuery.error,
                nicknamesError: nicknamesQuery.error
            });
            return res.status(400).json({
                error: namesQuery.error?.message || nicknamesQuery.error?.message
            });
        }
        logger_1.logger.debug(`🔍 Query results for "${searchTerm}":`, {
            namesData: namesQuery.data,
            nicknamesData: nicknamesQuery.data,
            namesCount: namesQuery.data?.length || 0,
            nicknamesCount: nicknamesQuery.data?.length || 0
        });
        // Collecte optimisée des suggestions uniques
        const suggestions = new Set();
        // Ajouter noms
        namesQuery.data?.forEach(emp => {
            if (emp.name)
                suggestions.add(emp.name);
        });
        // Ajouter nicknames
        nicknamesQuery.data?.forEach(emp => {
            if (emp.nickname)
                suggestions.add(emp.nickname);
        });
        // Tri intelligent avec priorité aux matches exacts
        const sortedSuggestions = Array.from(suggestions)
            .sort((a, b) => {
            const aLower = a.toLowerCase();
            const bLower = b.toLowerCase();
            const aExact = aLower.startsWith(searchTerm);
            const bExact = bLower.startsWith(searchTerm);
            // Priorité 1: Match exact au début
            if (aExact && !bExact)
                return -1;
            if (!aExact && bExact)
                return 1;
            // Priorité 2: Alphabétique
            return a.localeCompare(b);
        })
            .slice(0, 10);
        // 📦 Cache les résultats
        const finalSuggestions = sortedSuggestions;
        suggestionCache.set(cacheKey, {
            suggestions: finalSuggestions,
            timestamp: Date.now()
        });
        // 🔧 FIX S2: Evict old entries if cache is full
        evictOldestCacheEntries();
        logger_1.logger.debug(`✅ Returning ${finalSuggestions.length} suggestions for "${searchTerm}"`);
        res.json({ suggestions: finalSuggestions });
    }
    catch (error) {
        logger_1.logger.error('❌ Get name suggestions error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getEmployeeNameSuggestions = getEmployeeNameSuggestions;
const searchEmployees = async (req, res) => {
    try {
        const { q: searchQuery, type, // 🆕 v10.3 - Employee type filter (all/freelance/regular)
        nationality, age_min, age_max, zone, establishment_id, category_id, is_verified, sort_by = 'relevance', sort_order = 'desc', page: rawPage = 1, limit: rawLimit = 20, 
        // 🆕 v11.0 - Advanced filters
        languages, // Comma-separated: "Thai,English"
        min_rating, // "1"-"5" minimum average rating
        has_photos, // "true" - filter employees with photos
        social_media // Comma-separated: "instagram,line,whatsapp"
         } = req.query;
        // 🔧 FIX S3: Validate and sanitize pagination parameters
        const page = Math.max(1, Number(rawPage) || 1);
        const limit = Math.min(100, Math.max(1, Number(rawLimit) || 20));
        // Calculate offset for pagination
        const offset = (page - 1) * limit;
        // If zone filter is provided, filter will be applied after query (to include freelances)
        let normalizedZoneFilter = null;
        if (zone) {
            // Normalize zone for search: remove spaces and lowercase
            normalizedZoneFilter = String(zone).toLowerCase().replace(/\s+/g, '');
        }
        // Query to get all employees (with establishments or freelance)
        let query = supabase_1.supabase
            .from('employees')
            .select(`
        *,
        current_employment:employment_history!left(
          *,
          establishment:establishments(
            *,
            category:establishment_categories(*)
          )
        ),
        independent_position:independent_positions!left(*)
      `)
            .eq('status', 'approved');
        // Text search with ranking
        // 🔧 FIX S1: Escape LIKE wildcards to prevent pattern injection
        if (searchQuery) {
            const searchTerm = (0, validation_1.escapeLikeWildcards)(String(searchQuery).trim());
            // Use full-text search for better relevance
            // NOTE v10.4: Nationality removed from full-text search (now TEXT[] array)
            // Exact nationality match available via nationality filter parameter below
            query = query.or(`name.ilike.%${searchTerm}%,nickname.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
        }
        // Nationality filter (exact match in array)
        // v10.4: Nationality is now TEXT[] array, use contains operator for exact match
        if (nationality) {
            // Check if nationality array contains the specified value (case-sensitive exact match)
            query = query.contains('nationality', [nationality]);
        }
        // Age range filter
        if (age_min) {
            query = query.gte('age', Number(age_min));
        }
        if (age_max) {
            query = query.lte('age', Number(age_max));
        }
        // Verified filter (v10.3)
        if (is_verified === 'true') {
            query = query.eq('is_verified', true);
        }
        // Note: establishment_id, category_id, and zone filters are applied after query
        // to properly handle freelances (who don't have employment_history)
        // VIP-first ordering - VIP employees ALWAYS appear first (v10.3 Phase 4)
        query = query.order('is_vip', { ascending: false, nullsFirst: false });
        // Base sorting (before popularity calculations)
        if (sort_by !== 'popularity' && sort_by !== 'relevance') {
            switch (sort_by) {
                case 'name':
                    query = query.order('name', { ascending: sort_order === 'asc' });
                    break;
                case 'age':
                    query = query.order('age', {
                        ascending: sort_order === 'asc',
                        nullsFirst: false
                    });
                    break;
                case 'nationality':
                    query = query.order('nationality', {
                        ascending: sort_order === 'asc',
                        nullsFirst: false
                    });
                    break;
                case 'newest':
                    query = query.order('created_at', { ascending: false });
                    break;
                case 'oldest':
                    query = query.order('created_at', { ascending: true });
                    break;
            }
        }
        // Execute query (without pagination yet - will filter and paginate manually)
        const { data: allEmployees, error } = await query;
        if (error) {
            return res.status(400).json({ error: error.message });
        }
        // ✅ Filter employees - Accept ALL approved employees by default (no strict position requirement)
        const filteredEmployees = (allEmployees || []).filter(emp => {
            // Identify positions for optional filters
            const hasCurrentEmployment = emp.current_employment?.some((ce) => ce.is_current === true);
            const currentEmp = emp.current_employment?.find((ce) => ce.is_current === true);
            const hasActiveFreelance = emp.independent_position?.some((ip) => ip.is_active === true);
            const isSimpleFreelance = emp.is_freelance === true; // 🆕 v10.x - Simple freelance (no map position)
            // 🆕 v10.3 - Employee Type Filter (optional - only applied if specified)
            if (type && type !== 'all') {
                const isFreelance = hasActiveFreelance || isSimpleFreelance;
                const isRegular = hasCurrentEmployment;
                if (type === 'freelance' && !isFreelance) {
                    return false; // User wants freelances only, but this is a regular employee
                }
                if (type === 'regular' && !isRegular) {
                    return false; // User wants regular employees only, but this is a freelance
                }
            }
            // Category filter (optional - only applied if employee has current employment)
            if (category_id) {
                if (!currentEmp) {
                    return false; // Skip employees without current employment when category filter is active
                }
                const establishmentCategoryId = currentEmp?.establishment?.category_id;
                const categoryMatches = establishmentCategoryId === Number(category_id);
                if (!categoryMatches) {
                    return false;
                }
            }
            // Establishment filter (optional - only applied if employee has current employment)
            if (establishment_id) {
                if (!currentEmp) {
                    return false; // Skip employees without current employment when establishment filter is active
                }
                const establishmentMatches = currentEmp?.establishment_id === establishment_id;
                if (!establishmentMatches) {
                    return false;
                }
            }
            // Zone filter (optional - works with current employment OR freelance)
            if (normalizedZoneFilter) {
                const establishmentZone = currentEmp?.establishment?.zone?.toLowerCase().replace(/\s+/g, '');
                const freelanceZone = emp.independent_position?.[0]?.zone?.toLowerCase().replace(/\s+/g, '');
                const simpleFreelanceZone = emp.is_freelance ? emp.freelance_zone?.toLowerCase().replace(/\s+/g, '') : null; // 🆕 v10.x
                const matchesZone = establishmentZone === normalizedZoneFilter ||
                    freelanceZone === normalizedZoneFilter ||
                    simpleFreelanceZone === normalizedZoneFilter;
                if (!matchesZone) {
                    return false;
                }
            }
            // 🆕 v11.0 - Languages filter (check if employee speaks any of the requested languages)
            if (languages && String(languages).trim()) {
                const requestedLanguages = String(languages).split(',').map(l => l.trim().toLowerCase());
                const employeeLanguages = Array.isArray(emp.languages_spoken)
                    ? emp.languages_spoken.map((l) => l.toLowerCase())
                    : [];
                // Employee must speak at least one of the requested languages
                const speaksAnyLanguage = requestedLanguages.some(lang => employeeLanguages.some((empLang) => empLang.includes(lang) || lang.includes(empLang)));
                if (!speaksAnyLanguage) {
                    return false;
                }
            }
            // 🆕 v11.0 - Has photos filter
            if (has_photos === 'true') {
                const hasPhotos = Array.isArray(emp.photos) && emp.photos.length > 0;
                if (!hasPhotos) {
                    return false;
                }
            }
            // 🆕 v11.0 - Social media filter (check if employee has any of the requested platforms)
            if (social_media && String(social_media).trim()) {
                const requestedPlatforms = String(social_media).split(',').map(p => p.trim().toLowerCase());
                const employeeSocials = emp.social_media || {};
                // Employee must have at least one of the requested social platforms
                const hasAnySocial = requestedPlatforms.some(platform => {
                    const value = employeeSocials[platform];
                    return value && String(value).trim() !== '';
                });
                if (!hasAnySocial) {
                    return false;
                }
            }
            return true; // ✅ Accept by default - all approved employees are shown
        });
        logger_1.logger.debug(`📊 Filtered ${filteredEmployees.length} employees from ${allEmployees?.length || 0} total`);
        // 🆕 v11.0 - Min rating filter requires pre-calculating ALL ratings before pagination
        let employeesToProcess = filteredEmployees;
        let totalFiltered = filteredEmployees.length;
        // If min_rating filter is set, we need to calculate ratings for ALL employees first
        if (min_rating && Number(min_rating) > 0) {
            const allEmployeeIds = filteredEmployees.map(emp => emp.id);
            // Get ALL ratings to filter by min_rating
            const { data: allRatings } = await supabase_1.supabase
                .from('comments')
                .select('employee_id, rating')
                .in('employee_id', allEmployeeIds)
                .eq('status', 'approved')
                .not('rating', 'is', null);
            // Calculate average ratings for each employee
            const ratingsByEmployee = new Map();
            (allRatings || []).forEach(r => {
                if (!ratingsByEmployee.has(r.employee_id)) {
                    ratingsByEmployee.set(r.employee_id, []);
                }
                ratingsByEmployee.get(r.employee_id).push(r.rating);
            });
            // Filter by min_rating
            const minRatingValue = Number(min_rating);
            employeesToProcess = filteredEmployees.filter(emp => {
                const ratings = ratingsByEmployee.get(emp.id) || [];
                if (ratings.length === 0)
                    return false; // No ratings = doesn't meet minimum
                const avgRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
                return avgRating >= minRatingValue;
            });
            totalFiltered = employeesToProcess.length;
            logger_1.logger.debug(`📊 After min_rating filter (>=${minRatingValue}): ${totalFiltered} employees`);
        }
        // Manual pagination (after min_rating filter if applied)
        const employees = employeesToProcess.slice(offset, offset + limit);
        // Get ratings for popularity sorting and enrichment (for current page only)
        const employeeIds = employees?.map(emp => emp.id) || [];
        let ratingsData = [];
        let votesData = [];
        if (employeeIds.length > 0) {
            const { data: ratings } = await supabase_1.supabase
                .from('comments')
                .select('employee_id, rating, created_at')
                .in('employee_id', employeeIds)
                .eq('status', 'approved')
                .not('rating', 'is', null);
            ratingsData = ratings || [];
            // 🆕 Get vote counts for each employee
            const { data: votes } = await supabase_1.supabase
                .from('employee_existence_votes')
                .select('employee_id')
                .in('employee_id', employeeIds);
            votesData = votes || [];
        }
        // Enrich employees with ratings and calculate relevance score
        const enrichedEmployees = employees?.map(employee => {
            const employeeRatings = ratingsData
                .filter(r => r.employee_id === employee.id)
                .map(r => r.rating);
            const averageRating = employeeRatings.length > 0
                ? employeeRatings.reduce((sum, rating) => sum + rating, 0) / employeeRatings.length
                : 0;
            // Calculate relevance score for search
            let relevanceScore = 0;
            if (searchQuery) {
                const searchTerm = String(searchQuery).toLowerCase();
                const name = employee.name?.toLowerCase() || '';
                const nickname = employee.nickname?.toLowerCase() || '';
                const description = employee.description?.toLowerCase() || '';
                // 🐛 FIX: nationality is now TEXT[] array, not string
                const nationalityArray = Array.isArray(employee.nationality) ? employee.nationality : [];
                const nationalityStr = nationalityArray.join(' ').toLowerCase();
                // Exact name match gets highest score
                if (name === searchTerm)
                    relevanceScore += 100;
                else if (name.includes(searchTerm))
                    relevanceScore += 50;
                // Nickname matches
                if (nickname === searchTerm)
                    relevanceScore += 80;
                else if (nickname.includes(searchTerm))
                    relevanceScore += 40;
                // Description matches
                if (description.includes(searchTerm))
                    relevanceScore += 20;
                // Nationality matches (now searches in joined array)
                if (nationalityStr.includes(searchTerm))
                    relevanceScore += 30;
                // Boost score based on rating and number of reviews
                relevanceScore += (averageRating * 5) + (employeeRatings.length * 2);
            }
            // 🆕 v10.3 Phase 4 - VIP & Verified Boost
            // Priority order: Verified > VIP (VIP system currently disabled visually)
            const isVIPActive = employee.is_vip &&
                employee.vip_expires_at &&
                new Date(employee.vip_expires_at) > new Date();
            const isVerified = employee.is_verified === true;
            // Boost hierarchy for relevance ranking
            // Verified takes absolute priority - boost must be higher than max possible non-verified score
            // Max non-verified score: ~100 (name match) + 50 (desc) + 30 (nationality) + 50 (rating 5*10) + 20 (10 reviews) = ~250
            // So verified boost must be > 250 to guarantee verified always appears first
            if (isVerified && isVIPActive) {
                // Verified + VIP: Maximum priority
                relevanceScore += 1000;
            }
            else if (isVerified) {
                // Verified only: Absolute priority over non-verified
                relevanceScore += 500;
            }
            else if (isVIPActive) {
                // VIP only: Small boost (VIP hidden in UI anyway)
                relevanceScore += 10;
            }
            // No boost for non-verified, non-VIP profiles
            // 🆕 Count votes for this employee
            const voteCount = votesData.filter(v => v.employee_id === employee.id).length;
            return {
                ...employee,
                average_rating: averageRating,
                comment_count: employeeRatings.length,
                vote_count: voteCount,
                relevance_score: relevanceScore
            };
        }) || [];
        // Apply sorting for popularity and relevance
        if (sort_by === 'popularity') {
            enrichedEmployees.sort((a, b) => {
                // 🆕 v10.3 Phase 4 - VIP gets +50% popularity boost
                const isVIPActiveA = a.is_vip && a.vip_expires_at && new Date(a.vip_expires_at) > new Date();
                const isVIPActiveB = b.is_vip && b.vip_expires_at && new Date(b.vip_expires_at) > new Date();
                const baseScoreA = (a.average_rating || 0) * 10 + (a.comment_count || 0);
                const baseScoreB = (b.average_rating || 0) * 10 + (b.comment_count || 0);
                const scoreA = isVIPActiveA ? baseScoreA * 1.5 : baseScoreA; // +50% boost
                const scoreB = isVIPActiveB ? baseScoreB * 1.5 : baseScoreB;
                return sort_order === 'asc' ? scoreA - scoreB : scoreB - scoreA;
            });
        }
        else if (sort_by === 'relevance') {
            // Sort by relevance_score (includes VIP/Verified boosts + text search matching)
            enrichedEmployees.sort((a, b) => {
                return (b.relevance_score || 0) - (a.relevance_score || 0);
            });
        }
        else if (sort_by === 'name') {
            // Re-apply name sorting after enrichment to ensure proper order
            enrichedEmployees.sort((a, b) => {
                const nameA = (a.name || '').toLowerCase();
                const nameB = (b.name || '').toLowerCase();
                if (sort_order === 'asc') {
                    return nameA.localeCompare(nameB);
                }
                else {
                    return nameB.localeCompare(nameA);
                }
            });
        }
        else if (sort_by === 'age') {
            // Re-apply age sorting after enrichment to ensure proper order
            enrichedEmployees.sort((a, b) => {
                const ageA = a.age || 0;
                const ageB = b.age || 0;
                return sort_order === 'asc' ? ageA - ageB : ageB - ageA;
            });
        }
        else if (sort_by === 'nationality') {
            // Re-apply nationality sorting after enrichment to ensure proper order
            // v10.4: Nationality is now TEXT[] array, sort by first nationality
            enrichedEmployees.sort((a, b) => {
                const nationalityA = (Array.isArray(a.nationality) && a.nationality.length > 0 ? a.nationality[0] : '').toLowerCase();
                const nationalityB = (Array.isArray(b.nationality) && b.nationality.length > 0 ? b.nationality[0] : '').toLowerCase();
                if (sort_order === 'asc') {
                    return nationalityA.localeCompare(nationalityB);
                }
                else {
                    return nationalityB.localeCompare(nationalityA);
                }
            });
        }
        else if (sort_by === 'newest') {
            // Re-apply newest sorting after enrichment to ensure proper order
            enrichedEmployees.sort((a, b) => {
                const dateA = new Date(a.created_at || 0).getTime();
                const dateB = new Date(b.created_at || 0).getTime();
                return dateB - dateA; // Newest first (descending)
            });
        }
        else if (sort_by === 'oldest') {
            // Re-apply oldest sorting after enrichment to ensure proper order
            enrichedEmployees.sort((a, b) => {
                const dateA = new Date(a.created_at || 0).getTime();
                const dateB = new Date(b.created_at || 0).getTime();
                return dateA - dateB; // Oldest first (ascending)
            });
        }
        // 🆕 v10.3 Phase 4 - VIP Priority Sorting (DISABLED)
        // VIP system is visually disabled in UI, so we use relevance score instead
        // The relevance_score already includes verified boost (+500) which takes priority
        // Keeping this comment for when VIP system is re-enabled
        // enrichedEmployees.sort((a, b) => {
        //   const isVIPActiveA = a.is_vip && a.vip_expires_at && new Date(a.vip_expires_at) > new Date();
        //   const isVIPActiveB = b.is_vip && b.vip_expires_at && new Date(b.vip_expires_at) > new Date();
        //   if (isVIPActiveA && !isVIPActiveB) return -1;
        //   if (!isVIPActiveA && isVIPActiveB) return 1;
        //   return 0;
        // });
        // Get available filters for suggestions - PARALLELIZED for performance
        // v10.4: Nationality is now TEXT[] array, flatten to get unique values
        const [nationalitiesResult, zonesResult, establishmentsResult, categoriesResult] = await Promise.all([
            supabase_1.supabase
                .from('employees')
                .select('nationality')
                .eq('status', 'approved')
                .not('nationality', 'is', null),
            supabase_1.supabase
                .from('establishments')
                .select('zone')
                .not('zone', 'is', null),
            supabase_1.supabase
                .from('establishments')
                .select('id, name, zone')
                .eq('status', 'approved')
                .order('name'),
            supabase_1.supabase
                .from('establishment_categories')
                .select('id, name, icon')
                .order('name')
        ]);
        // Flatten nationality arrays and get unique values
        const availableNationalities = Array.from(new Set(nationalitiesResult.data?.flatMap(n => Array.isArray(n.nationality) ? n.nationality : []).filter(Boolean) || [])).sort();
        // Get available zones
        const availableZones = Array.from(new Set(zonesResult.data?.map(z => z.zone?.toLowerCase().replace(/\s+/g, '')).filter(Boolean) || [])).sort();
        // Get available establishments with zone info
        const availableEstablishments = establishmentsResult.data || [];
        // Get available categories
        const availableCategories = categoriesResult.data || [];
        // ========================================
        // BUG #10 FIX - Standardize response structure
        // ========================================
        // Use 'employees' (consistent with GET /api/employees) instead of 'data'
        res.json({
            employees: enrichedEmployees, // Standardized field name
            total: totalFiltered,
            page: Number(page),
            limit: Number(limit),
            hasMore: offset + Number(limit) < totalFiltered,
            filters: {
                availableNationalities,
                availableZones,
                availableEstablishments,
                availableCategories,
                searchQuery: searchQuery || null,
                appliedFilters: {
                    nationality,
                    age_min: age_min ? Number(age_min) : null,
                    age_max: age_max ? Number(age_max) : null,
                    zone,
                    establishment_id,
                    category_id
                }
            },
            sorting: {
                sort_by,
                sort_order,
                availableSorts: [
                    { value: 'relevance', label: 'Most Relevant' },
                    { value: 'popularity', label: 'Most Popular' },
                    { value: 'newest', label: 'Newest' },
                    { value: 'oldest', label: 'Oldest' },
                    { value: 'name', label: 'Name A-Z' },
                    { value: 'age', label: 'Age' },
                    { value: 'nationality', label: 'Nationality' }
                ]
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Search employees error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.searchEmployees = searchEmployees;
// ==========================================
// 🆕 EMPLOYEE CLAIM SYSTEM (v10.0)
// ==========================================
/**
 * Create own employee profile (self-managed)
 * User creates their own employee profile, automatically linked to their account
 * Requires account_type = 'employee'
 */
const createOwnEmployeeProfile = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
        }
        // Check if user already has a linked employee profile
        const { data: existingUser } = await supabase_1.supabase
            .from('users')
            .select('linked_employee_id, account_type')
            .eq('id', req.user.id)
            .single();
        if (existingUser?.linked_employee_id) {
            return res.status(409).json({
                error: 'You already have a linked employee profile',
                code: 'ALREADY_LINKED',
                employee_id: existingUser.linked_employee_id
            });
        }
        const { name, nickname, age, nationality, description, photos, social_media, current_establishment_id, position, start_date } = req.body;
        // Validation
        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }
        if (photos && photos.length > 5) {
            return res.status(400).json({ error: 'Maximum 5 photos allowed' });
        }
        // Create employee with self-profile flag and user link
        const { data: employee, error: employeeError } = await supabase_1.supabase
            .from('employees')
            .insert({
            name,
            nickname,
            age,
            nationality,
            description,
            photos,
            social_media,
            status: 'pending', // Needs moderation approval
            created_by: req.user.id,
            user_id: req.user.id, // Link to user account
            is_self_profile: true // Mark as self-managed
        })
            .select()
            .single();
        if (employeeError) {
            logger_1.logger.error('Create self-profile error:', employeeError);
            return res.status(400).json({ error: employeeError.message });
        }
        // Update user account to link employee and set account_type
        const { error: userUpdateError } = await supabase_1.supabase
            .from('users')
            .update({
            linked_employee_id: employee.id,
            account_type: 'employee'
        })
            .eq('id', req.user.id);
        if (userUpdateError) {
            logger_1.logger.error('Update user link error:', userUpdateError);
            // Rollback: delete employee if user update fails
            await supabase_1.supabase.from('employees').delete().eq('id', employee.id);
            return res.status(500).json({ error: 'Failed to link profile to account' });
        }
        // Add employment/freelance position if provided
        if (current_establishment_id) {
            const { error: employmentError } = await supabase_1.supabase
                .from('employment_history')
                .insert({
                employee_id: employee.id,
                establishment_id: current_establishment_id,
                position,
                start_date: start_date || new Date().toISOString().split('T')[0],
                is_current: true,
                created_by: req.user.id
            });
            if (employmentError) {
                logger_1.logger.error('Employment history error:', employmentError);
                // 🔧 ROLLBACK FIX: Delete employee AND unlink user
                await supabase_1.supabase.from('employees').delete().eq('id', employee.id);
                await supabase_1.supabase.from('users').update({ linked_employee_id: null }).eq('id', req.user.id);
                return res.status(400).json({
                    error: 'Failed to add employment history: ' + employmentError.message
                });
            }
        }
        // Add to moderation queue as employee_claim (self-profile type)
        const { error: moderationError } = await supabase_1.supabase
            .from('moderation_queue')
            .insert({
            item_type: 'employee_claim',
            item_id: employee.id,
            submitted_by: req.user.id,
            status: 'pending',
            request_metadata: {
                claim_type: 'self_profile',
                message: 'I am creating my own employee profile'
            }
        });
        // 🔧 ROLLBACK FIX: Delete employee AND unlink user if moderation queue fails
        if (moderationError) {
            logger_1.logger.error('Moderation queue error:', moderationError);
            await supabase_1.supabase.from('employees').delete().eq('id', employee.id);
            await supabase_1.supabase.from('users').update({ linked_employee_id: null }).eq('id', req.user.id);
            return res.status(400).json({
                error: 'Failed to submit for moderation: ' + moderationError.message
            });
        }
        logger_1.logger.info(`Self-profile created by user ${req.user.id}:`, { employee_id: employee.id });
        res.status(201).json({
            message: 'Your employee profile has been created and is pending approval',
            employee,
            linked: true
        });
    }
    catch (error) {
        logger_1.logger.error('Create own employee profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.createOwnEmployeeProfile = createOwnEmployeeProfile;
/**
 * Claim existing employee profile
 * User requests to link their account to an existing employee profile
 * Creates a moderation request for admin approval
 */
const claimEmployeeProfile = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
        }
        const { employeeId } = req.params;
        const { message, verification_proof } = req.body;
        if (!message || message.trim().length < 10) {
            return res.status(400).json({
                error: 'Please provide a detailed message (min 10 characters) explaining why this is your profile'
            });
        }
        // 🔧 FIX C7: Limit proof URLs to 5 max
        const MAX_PROOF_URLS = 5;
        if (verification_proof && verification_proof.length > MAX_PROOF_URLS) {
            return res.status(400).json({
                error: `Maximum ${MAX_PROOF_URLS} proof URLs allowed`,
                code: 'TOO_MANY_PROOFS'
            });
        }
        // Check if user already has a linked profile
        const { data: existingUser } = await supabase_1.supabase
            .from('users')
            .select('linked_employee_id')
            .eq('id', req.user.id)
            .single();
        if (existingUser?.linked_employee_id) {
            return res.status(409).json({
                error: 'You already have a linked employee profile',
                code: 'ALREADY_LINKED'
            });
        }
        // Check if employee exists and is not already linked
        const { data: employee, error: employeeError } = await supabase_1.supabase
            .from('employees')
            .select('id, name, user_id')
            .eq('id', employeeId)
            .single();
        if (employeeError || !employee) {
            return res.status(404).json({ error: 'Employee profile not found' });
        }
        if (employee.user_id) {
            return res.status(409).json({
                error: 'This employee profile is already linked to another user account',
                code: 'ALREADY_LINKED'
            });
        }
        // Check if there's already a pending claim request for this employee by this user
        const { data: existingClaim } = await supabase_1.supabase
            .from('moderation_queue')
            .select('id')
            .eq('item_type', 'employee_claim')
            .eq('item_id', employeeId)
            .eq('submitted_by', req.user.id)
            .eq('status', 'pending')
            .single();
        if (existingClaim) {
            return res.status(409).json({
                error: 'You already have a pending claim request for this profile',
                code: 'CLAIM_PENDING'
            });
        }
        // Create claim request using SQL helper function (from migration)
        // 🔧 FIX C2: Validate verification proof URLs to prevent XSS/SSRF
        const validatedProofs = (0, validation_1.validateUrlArray)(verification_proof);
        if (verification_proof && verification_proof.length > 0 && validatedProofs.length === 0) {
            logger_1.logger.warn('All verification proof URLs rejected as invalid', {
                userId: req.user.id,
                employeeId,
                originalCount: verification_proof.length
            });
        }
        // Handle empty arrays: PostgreSQL RPC requires NULL instead of empty array
        const verificationProofForDB = validatedProofs.length > 0 ? validatedProofs : null;
        const { data: claimRequest, error: claimError } = await supabase_1.supabase
            .rpc('create_employee_claim_request', {
            p_user_id: req.user.id,
            p_employee_id: employeeId,
            p_message: message.trim(),
            p_verification_proof: verificationProofForDB
        });
        if (claimError) {
            logger_1.logger.error('Create claim request error:', claimError);
            return res.status(400).json({
                error: claimError.message || 'Failed to create claim request'
            });
        }
        // 🔔 NOTIFICATION FIX: Create notifications for all admin users
        try {
            const { data: admins } = await supabase_1.supabase
                .from('users')
                .select('id')
                .eq('role', 'admin');
            if (admins && admins.length > 0) {
                const adminNotifications = admins.map(admin => ({
                    user_id: admin.id,
                    type: 'new_ownership_request',
                    title: 'New Employee Claim Request',
                    message: `User "${req.user.pseudonym || 'A user'}" has requested to claim employee profile "${employee.name}"`,
                    link: '/admin/employee-claims',
                    related_entity_type: 'employee_claim',
                    related_entity_id: claimRequest
                }));
                const { error: notificationError } = await supabase_1.supabase
                    .from('notifications')
                    .insert(adminNotifications);
                if (notificationError) {
                    logger_1.logger.error('Failed to create admin notifications for claim:', notificationError);
                    // Don't fail the request, just log the error
                }
                else {
                    logger_1.logger.info(`Created ${admins.length} admin notifications for claim ${claimRequest}`);
                }
            }
        }
        catch (notificationError) {
            logger_1.logger.error('Admin notification error:', notificationError);
            // Don't fail the request, just log the error
        }
        logger_1.logger.info(`Claim request created by user ${req.user.id} for employee ${employeeId}`);
        res.status(201).json({
            message: 'Claim request submitted successfully. An administrator will review your request.',
            claim_id: claimRequest
        });
    }
    catch (error) {
        logger_1.logger.error('Claim employee profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.claimEmployeeProfile = claimEmployeeProfile;
/**
 * Get user's linked employee profile
 * Returns the employee profile linked to the authenticated user
 * 🔧 v10.2 FIX: Returns employee directly (without {employee: ...} wrapper) for frontend compatibility
 */
const getMyLinkedProfile = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
        }
        const { data: user } = await supabase_1.supabase
            .from('users')
            .select('linked_employee_id')
            .eq('id', req.user.id)
            .single();
        if (!user?.linked_employee_id) {
            return res.status(404).json({
                error: 'No linked employee profile found',
                code: 'NOT_LINKED'
            });
        }
        const employeeId = user.linked_employee_id;
        // Get employee with current employment (same logic as getEmployee but returns directly)
        const { data: employee, error: employeeError } = await supabase_1.supabase
            .from('employees')
            .select(`
        *,
        created_by_user:users!employees_created_by_fkey(pseudonym)
      `)
            .eq('id', employeeId)
            .single();
        if (employeeError || !employee) {
            return res.status(404).json({ error: 'Employee profile not found' });
        }
        // Get employment history
        const { data: employmentHistory, error: historyError } = await supabase_1.supabase
            .from('employment_history')
            .select(`
        *,
        establishment:establishments(
          *,
          category:establishment_categories(*)
        )
      `)
            .eq('employee_id', employeeId)
            .order('start_date', { ascending: false });
        if (historyError) {
            logger_1.logger.error('Employment history error:', historyError);
        }
        // Get comments and rating statistics
        const { data: comments, error: commentsError } = await supabase_1.supabase
            .from('comments')
            .select(`
        *,
        user:users(pseudonym)
      `)
            .eq('employee_id', employeeId)
            .eq('status', 'approved')
            .order('created_at', { ascending: false });
        if (commentsError) {
            logger_1.logger.error('Comments error:', commentsError);
        }
        // Calculate average rating
        const ratings = comments?.filter(c => c.rating).map(c => c.rating) || [];
        const averageRating = ratings.length > 0
            ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
            : null;
        // Separate current and past employment
        const currentEmployment = employmentHistory?.filter(eh => eh.is_current) || [];
        const pastEmployment = employmentHistory?.filter(eh => !eh.is_current) || [];
        const enrichedEmployee = {
            ...employee,
            current_employment: currentEmployment,
            employment_history: pastEmployment,
            comments: comments || [],
            average_rating: averageRating,
            comment_count: comments?.length || 0
        };
        // 🔧 Return employee directly (no wrapper) for frontend compatibility
        res.json(enrichedEmployee);
    }
    catch (error) {
        logger_1.logger.error('Get my linked profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getMyLinkedProfile = getMyLinkedProfile;
/**
 * Get all claim requests (admin only)
 * Returns pending/approved/rejected claim requests for moderation
 *
 * 🔧 v10.2 FIX: Only returns REAL claims (claim_existing), not self-profile creations
 * Self-profiles are managed in EmployeesAdmin (via employees table directly)
 */
const getClaimRequests = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
        }
        // Only admin/moderator can view claims
        if (!['admin', 'moderator'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Admin/moderator access required', code: 'FORBIDDEN' });
        }
        const { status = 'pending' } = req.query;
        // Get claim requests from moderation_queue
        // 🔧 v10.2 FIX: Show ALL claims (self_profile AND claim_existing)
        // This ensures all employee claim requests appear in the admin dashboard
        let query = supabase_1.supabase
            .from('moderation_queue')
            .select(`
        *,
        submitted_by_user:users!moderation_queue_submitted_by_fkey(id, pseudonym, email),
        moderator_user:users!moderation_queue_moderator_id_fkey(id, pseudonym)
      `)
            .eq('item_type', 'employee_claim');
        // 🔧 FIX C3: Only apply status filter if NOT 'all'
        if (status && status !== 'all') {
            query = query.eq('status', status);
        }
        const { data: claims, error } = await query.order('created_at', { ascending: false });
        if (error) {
            logger_1.logger.error('Get claim requests error:', error);
            return res.status(400).json({ error: error.message });
        }
        // 🔧 FIX C4: Batch fetch employee data with IN query instead of N+1
        const employeeIds = [...new Set((claims || []).map(c => c.item_id).filter(Boolean))];
        let employeesMap = {};
        if (employeeIds.length > 0) {
            const { data: employees } = await supabase_1.supabase
                .from('employees')
                .select('id, name, nickname, photos')
                .in('id', employeeIds);
            if (employees) {
                employeesMap = employees.reduce((acc, emp) => {
                    acc[emp.id] = emp;
                    return acc;
                }, {});
            }
        }
        // Enrich claims with pre-fetched employee data (O(1) lookup)
        const enrichedClaims = (claims || []).map(claim => ({
            ...claim,
            employee: employeesMap[claim.item_id] || null
        }));
        res.json({
            claims: enrichedClaims,
            total: enrichedClaims.length
        });
    }
    catch (error) {
        logger_1.logger.error('Get claim requests error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getClaimRequests = getClaimRequests;
/**
 * Approve claim request (admin only)
 * Creates the bidirectional user ↔ employee link
 */
const approveClaimRequest = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
        }
        // Only admin can approve claims
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required', code: 'FORBIDDEN' });
        }
        const { claimId } = req.params;
        const { moderator_notes } = req.body;
        // First, get the claim details to check claim_type
        const { data: claim, error: claimError } = await supabase_1.supabase
            .from('moderation_queue')
            .select('*, request_metadata')
            .eq('id', claimId)
            .eq('status', 'pending')
            .eq('item_type', 'employee_claim')
            .single();
        if (claimError || !claim) {
            logger_1.logger.error('Claim not found:', claimError);
            return res.status(404).json({ error: 'Claim request not found or already processed' });
        }
        const claimType = claim.request_metadata?.claim_type;
        // For self-profiles that are already linked, just approve the employee status
        if (claimType === 'self_profile') {
            // Update employee status to approved
            const { error: employeeUpdateError } = await supabase_1.supabase
                .from('employees')
                .update({
                status: 'approved',
                updated_at: new Date().toISOString()
            })
                .eq('id', claim.item_id);
            if (employeeUpdateError) {
                logger_1.logger.error('Failed to approve employee:', employeeUpdateError);
                return res.status(500).json({ error: 'Failed to approve employee profile' });
            }
            // Update moderation queue
            const { error: queueUpdateError } = await supabase_1.supabase
                .from('moderation_queue')
                .update({
                status: 'approved',
                moderator_id: req.user.id,
                moderator_notes: moderator_notes || 'Self-profile approved',
                reviewed_at: new Date().toISOString()
            })
                .eq('id', claimId);
            if (queueUpdateError) {
                logger_1.logger.error('Failed to update moderation queue:', queueUpdateError);
            }
            logger_1.logger.info(`Self-profile claim ${claimId} approved by admin ${req.user.id}`);
            // 🔔 NOTIFICATION: Notify user that their self-profile was approved
            try {
                const { error: notifError } = await supabase_1.supabase
                    .from('notifications')
                    .insert({
                    user_id: claim.submitted_by,
                    type: 'ownership_request_approved',
                    title: 'Employee Profile Approved',
                    message: 'Your employee profile has been approved and is now publicly visible!',
                    link: '/my-employee-profile',
                    related_entity_type: 'employee_claim',
                    related_entity_id: claimId
                });
                if (notifError) {
                    logger_1.logger.error('Failed to create user notification for approved self-profile:', notifError);
                }
                else {
                    logger_1.logger.info(`Notified user ${claim.submitted_by} of approved self-profile`);
                }
            }
            catch (notifError) {
                logger_1.logger.error('User notification error:', notifError);
            }
            return res.json({
                message: 'Self-profile approved successfully. Employee profile is now public.',
                success: true
            });
        }
        // For claim_existing type, use SQL helper function to create the link
        const { data: success, error: approveError } = await supabase_1.supabase
            .rpc('approve_employee_claim_request', {
            p_claim_id: claimId,
            p_moderator_id: req.user.id,
            p_moderator_notes: moderator_notes || null
        });
        if (approveError) {
            logger_1.logger.error('Approve claim request error:', approveError);
            return res.status(400).json({
                error: approveError.message || 'Failed to approve claim request'
            });
        }
        logger_1.logger.info(`Claim request ${claimId} approved by admin ${req.user.id}`);
        // 🔔 NOTIFICATION: Notify user that their claim was approved
        try {
            // Get employee name for notification message
            const { data: employee } = await supabase_1.supabase
                .from('employees')
                .select('name')
                .eq('id', claim.item_id)
                .single();
            const employeeName = employee?.name || 'the employee profile';
            const { error: notifError } = await supabase_1.supabase
                .from('notifications')
                .insert({
                user_id: claim.submitted_by,
                type: 'ownership_request_approved',
                title: 'Claim Request Approved',
                message: `Your claim request for "${employeeName}" has been approved! You can now manage this profile.`,
                link: '/my-employee-profile',
                related_entity_type: 'employee_claim',
                related_entity_id: claimId
            });
            if (notifError) {
                logger_1.logger.error('Failed to create user notification for approved claim:', notifError);
            }
            else {
                logger_1.logger.info(`Notified user ${claim.submitted_by} of approved claim for ${employeeName}`);
            }
        }
        catch (notifError) {
            logger_1.logger.error('User notification error:', notifError);
        }
        res.json({
            message: 'Claim request approved successfully. User and employee are now linked.',
            success: true
        });
    }
    catch (error) {
        logger_1.logger.error('Approve claim request error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.approveClaimRequest = approveClaimRequest;
/**
 * Reject claim request (admin only)
 * Marks the claim as rejected without creating any links
 */
const rejectClaimRequest = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
        }
        // Only admin can reject claims
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required', code: 'FORBIDDEN' });
        }
        const { claimId } = req.params;
        const { moderator_notes } = req.body;
        if (!moderator_notes || moderator_notes.trim().length < 10) {
            return res.status(400).json({
                error: 'Please provide a reason for rejection (min 10 characters)'
            });
        }
        // 🔧 FIX C2: First get the claim details to send notification later
        const { data: claim, error: claimError } = await supabase_1.supabase
            .from('moderation_queue')
            .select('*, request_metadata')
            .eq('id', claimId)
            .eq('status', 'pending')
            .eq('item_type', 'employee_claim')
            .single();
        if (claimError || !claim) {
            logger_1.logger.error('Claim not found:', claimError);
            return res.status(404).json({ error: 'Claim request not found or already processed' });
        }
        // Use SQL helper function to reject claim
        const { data: success, error: rejectError } = await supabase_1.supabase
            .rpc('reject_employee_claim_request', {
            p_claim_id: claimId,
            p_moderator_id: req.user.id,
            p_moderator_notes: moderator_notes.trim()
        });
        if (rejectError) {
            logger_1.logger.error('Reject claim request error:', rejectError);
            return res.status(400).json({
                error: rejectError.message || 'Failed to reject claim request'
            });
        }
        logger_1.logger.info(`Claim request ${claimId} rejected by admin ${req.user.id}`);
        // 🔧 FIX C2: Notify user that their claim was rejected
        try {
            // Get employee name for notification message
            const { data: employee } = await supabase_1.supabase
                .from('employees')
                .select('name')
                .eq('id', claim.item_id)
                .single();
            const employeeName = employee?.name || 'the employee profile';
            const claimType = claim.request_metadata?.claim_type;
            const isSelftProfile = claimType === 'self_profile';
            const { error: notifError } = await supabase_1.supabase
                .from('notifications')
                .insert({
                user_id: claim.submitted_by,
                type: 'ownership_request_rejected',
                title: isSelftProfile ? 'Employee Profile Rejected' : 'Claim Request Rejected',
                message: isSelftProfile
                    ? `Your employee profile request has been rejected. Reason: ${moderator_notes.trim()}`
                    : `Your claim request for "${employeeName}" has been rejected. Reason: ${moderator_notes.trim()}`,
                link: '/my-claims',
                related_entity_type: 'employee_claim',
                related_entity_id: claimId,
                metadata: {
                    i18n_key: isSelftProfile ? 'notifications.selfProfileRejected' : 'notifications.claimRejected',
                    i18n_params: { employeeName, reason: moderator_notes.trim() }
                }
            });
            if (notifError) {
                logger_1.logger.error('Failed to create user notification for rejected claim:', notifError);
            }
            else {
                logger_1.logger.info(`Notified user ${claim.submitted_by} of rejected claim for ${employeeName}`);
            }
        }
        catch (notifError) {
            logger_1.logger.error('User notification error:', notifError);
        }
        res.json({
            message: 'Claim request rejected successfully.',
            success: true
        });
    }
    catch (error) {
        logger_1.logger.error('Reject claim request error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.rejectClaimRequest = rejectClaimRequest;
// ==========================================
// 🆕 EMPLOYEE DASHBOARD STATS (v10.2)
// ==========================================
/**
 * Get employee statistics for dashboard
 * Returns profile views, reviews count, average rating, favorites count, and employment info
 */
const getEmployeeStats = async (req, res) => {
    try {
        const { id } = req.params;
        // Check if employee exists
        const { data: employee, error: employeeError } = await supabase_1.supabase
            .from('employees')
            .select('id, name, status')
            .eq('id', id)
            .single();
        if (employeeError || !employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        // Parallel queries for better performance
        const [profileViewsResult, ratingsResult, reviewsResult, favoritesResult, employmentResult] = await Promise.all([
            // 1. Profile Views Count
            supabase_1.supabase
                .from('profile_views')
                .select('id', { count: 'exact', head: true })
                .eq('employee_id', id),
            // 2. Ratings (for average calculation - includes ratings with or without text)
            supabase_1.supabase
                .from('comments')
                .select('rating')
                .eq('employee_id', id)
                .eq('status', 'approved')
                .not('rating', 'is', null),
            // 3. Reviews (comments with text content only)
            supabase_1.supabase
                .from('comments')
                .select('id', { count: 'exact', head: true })
                .eq('employee_id', id)
                .eq('status', 'approved')
                .not('content', 'is', null)
                .neq('content', '')
                .is('parent_comment_id', null), // Only top-level comments
            // 4. Favorites Count
            supabase_1.supabase
                .from('user_favorites')
                .select('id', { count: 'exact', head: true })
                .eq('employee_id', id),
            // 5. Current Employment
            supabase_1.supabase
                .from('employment_history')
                .select(`
          *,
          establishment:establishments(
            id,
            name,
            zone,
            category:establishment_categories(name, icon)
          )
        `)
                .eq('employee_id', id)
                .eq('is_current', true)
                .single()
        ]);
        // Calculate average rating
        const ratings = ratingsResult.data?.map(r => r.rating) || [];
        const averageRating = ratings.length > 0
            ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
            : 0;
        // Build stats response
        const stats = {
            profileViews: profileViewsResult.count || 0,
            reviewsCount: reviewsResult.count || 0, // 🔧 v10.2 FIX: Count only reviews with text content
            averageRating: averageRating ? parseFloat(averageRating.toFixed(1)) : 0,
            favoritesCount: favoritesResult.count || 0,
            currentEmployment: employmentResult.data || null
        };
        res.json({ stats });
    }
    catch (error) {
        logger_1.logger.error('Get employee stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getEmployeeStats = getEmployeeStats;
/**
 * Get employee reviews with pagination (v10.2)
 * Returns paginated reviews (comments with ratings) for employee dashboard
 */
const getEmployeeReviews = async (req, res) => {
    try {
        const { id } = req.params;
        const limit = parseInt(req.query.limit) || 5;
        const offset = parseInt(req.query.offset) || 0;
        // Check if employee exists
        const { data: employee, error: employeeError } = await supabase_1.supabase
            .from('employees')
            .select('id')
            .eq('id', id)
            .single();
        if (employeeError || !employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        // Get total count of reviews (not comments - only ratings)
        const { count } = await supabase_1.supabase
            .from('comments')
            .select('id', { count: 'exact', head: true })
            .eq('employee_id', id)
            .eq('status', 'approved')
            .not('rating', 'is', null)
            .is('parent_comment_id', null);
        // Get paginated reviews
        const { data: reviews, error: reviewsError } = await supabase_1.supabase
            .from('comments')
            .select(`
        id,
        content,
        rating,
        created_at,
        user:users(pseudonym)
      `)
            .eq('employee_id', id)
            .eq('status', 'approved')
            .not('rating', 'is', null)
            .is('parent_comment_id', null)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);
        if (reviewsError) {
            logger_1.logger.error('Get employee reviews error:', reviewsError);
            return res.status(400).json({ error: reviewsError.message });
        }
        res.json({
            reviews: reviews || [],
            total: count || 0,
            limit,
            offset
        });
    }
    catch (error) {
        logger_1.logger.error('Get employee reviews error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getEmployeeReviews = getEmployeeReviews;
// ==========================================
// 🆕 PROFILE VIEW TRACKING (v10.2)
// ==========================================
/**
 * Record profile view
 * Tracks when a user views an employee profile (public endpoint, no auth required)
 * Supports both anonymous and authenticated visitors
 */
const recordProfileView = async (req, res) => {
    try {
        const { id } = req.params;
        // Check if employee exists
        const { data: employee, error: employeeError } = await supabase_1.supabase
            .from('employees')
            .select('id')
            .eq('id', id)
            .single();
        if (employeeError || !employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        // Record view (anonymous or authenticated)
        const { error } = await supabase_1.supabase
            .from('profile_views')
            .insert({
            employee_id: id,
            user_id: req.user?.id || null, // Null if anonymous
            viewed_at: new Date().toISOString()
        });
        if (error) {
            logger_1.logger.error('Record profile view error:', error);
            return res.status(400).json({ error: error.message });
        }
        res.json({ success: true });
    }
    catch (error) {
        logger_1.logger.error('Record profile view error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.recordProfileView = recordProfileView;
//# sourceMappingURL=employeeController.js.map