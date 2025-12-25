"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const csrf_1 = require("../middleware/csrf");
const supabase_1 = require("../config/supabase");
const logger_1 = require("../utils/logger");
const cache_1 = require("../middleware/cache");
const rateLimit_1 = require("../middleware/rateLimit");
const establishmentController_1 = require("../controllers/establishmentController");
const establishmentOwnerController_1 = require("../controllers/establishmentOwnerController");
const router = (0, express_1.Router)();
// SECURITY FIX: Remove test routes from production
// These routes were exposing endpoints without authentication
// Removed: GET /test, POST /test-post
// Utility functions for admin transformations
const uuidToNumber = (uuid) => {
    if (!uuid)
        return 0;
    let hash = 0;
    for (let i = 0; i < uuid.length; i++) {
        const char = uuid.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
};
const transformEstablishment = (est) => ({
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
const transformEmployee = (emp) => ({
    ...emp,
    id: emp.id, // Keep original UUID instead of converting to number
    created_by: emp.created_by || null, // Keep original UUID if present
    current_employment: emp.current_employment?.map((job) => ({
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
// TEMP ADMIN ROUTES - Must be FIRST before any parametric routes
router.get('/temp-admin-dashboard-stats', cache_1.dashboardStatsCache, async (req, res) => {
    logger_1.logger.debug('🎯🎯 TEMP ADMIN STATS ROUTE HIT! 🎯🎯');
    try {
        // 🚀 PERFORMANCE: Execute all count queries in parallel with Promise.all()
        // Before: 8 sequential queries ≈ 800ms
        // After: 8 parallel queries ≈ 100ms
        const [{ count: totalEstablishments }, { count: pendingEstablishments }, { count: totalEmployees }, { count: pendingEmployees }, { count: totalUsers }, { count: totalComments }, { count: pendingComments }, { count: reportedComments }] = await Promise.all([
            // Établissements
            supabase_1.supabase.from('establishments').select('id', { count: 'exact', head: true }),
            supabase_1.supabase.from('establishments').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
            // Employées
            supabase_1.supabase.from('employees').select('*', { count: 'exact', head: true }),
            supabase_1.supabase.from('employees').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
            // Utilisateurs
            supabase_1.supabase.from('users').select('*', { count: 'exact', head: true }),
            // Commentaires
            supabase_1.supabase.from('comments').select('*', { count: 'exact', head: true }),
            supabase_1.supabase.from('comments').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
            // Signalements
            supabase_1.supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending')
        ]);
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
        res.json(stats);
    }
    catch (error) {
        logger_1.logger.error('Error fetching dashboard stats:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
    }
});
// TEMP: Admin establishments list
router.get('/temp-admin-establishments', async (req, res) => {
    try {
        const { status } = req.query;
        let query = supabase_1.supabase
            .from('establishments')
            .select(`
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
            throw error;
        }
        // Transform data to use numeric IDs
        const transformedData = (data || []).map(transformEstablishment);
        res.json({ establishments: transformedData });
    }
    catch (error) {
        logger_1.logger.error('Error fetching establishments:', error);
        res.status(500).json({ error: 'Failed to fetch establishments' });
    }
});
// TEMP: Admin employees list
router.get('/temp-admin-employees', async (req, res) => {
    try {
        const { status } = req.query;
        let query = supabase_1.supabase
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
        // Transform data using the utility function
        const transformedEmployees = (data || []).map((emp) => {
            const baseEmployee = transformEmployee(emp);
            return {
                ...baseEmployee,
                employment_history: emp.employment_history?.map((eh) => ({
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
    }
    catch (error) {
        logger_1.logger.error('Error fetching employees:', error);
        res.status(500).json({ error: 'Failed to fetch employees' });
    }
});
// Public routes
router.get('/', (0, cache_1.listingsCache)(), establishmentController_1.getEstablishments);
router.get('/categories', cache_1.categoriesCache, establishmentController_1.getEstablishmentCategories);
// GET /api/consumables - Public endpoint for consumable templates
router.get('/consumables', async (req, res) => {
    try {
        logger_1.logger.debug('📋 Getting consumable templates...');
        const { data, error } = await supabase_1.supabase
            .from('consumable_templates')
            .select('*')
            .eq('status', 'active')
            .order('category', { ascending: true })
            .order('name', { ascending: true });
        if (error) {
            throw error;
        }
        logger_1.logger.debug(`✅ Found ${data?.length || 0} templates in ${new Set(data?.map(d => d.category)).size} categories`);
        res.json({ consumables: data || [] });
    }
    catch (error) {
        logger_1.logger.error('Error fetching consumable templates:', error);
        res.status(500).json({ error: 'Failed to fetch consumable templates' });
    }
});
// WORKAROUND: Simple POST endpoint for grid position updates - MUST BE BEFORE DYNAMIC ROUTES
router.post('/grid-move', async (req, res) => {
    try {
        logger_1.logger.debug('🔧 WORKAROUND - Headers:', req.headers);
        logger_1.logger.debug('🔧 WORKAROUND - Body type:', typeof req.body);
        logger_1.logger.debug('🔧 WORKAROUND - Body:', req.body);
        const { establishmentId, grid_row, grid_col, zone, swap_with_id } = req.body;
        if (!establishmentId || !grid_row || !grid_col || !zone) {
            return res.status(400).json({
                error: 'Missing required fields: establishmentId, grid_row, grid_col, zone'
            });
        }
        // Update the establishment position in database
        const { data, error } = await supabase_1.supabase
            .from('establishments')
            .update({
            grid_row,
            grid_col,
            zone,
            updated_at: new Date().toISOString()
        })
            .eq('id', establishmentId)
            .select();
        if (error) {
            logger_1.logger.error('Database update error:', error);
            return res.status(500).json({ error: 'Failed to update position' });
        }
        logger_1.logger.debug('✅ Position updated successfully:', data);
        res.json({
            success: true,
            message: 'Position updated successfully',
            establishment: data[0]
        });
    }
    catch (error) {
        logger_1.logger.error('🔧 WORKAROUND ERROR:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Update establishment logo (authenticated route)
router.patch('/:id/logo', auth_1.authenticateToken, establishmentController_1.updateEstablishmentLogo);
// GET /api/establishments/my-owned - Get establishments owned by current user (v10.1)
router.get('/my-owned', auth_1.authenticateToken, establishmentOwnerController_1.getMyOwnedEstablishments);
/**
 * @swagger
 * /api/establishments/{id}/employees:
 *   get:
 *     summary: Get employees of an establishment
 *     description: Returns all employees currently working at the establishment. Only accessible by establishment owners/managers. Rate limited to 30 requests per minute.
 *     tags: [Establishments]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Establishment ID
 *     responses:
 *       200:
 *         description: Employees retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 employees:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                       age:
 *                         type: integer
 *                       nationality:
 *                         type: string
 *                       photos:
 *                         type: array
 *                         items:
 *                           type: string
 *                       status:
 *                         type: string
 *                         enum: [pending, approved, rejected]
 *                       average_rating:
 *                         type: number
 *                         nullable: true
 *                       comment_count:
 *                         type: integer
 *                       is_vip:
 *                         type: boolean
 *                         description: Whether employee has active VIP subscription
 *                       vip_expires_at:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                       current_employment:
 *                         type: object
 *                         properties:
 *                           establishment_id:
 *                             type: string
 *                             format: uuid
 *                           establishment_name:
 *                             type: string
 *                           start_date:
 *                             type: string
 *                             format: date-time
 *                 total:
 *                   type: integer
 *                   description: Total number of employees
 *                 establishment:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *                     zone:
 *                       type: string
 *       401:
 *         description: Unauthorized (not authenticated)
 *       403:
 *         description: Forbidden (user is not owner/manager of this establishment)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Establishment not found
 *       429:
 *         description: Rate limit exceeded (max 30 requests per minute)
 *       500:
 *         description: Internal server error
 */
// GET /api/establishments/:id/employees - Get employees of establishment (owner only) (v10.3 Phase 0)
router.get('/:id/employees', auth_1.authenticateToken, rateLimit_1.establishmentEmployeesRateLimit, establishmentController_1.getEstablishmentEmployees);
// Dynamic route MUST be after specific routes
router.get('/:id', establishmentController_1.getEstablishment);
// Original problematic endpoint (keep for compatibility) - DISABLED FOR NOW
// router.patch('/:id/grid-position', authenticateToken, updateEstablishmentGridPosition);
// Protected routes - UPDATE ESTABLISHMENT ENABLED FOR ADMIN EDITING
router.put('/:id', auth_1.authenticateToken, auth_1.requireAdmin, csrf_1.csrfProtection, establishmentController_1.updateEstablishment);
// Create establishment route
router.post('/', auth_1.authenticateToken, auth_1.requireAdmin, csrf_1.csrfProtection, establishmentController_1.createEstablishment);
// Delete route still disabled until needed
// router.delete('/:id', authenticateToken, deleteEstablishment);
exports.default = router;
//# sourceMappingURL=establishments.js.map