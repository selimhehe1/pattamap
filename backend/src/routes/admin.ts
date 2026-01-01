import express, { Response } from 'express';
import { supabase } from '../config/supabase';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';
import { csrfProtection } from '../middleware/csrf';
import { logger } from '../utils/logger';
import { notifyUserContentApproved, notifyUserContentRejected } from '../utils/notificationHelper';
import { getVIPTransactions } from '../controllers/vipController';
import { awardXP } from '../services/gamificationService';
import { User, EstablishmentCategory } from '../types';
import {
  getEstablishmentOwners,
  assignEstablishmentOwner,
  removeEstablishmentOwner,
  updateEstablishmentOwnerPermissions
} from '../controllers/establishmentOwnerController';

// Type-safe error message extraction
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown error';
};

// Database record types (may differ from API types)
// Note: These are standalone types, not extending base types due to structural differences
interface DbEstablishment {
  id: string;
  name: string;
  address: string;
  zone: string;
  grid_row?: number;
  grid_col?: number;
  category_id: number;
  description?: string;
  phone?: string;
  website?: string;
  opening_hours?: Record<string, unknown>;
  instagram?: string;
  twitter?: string;
  tiktok?: string;
  logo_url?: string;
  is_vip?: boolean;
  status: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  latitude?: number;
  longitude?: number;
  category?: EstablishmentCategory;
  user?: User;
}

interface DbEmploymentHistory {
  id: string;
  employee_id: string;
  establishment_id: string;
  is_current: boolean;
  start_date?: string;
  end_date?: string;
  position?: string;
  establishment?: DbEstablishment;
}

interface DbEmployee {
  id: string;
  name: string;
  nickname?: string;
  age?: number;
  nationality?: string[];
  photos?: string[];
  description?: string;
  social_media?: Record<string, string>;
  status: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  is_verified?: boolean;
  verified_at?: string;
  is_vip?: boolean;
  vip_expires_at?: string;
  vote_count?: number;
  average_rating?: number;
  is_freelance?: boolean;
  current_employment?: DbEmploymentHistory[];
  employment_history?: DbEmploymentHistory[];
}

const router = express.Router();

// FIRST ROUTE - Should work without any middleware (health check only)
router.get('/health', (req, res) => {
  res.json({ message: 'Admin router is working without authentication!' });
});

// ========================================
// AUTHENTICATION MIDDLEWARE - Protect ALL routes except /health
// ========================================
// SECURITY FIX: Moved from line 228 to protect ALL admin routes
router.use((req, res, next) => {
  logger.debug('Admin route middleware reached for:', req.path);
  next();
});
router.use(authenticateToken);
// Role-based access control for admin/moderator routes
router.use(requireRole(['admin', 'moderator']));

// Utility function to convert UUID to consistent number
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

// Function to find UUID by its numeric hash
const findUuidByNumber = async (table: string, numericId: string): Promise<string | null> => {
  try {
    logger.debug(`🔍 findUuidByNumber: Looking for ${numericId} in table ${table}`);

    // First check if it's already a valid UUID
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (uuidRegex.test(numericId)) {
      logger.debug(`✅ Already a valid UUID: ${numericId}`);
      return numericId;
    }

    // If it's a number, find the corresponding UUID
    const targetNumber = parseInt(numericId);
    logger.debug(`🔢 Target number: ${targetNumber}`);

    const { data, error } = await supabase
      .from(table)
      .select('id, name');

    if (error || !data) {
      logger.error(`❌ Error fetching ${table} data:`, error);
      return null;
    }

    logger.debug(`📊 Found ${data.length} records in ${table} table`);

    // Find the UUID that generates this number
    for (const row of data) {
      const hashedNumber = uuidToNumber(row.id);
      logger.debug(`🔄 Checking ${row.name || 'Unknown'} (${row.id}): ${hashedNumber} vs ${targetNumber}`);

      if (hashedNumber === targetNumber) {
        logger.debug(`✅ Found UUID mapping: ${numericId} -> ${row.id} (${row.name || 'Unknown'})`);
        return row.id;
      }
    }

    logger.error(`❌ No UUID found for numeric ID: ${numericId} after checking ${data.length} records`);
    logger.debug(`🎯 Searched in table: ${table}, target number: ${targetNumber}`);
    return null;
  } catch (error: unknown) {
    logger.error('💥 Error in findUuidByNumber:', getErrorMessage(error));
    return null;
  }
};

// Transform establishment data for admin interface
const transformEstablishment = (est: DbEstablishment) => {
  logger.debug('🔥 TRANSFORM EST - Input ID' + JSON.stringify({ id: est.id, type: typeof est.id }));
  const result = {
    ...est,
    id: est.id, // Keep original UUID instead of converting to number
    category_id: est.category_id || 1, // Default category if null
    created_by: est.created_by || null, // Keep original UUID if present
    category: est.category ? {
      ...est.category,
      id: est.category.id // Keep original UUID
    } : null,
    user: est.user ? {
      ...est.user,
      id: est.user.id // Keep original UUID
    } : null
  };
  logger.debug('🔥 TRANSFORM EST - Output ID' + JSON.stringify({ id: result.id, type: typeof result.id }));
  return result;
};

// Transform employee data for admin interface
const transformEmployee = (emp: DbEmployee) => ({
  ...emp,
  id: emp.id, // Keep original UUID instead of converting to number
  created_by: emp.created_by || null, // Keep original UUID if present
  current_employment: emp.current_employment?.map((job: DbEmploymentHistory) => ({
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

// ========================================
// LEGACY ENDPOINTS (Migration & Setup)
// ========================================
// SECURITY FIX: These routes now require authentication (middleware moved to line 19)
// Previously these were accessible without auth - security vulnerability fixed
//
// SECURITY NOTE: execute_sql_admin RPC function has been deprecated.
// PostGIS functions should be created via Supabase migrations instead.
// See: supabase/migrations/YYYYMMDD_create_postgis_functions.sql

// Create PostGIS coordinate extraction function
// DEPRECATED: This endpoint should not be used in production.
// Use Supabase migrations instead for database schema changes.
router.post('/setup-postgis-functions', async (req, res) => {
  try {
    // SECURITY FIX: Use specific RPC function instead of generic execute_sql_admin
    // The function 'setup_postgis_functions' should be created in Supabase with limited scope
    const { error } = await supabase.rpc('setup_postgis_functions');

    if (error) {
      // If specific RPC doesn't exist, return helpful message
      if (error.code === 'PGRST202') {
        logger.warn('setup_postgis_functions RPC not found - create via migration instead');
        return res.status(501).json({
          error: 'This endpoint is deprecated. Create PostGIS functions via Supabase migrations.',
          migration_required: true
        });
      }
      logger.error('PostGIS function creation error:', error);
      return res.status(500).json({ error: 'Failed to create PostGIS functions' });
    }

    res.json({ message: 'PostGIS functions created successfully' });
  } catch (error: unknown) {
    logger.error('Setup error:', error);
    res.status(500).json({ error: 'Failed to setup PostGIS functions' });
  }
});

// Add Soi 6 bars endpoint (NO AUTH)
router.post('/add-soi6-bars', async (req, res) => {
  try {
    // First delete existing Soi 6 bars (within 200m of center)
    const { error: deleteError } = await supabase
      .from('establishments')
      .delete()
      .filter('address', 'ilike', '%Soi 6%');

    if (deleteError) {
      logger.error('Delete error:', deleteError);
    }

    const soi6Bars = [
      {
        name: 'Windmill Bar',
        address: 'Soi 6, Pattaya',
        description: 'Famous bar on Soi 6',
        category_id: 1,
        latitude: 12.930817,
        longitude: 100.878319,
        zone: 'soi6'
      }
      // Add more bars as needed
    ];

    const { data, error } = await supabase
      .from('establishments')
      .insert(soi6Bars.map(bar => ({
        ...bar,
        status: 'pending',
        created_by: 1 // System user
      })));

    if (error) {
      throw error;
    }

    res.json({ message: `${soi6Bars.length} Soi 6 bars added successfully`, data });
  } catch (error: unknown) {
    logger.error('Error adding Soi 6 bars:', error);
    res.status(500).json({ error: 'Failed to add Soi 6 bars' });
  }
});

// Create basic consumables (NO AUTH)
router.post('/create-basic-consumables', async (req, res) => {
  try {
    const consumables = [
      { name: 'Beer Chang', category: 'beer', icon: '🍺', default_price: '80' },
      { name: 'Beer Leo', category: 'beer', icon: '🍺', default_price: '90' },
      { name: 'Beer Heineken', category: 'beer', icon: '🍺', default_price: '120' },
      { name: 'Whiskey Coke', category: 'cocktail', icon: '🥃', default_price: '150' },
      { name: 'Vodka Red Bull', category: 'cocktail', icon: '🍸', default_price: '180' },
      { name: 'Tequila Shot', category: 'shot', icon: '🥃', default_price: '100' }
    ];

    const { data, error } = await supabase
      .from('consumable_templates')
      .insert(consumables);

    if (error) {
      throw error;
    }

    res.json({ message: `${consumables.length} consumables created successfully`, data });
  } catch (error: unknown) {
    logger.error('Error creating consumables:', error);
    res.status(500).json({ error: 'Failed to create consumables' });
  }
});

// ========================================
// DASHBOARD STATISTICS
// ========================================

// GET /api/admin/dashboard-stats - Statistiques du dashboard
router.get('/dashboard-stats', async (req, res) => {
  logger.debug('Dashboard stats endpoint reached');
  try {
    // 🚀 OPTIMISATION: Une seule requête CTE parallèle au lieu de 8 requêtes séquentielles
    // Gain attendu: 2.5s → 0.2s (-90% temps de réponse)
    const { data: statsData, error } = await supabase.rpc('get_dashboard_stats');

    if (error) {
      // Fallback vers l'ancienne méthode si la fonction n'existe pas encore
      logger.warn('CTE function not available, using fallback method:', error.message);

      // Utiliser Promise.all pour paralléliser au maximum les requêtes existantes
      const [
        { count: totalEstablishments },
        { count: pendingEstablishments },
        { count: totalEmployees },
        { count: pendingEmployees },
        { count: totalUsers },
        { count: totalComments },
        { count: pendingComments },
        { count: reportedComments }
      ] = await Promise.all([
        supabase.from('establishments').select('id', { count: 'exact', head: true }),
        supabase.from('establishments').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('employees').select('*', { count: 'exact', head: true }),
        supabase.from('employees').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('comments').select('*', { count: 'exact', head: true }),
        supabase.from('comments').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending')
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

      return res.json({ stats });
    }

    // Utiliser les données de la fonction optimisée
    const stats = {
      totalEstablishments: statsData?.[0]?.total_establishments || 0,
      pendingEstablishments: statsData?.[0]?.pending_establishments || 0,
      totalEmployees: statsData?.[0]?.total_employees || 0,
      pendingEmployees: statsData?.[0]?.pending_employees || 0,
      totalUsers: statsData?.[0]?.total_users || 0,
      totalComments: statsData?.[0]?.total_comments || 0,
      pendingComments: statsData?.[0]?.pending_comments || 0,
      reportedComments: statsData?.[0]?.reported_comments || 0
    };

    res.json({ stats });
  } catch (error: unknown) {
    logger.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

// ========================================
// ESTABLISHMENTS MANAGEMENT
// ========================================

// GET /api/admin/establishments - Liste des établissements pour admin
router.get('/establishments', async (req, res) => {
  try {
    const { status } = req.query;
    
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
      throw error;
    }

    // Transform data to use numeric IDs
    const transformedData = (data || []).map(transformEstablishment);

    res.json({ establishments: transformedData });
  } catch (error: unknown) {
    logger.error('Error fetching establishments:', error);
    res.status(500).json({ error: 'Failed to fetch establishments' });
  }
});

// PUT /api/admin/establishments/:id - Éditer un établissement
router.put('/establishments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    logger.debug('=== ESTABLISHMENT UPDATE DEBUG ===');
    logger.debug('Establishment ID received:', id);
    logger.debug('Request Body:', JSON.stringify(req.body, null, 2));

    // Define allowed fields for establishment updates
    const allowedFieldNames = ['name', 'address', 'description', 'phone', 'website', 'logo_url', 'opening_hours', 'services', 'category_id', 'zone', 'grid_row', 'grid_col', 'ladydrink', 'barfine', 'rooms', 'location', 'status', 'pricing'];

    // Check for invalid fields
    const receivedFields = Object.keys(updateData);
    const invalidFields = receivedFields.filter(field => !allowedFieldNames.includes(field));

    if (invalidFields.length > 0) {
      return res.status(400).json({
        code: 'INVALID_FIELDS',
        error: 'Invalid fields provided',
        invalidFields,
        allowedFields: allowedFieldNames
      });
    }

    // Convert numeric ID to UUID if necessary
    const realUuid = await findUuidByNumber('establishments', id);
    if (!realUuid) {
      logger.error(`❌ Could not find establishment with ID: ${id}`);
      logger.debug(`💡 This might be a legacy ID from an old database structure.`);
      logger.debug(`🔧 Available solutions:`);
      logger.debug(`   1. Check if establishment was deleted or moved`);
      logger.debug(`   2. Verify ID format in frontend Admin panel`);
      logger.debug(`   3. Re-create establishment if needed`);

      return res.status(404).json({
        error: 'Establishment not found',
        message: `No establishment found with ID: ${id}. This might be a legacy ID that no longer exists in the database.`,
        suggestions: [
          'The establishment might have been deleted',
          'This could be a legacy ID from an old database structure',
          'Try refreshing the admin panel to get current establishment IDs',
          'Contact system administrator if this problem persists'
        ]
      });
    }

    logger.debug('✅ Using UUID:', realUuid);

    // Filter only allowed fields to prevent database errors (same approach as establishmentController)
    const allowedFields = {
      name: updateData.name,
      address: updateData.address,
      description: updateData.description,
      phone: updateData.phone,
      website: updateData.website,
      logo_url: updateData.logo_url, // Added for logo upload functionality
      opening_hours: updateData.opening_hours,
      services: updateData.services,
      category_id: updateData.category_id,
      zone: updateData.zone,
      grid_row: updateData.grid_row,
      grid_col: updateData.grid_col,
      ladydrink: updateData.ladydrink,
      barfine: updateData.barfine,
      rooms: updateData.rooms
      // Note: pricing is NOT saved to establishments table, handled separately
    };

    // Remove undefined values to avoid updating with null/undefined
    const cleanData = Object.fromEntries(
      Object.entries(allowedFields).filter(([_, value]) => value !== undefined)
    );

    const { data, error } = await supabase
      .from('establishments')
      .update({
        ...cleanData,
        updated_at: new Date().toISOString()
      })
      .eq('id', realUuid)
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
        logo_url,
        location,
        opening_hours,
        ladydrink,
        barfine,
        rooms,
        services,
        status,
        created_at,
        updated_at,
        created_by
      `)
      .single();

    if (error) {
      throw error;
    }

    res.json({ establishment: data });
  } catch (error: unknown) {
    logger.error('Error updating establishment:', error);
    res.status(500).json({ error: 'Failed to update establishment' });
  }
});

// POST /api/admin/establishments/:id/approve - Approuver un établissement
router.post('/establishments/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;

    logger.debug('=== ESTABLISHMENT APPROVE DEBUG ===');
    logger.debug('Establishment ID received for approval:', id);

    // Convert numeric ID to UUID if necessary
    const realUuid = await findUuidByNumber('establishments', id);
    if (!realUuid) {
      logger.error(`❌ Could not find establishment with ID: ${id} for approval`);
      return res.status(404).json({
        error: 'Establishment not found',
        message: `No establishment found with ID: ${id}. Cannot approve non-existent establishment.`,
        suggestions: [
          'The establishment might have been deleted',
          'This could be a legacy ID from an old database structure',
          'Try refreshing the admin panel to get current establishment IDs'
        ]
      });
    }

    logger.debug('✅ Using UUID for approval:', realUuid);

    const { data, error } = await supabase
      .from('establishments')
      .update({
        status: 'approved',
        updated_at: new Date().toISOString()
      })
      .eq('id', realUuid)
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
        ladydrink,
        barfine,
        rooms,
        services,
        status,
        created_at,
        updated_at,
        created_by
      `)
      .single();

    if (error) {
      throw error;
    }

    // Send approval notification to content creator
    if (data.created_by) {
      await notifyUserContentApproved(
        data.created_by,
        'establishment',
        data.name,
        data.id
      );
    }

    res.json({ establishment: data });
  } catch (error: unknown) {
    logger.error('Error approving establishment:', error);
    res.status(500).json({ error: 'Failed to approve establishment' });
  }
});

// POST /api/admin/establishments/:id/reject - Rejeter un établissement
router.post('/establishments/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Validate rejection reason is provided
    if (!reason || reason.trim() === '') {
      return res.status(400).json({
        code: 'REASON_REQUIRED',
        error: 'Rejection reason is required'
      });
    }

    logger.debug('=== ESTABLISHMENT REJECT DEBUG ===');
    logger.debug('Establishment ID received for rejection:', id);

    // Convert numeric ID to UUID if necessary
    const realUuid = await findUuidByNumber('establishments', id);
    if (!realUuid) {
      logger.error(`❌ Could not find establishment with ID: ${id} for rejection`);
      return res.status(404).json({
        error: 'Establishment not found',
        message: `No establishment found with ID: ${id}. Cannot reject non-existent establishment.`,
        suggestions: [
          'The establishment might have been deleted',
          'This could be a legacy ID from an old database structure',
          'Try refreshing the admin panel to get current establishment IDs'
        ]
      });
    }

    logger.debug('✅ Using UUID for rejection:', realUuid);

    const { data, error } = await supabase
      .from('establishments')
      .update({
        status: 'rejected',
        updated_at: new Date().toISOString()
      })
      .eq('id', realUuid)
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
        ladydrink,
        barfine,
        rooms,
        services,
        status,
        created_at,
        updated_at,
        created_by
      `)
      .single();

    if (error) {
      throw error;
    }

    // Send rejection notification to content creator
    if (data.created_by) {
      await notifyUserContentRejected(
        data.created_by,
        'establishment',
        reason,
        data.id
      );
    }

    // TODO: Optionellement enregistrer la raison du rejet dans une table séparée

    res.json({ establishment: data });
  } catch (error: unknown) {
    logger.error('Error rejecting establishment:', error);
    res.status(500).json({ error: 'Failed to reject establishment' });
  }
});

// DELETE /api/admin/establishments/:id - Supprimer un établissement
router.delete('/establishments/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('establishments')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Establishment not found' });
      }
      // Database error (constraint violation, etc.) - return 500
      throw error;
    }

    res.json({ message: 'Establishment deleted successfully', establishment: data });
  } catch (error: unknown) {
    logger.error('Error deleting establishment:', error);
    res.status(500).json({ error: 'Failed to delete establishment' });
  }
});

// ========================================
// ESTABLISHMENT OWNERS MANAGEMENT
// ========================================

// GET /api/admin/establishments/:id/owners - Get all owners of an establishment
router.get('/establishments/:id/owners', getEstablishmentOwners);

// POST /api/admin/establishments/:id/owners - Assign owner to establishment
router.post('/establishments/:id/owners', csrfProtection, assignEstablishmentOwner);

// DELETE /api/admin/establishments/:id/owners/:userId - Remove owner from establishment
router.delete('/establishments/:id/owners/:userId', csrfProtection, removeEstablishmentOwner);

// PATCH /api/admin/establishments/:id/owners/:userId - Update owner permissions
router.patch('/establishments/:id/owners/:userId', csrfProtection, updateEstablishmentOwnerPermissions);

// ========================================
// EMPLOYEES MANAGEMENT
// ========================================

// GET /api/admin/employees - Liste des employées pour admin
router.get('/employees', async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = supabase
      .from('employees')
      .select(`
        *,
        employment_history(
          id,
          establishment_id,
          establishment:establishments(id, name),
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
      logger.error('Supabase query error:', error);
      throw error;
    }

    logger.debug(`Found ${data?.length || 0} employees`);

    // Transform data using the utility function
    const transformedEmployees = (data || []).map((emp, index) => {
      try {
        const baseEmployee = transformEmployee(emp);
        return {
          ...baseEmployee,
          employment_history: emp.employment_history?.map((eh: DbEmploymentHistory) => ({
            id: eh.id,
            employee_id: emp.id,
            establishment_id: eh.establishment_id,
            establishment_name: eh.establishment?.name || 'Unknown',
            position: eh.position,
            start_date: eh.start_date,
            end_date: eh.end_date,
            is_current: eh.is_current,
            notes: `Working at ${eh.establishment?.name || 'Unknown'}`,
            created_by: emp.created_by || null,
            created_at: emp.created_at,
            updated_at: emp.updated_at,
            establishment: eh.establishment ? {
              ...eh.establishment,
              id: eh.establishment.id
            } : null
          })) || []
        };
      } catch (transformError) {
        logger.error(`Error transforming employee ${index}:`, transformError);
        logger.error('Employee data:', JSON.stringify(emp, null, 2));
        throw transformError;
      }
    });

    res.json({ employees: transformedEmployees });
  } catch (error: unknown) {
    logger.error('Error fetching employees:', error);
    if (error instanceof Error) {
      logger.error('Error stack:', error.stack);
    }
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

// PUT /api/admin/employees/:id - Éditer une employée
router.put('/employees/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    logger.debug('=== EMPLOYEE UPDATE DEBUG ===');
    logger.debug('Employee ID received:', id);
    logger.debug('Request Body:', JSON.stringify(req.body, null, 2));

    // Define allowed fields for employee updates
    const allowedFields = [
      'name', 'nickname', 'age', 'nationality', 'languages_spoken',
      'description', 'photos', 'social_media', 'status', 'self_removal_requested',
      'current_establishment_id', 'is_freelance'
    ];

    // Check for invalid fields
    const receivedFields = Object.keys(updateData);
    const invalidFields = receivedFields.filter(field => !allowedFields.includes(field));

    if (invalidFields.length > 0) {
      return res.status(400).json({
        code: 'INVALID_FIELDS',
        error: 'Invalid fields provided',
        invalidFields,
        allowedFields
      });
    }

    // Convert numeric ID to UUID if necessary
    const realUuid = await findUuidByNumber('employees', id);
    if (!realUuid) {
      logger.error(`❌ Could not find employee with ID: ${id}`);
      return res.status(404).json({
        error: 'Employee not found',
        message: `No employee found with ID: ${id}`
      });
    }

    logger.debug('✅ Using UUID:', realUuid);

    // Retirer les champs calculés/non modifiables
    const { id: _, created_at, updated_at, user, employment_history, current_establishment_id, ...cleanData } = updateData;

    logger.debug('Clean Data:', JSON.stringify(cleanData, null, 2));

    const { data, error } = await supabase
      .from('employees')
      .update({
        ...cleanData,
        updated_at: new Date().toISOString()
      })
      .eq('id', realUuid)
      .select('*')
      .single();

    if (error) {
      logger.error('Supabase update error:', error);
      throw error;
    }

    // Handle current_establishment_id change
    if (updateData.current_establishment_id) {
      logger.debug('🏢 Processing establishment change:', updateData.current_establishment_id);

      // Convert numeric establishment ID to UUID if necessary
      let establishmentUuid = updateData.current_establishment_id;

      // Check if it's a numeric ID that needs conversion
      if (typeof establishmentUuid === 'number' || /^\d+$/.test(establishmentUuid)) {
        establishmentUuid = await findUuidByNumber('establishments', establishmentUuid.toString());
        logger.debug('🏢 Converted establishment ID' + JSON.stringify({ from: updateData.current_establishment_id, to: establishmentUuid }));
      }

      if (establishmentUuid) {
        // Mark current employment as ended - first check if there are any current employments
        const { data: currentEmployments, error: checkError } = await supabase
          .from('employment_history')
          .select('id')
          .eq('employee_id', realUuid)
          .eq('is_current', true);

        if (checkError) {
          logger.error('❌ Error checking current employments:', checkError);
        }

        // Mark current employment as ended
        const { data: updatedEmployments, error: updateError } = await supabase
          .from('employment_history')
          .update({
            is_current: false,
            end_date: new Date().toISOString()
          })
          .eq('employee_id', realUuid)
          .eq('is_current', true)
          .select('id, establishment_id, is_current, end_date');

        if (updateError) {
          logger.error('❌ Error updating current employments:', updateError);
        }

        // Create new current employment
        const { data: newEmployment, error: empError } = await supabase
          .from('employment_history')
          .insert({
            employee_id: realUuid,
            establishment_id: establishmentUuid,
            position: 'Employee',
            start_date: new Date().toISOString(),
            is_current: true,
            notes: 'Updated via admin panel',
            created_by: req.user?.id || realUuid  // Use actual admin user ID
          })
          .select('id, establishment_id, is_current, start_date');

        if (empError) {
          logger.error('❌ Employment history insert error:', empError);
        }

        // Verify the operation was successful
        if (newEmployment && !empError) {
          // Update the current_establishment_id in the employees table
          const { error: updateEstError } = await supabase
            .from('employees')
            .update({ current_establishment_id: establishmentUuid })
            .eq('id', realUuid);

          if (updateEstError) {
            logger.error('❌ Error updating current_establishment_id:', updateEstError);
          } else {
            logger.debug(`✅ Employee ${realUuid} establishment updated to ${establishmentUuid}`);
          }
        }
      }
    }

    logger.debug('Employee updated successfully:', data);
    res.json({ employee: data });
  } catch (error: unknown) {
    logger.error('Error updating employee:', error);
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

// POST /api/admin/employees/:id/approve - Approuver une employée
router.post('/employees/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('employees')
      .update({
        status: 'approved',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Employee not found' });
      }
      throw error;
    }
    if (!data) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Send approval notification to content creator
    if (data.created_by) {
      await notifyUserContentApproved(
        data.created_by,
        'employee',
        data.name,
        data.id
      );

      // 🎮 Award bonus XP for approved employee profile
      try {
        await awardXP(
          data.created_by,
          10, // Bonus XP when employee profile is approved
          'profile_approved',
          'employee',
          data.id,
          'Employee profile approved by admin'
        );
        logger.info(`✅ Bonus XP awarded: +10 XP for approved employee ${data.id} to user ${data.created_by}`);
      } catch (xpError) {
        logger.error('Bonus XP award error:', xpError);
      }
    }

    res.json({ employee: data });
  } catch (error: unknown) {
    logger.error('Error approving employee:', error);
    res.status(500).json({ error: 'Failed to approve employee' });
  }
});

// POST /api/admin/employees/:id/reject - Rejeter une employée
router.post('/employees/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Validate rejection reason is provided
    if (!reason || reason.trim() === '') {
      return res.status(400).json({
        code: 'REASON_REQUIRED',
        error: 'Rejection reason is required'
      });
    }

    const { data, error } = await supabase
      .from('employees')
      .update({
        status: 'rejected',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    // Send rejection notification to content creator
    if (data.created_by) {
      await notifyUserContentRejected(
        data.created_by,
        'employee',
        reason,
        data.id
      );
    }

    res.json({ employee: data });
  } catch (error: unknown) {
    logger.error('Error rejecting employee:', error);
    res.status(500).json({ error: 'Failed to reject employee' });
  }
});

// ========================================
// USERS MANAGEMENT  
// ========================================

// GET /api/admin/user-stats/:id - Statistiques d'un utilisateur spécifique
router.get('/user-stats/:id', authenticateToken, requireRole(['admin', 'moderator']), async (req, res) => {
  try {
    const { id } = req.params;
    logger.debug('📊 Fetching user stats for:', id);

    // First check if user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', id)
      .single();

    if (userError) {
      if (userError.code === 'PGRST116') {
        return res.status(404).json({ error: 'User not found' });
      }
      throw userError;
    }
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Compter les établissements soumis par l'utilisateur
    const { data: establishmentsData, error: estError } = await supabase
      .from('establishments')
      .select('id')
      .eq('created_by', id);

    // Compter les employées soumises par l'utilisateur
    const { data: employeesData, error: empError } = await supabase
      .from('employees')
      .select('id')
      .eq('created_by', id);

    // Compter les commentaires faits par l'utilisateur
    const { data: commentsData, error: comError } = await supabase
      .from('comments')
      .select('id')
      .eq('user_id', id)
      .is('rating', null); // Seulement les vrais commentaires, pas les ratings

    if (estError || empError || comError) {
      logger.error('Error fetching user stats:', { estError, empError, comError });
    }

    const stats = {
      establishments_submitted: establishmentsData?.length || 0,
      employees_submitted: employeesData?.length || 0,
      comments_made: commentsData?.length || 0
    };

    logger.debug('✅ User stats calculated:', stats);
    res.json({ stats });

  } catch (error) {
    logger.error('Error calculating user stats:', error);
    res.status(500).json({
      error: 'Failed to calculate user stats',
      stats: {
        establishments_submitted: 0,
        employees_submitted: 0,
        comments_made: 0
      }
    });
  }
});

// GET /api/admin/users - Liste des utilisateurs pour admin
router.get('/users', async (req, res) => {
  try {
    const { role, active, search } = req.query;
    
    let query = supabase
      .from('users')
      .select(`
        id,
        pseudonym,
        email,
        role,
        created_at,
        updated_at,
        is_active
      `)
      .order('created_at', { ascending: false });

    if (role && role !== 'all') {
      if (role === 'inactive') {
        query = query.eq('is_active', false);
      } else {
        query = query.eq('role', role);
      }
    }

    if (active === 'false') {
      query = query.eq('is_active', false);
    }

    if (search) {
      query = query.or(`pseudonym.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    // Ajouter les statistiques pour chaque utilisateur
    const usersWithStats = await Promise.all(
      (data || []).map(async (user) => {
        // Compter les soumissions
        const { count: establishments_submitted } = await supabase
          .from('establishments')
          .select('*', { count: 'exact', head: true })
          .eq('created_by', user.id);

        const { count: employees_submitted } = await supabase
          .from('employees')
          .select('*', { count: 'exact', head: true })
          .eq('created_by', user.id);

        const { count: comments_made } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        return {
          ...user,
          stats: {
            establishments_submitted: establishments_submitted || 0,
            employees_submitted: employees_submitted || 0,
            comments_made: comments_made || 0
          }
        };
      })
    );

    res.json({ users: usersWithStats });
  } catch (error: unknown) {
    logger.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// PUT /api/admin/users/:id - Éditer un utilisateur
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Define allowed fields for user updates
    const allowedFields = ['pseudonym', 'email', 'role', 'is_active'];

    // Check for invalid fields
    const receivedFields = Object.keys(updateData);
    const invalidFields = receivedFields.filter(field => !allowedFields.includes(field));

    if (invalidFields.length > 0) {
      return res.status(400).json({
        code: 'INVALID_FIELDS',
        error: 'Invalid fields provided',
        invalidFields,
        allowedFields
      });
    }

    // Retirer les champs calculés/non modifiables et sensibles
    const { id: _, created_at, updated_at, stats, password, ...cleanData } = updateData;

    const { data, error } = await supabase
      .from('users')
      .update({
        ...cleanData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('id, pseudonym, email, role, created_at, updated_at, is_active')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'User not found' });
      }
      throw error;
    }
    if (!data) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: data });
  } catch (error: unknown) {
    logger.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// POST /api/admin/users/:id/role - Changer le rôle d'un utilisateur
router.post('/users/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['user', 'moderator', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const { data, error } = await supabase
      .from('users')
      .update({
        role,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('id, pseudonym, email, role, created_at, updated_at, is_active')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'User not found' });
      }
      throw error;
    }
    if (!data) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: data });
  } catch (error: unknown) {
    logger.error('Error updating user role:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// POST /api/admin/users/:id/toggle-active - Activer/désactiver un utilisateur
router.post('/users/:id/toggle-active', async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    // First check if user exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError || !existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Then update the user
    const { data, error } = await supabase
      .from('users')
      .update({
        is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('id, pseudonym, email, role, created_at, updated_at, is_active')
      .single();

    if (error) {
      // Database error during update - return 500
      throw error;
    }
    if (!data) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: data });
  } catch (error: unknown) {
    logger.error('Error toggling user status:', error);
    res.status(500).json({ error: 'Failed to toggle user status' });
  }
});

// ========================================
// CONSUMABLES MANAGEMENT
// ========================================

// GET /api/admin/consumables - Liste des consommables
router.get('/consumables', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('consumable_templates')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      throw error;
    }

    res.json({ consumables: data || [] });
  } catch (error: unknown) {
    logger.error('Error fetching consumables:', error);
    res.status(500).json({ error: 'Failed to fetch consumables' });
  }
});

// POST /api/admin/consumables - Créer un consommable
router.post('/consumables', async (req: AuthRequest, res) => {
  try {
    const { name, category, icon, default_price } = req.body;
    const userId = req.user?.id;

    const { data, error } = await supabase
      .from('consumable_templates')
      .insert({
        name,
        category,
        icon,
        default_price,
        status: 'active',
        created_by: userId
      })
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    res.json({ consumable: data });
  } catch (error: unknown) {
    logger.error('Error creating consumable:', error);
    res.status(500).json({ error: 'Failed to create consumable' });
  }
});

// PUT /api/admin/consumables/:id - Éditer un consommable
router.put('/consumables/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Retirer les champs calculés/non modifiables
    const { id: _, created_at, updated_at, created_by, ...cleanData } = updateData;

    const { data, error } = await supabase
      .from('consumable_templates')
      .update({
        ...cleanData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    res.json({ consumable: data });
  } catch (error: unknown) {
    logger.error('Error updating consumable:', error);
    res.status(500).json({ error: 'Failed to update consumable' });
  }
});

// DELETE /api/admin/consumables/:id - Supprimer un consommable
router.delete('/consumables/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('consumable_templates')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    res.json({ message: 'Consumable deleted successfully' });
  } catch (error: unknown) {
    logger.error('Error deleting consumable:', error);
    res.status(500).json({ error: 'Failed to delete consumable' });
  }
});

// PUT /api/admin/consumables/:id/status - Changer le statut d'un consommable
router.put('/consumables/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const { data, error } = await supabase
      .from('consumable_templates')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    res.json({ consumable: data });
  } catch (error: unknown) {
    logger.error('Error updating consumable status:', error);
    res.status(500).json({ error: 'Failed to update consumable status' });
  }
});

// ========================================
// ESTABLISHMENT ↔ CONSUMABLES ASSOCIATIONS
// ========================================

// GET /api/admin/establishments/:id/consumables - Menu d'un établissement
router.get('/establishments/:id/consumables', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('establishment_consumables')
      .select(`
        id,
        establishment_id,
        consumable_id,
        price,
        is_available,
        consumable:consumable_templates(*)
      `)
      .eq('establishment_id', id);

    if (error) {
      throw error;
    }

    res.json({ consumables: data || [] });
  } catch (error: unknown) {
    logger.error('Error fetching establishment consumables:', error);
    res.status(500).json({ error: 'Failed to fetch establishment consumables' });
  }
});

// POST /api/admin/establishments/:id/consumables - Ajouter un consommable au menu
router.post('/establishments/:id/consumables', async (req, res) => {
  try {
    const { id } = req.params;
    const { consumable_id, price, is_available = true } = req.body;

    const { data, error } = await supabase
      .from('establishment_consumables')
      .insert({
        establishment_id: id,
        consumable_id,
        price,
        is_available
      })
      .select(`
        id,
        establishment_id,
        consumable_id,
        price,
        is_available,
        consumable:consumable_templates(*)
      `)
      .single();

    if (error) {
      throw error;
    }

    res.json({ consumable: data });
  } catch (error: unknown) {
    logger.error('Error adding consumable to establishment:', error);
    res.status(500).json({ error: 'Failed to add consumable to establishment' });
  }
});

// PUT /api/admin/establishments/:establishment_id/consumables/:consumable_id - Modifier prix/disponibilité
router.put('/establishments/:establishment_id/consumables/:consumable_id', async (req, res) => {
  try {
    const { establishment_id, consumable_id } = req.params;
    const { price, is_available } = req.body;

    const { data, error } = await supabase
      .from('establishment_consumables')
      .update({ price, is_available })
      .eq('establishment_id', establishment_id)
      .eq('id', consumable_id)
      .select(`
        id,
        establishment_id,
        consumable_id,
        price,
        is_available,
        consumable:consumable_templates(*)
      `)
      .single();

    if (error) {
      throw error;
    }

    res.json({ consumable: data });
  } catch (error: unknown) {
    logger.error('Error updating establishment consumable:', error);
    res.status(500).json({ error: 'Failed to update establishment consumable' });
  }
});

// DELETE /api/admin/establishments/:establishment_id/consumables/:consumable_id - Retirer du menu
router.delete('/establishments/:establishment_id/consumables/:consumable_id', async (req, res) => {
  try {
    const { establishment_id, consumable_id } = req.params;

    const { error } = await supabase
      .from('establishment_consumables')
      .delete()
      .eq('establishment_id', establishment_id)
      .eq('id', consumable_id);

    if (error) {
      throw error;
    }

    res.json({ message: 'Consumable removed from establishment successfully' });
  } catch (error: unknown) {
    logger.error('Error removing consumable from establishment:', error);
    res.status(500).json({ error: 'Failed to remove consumable from establishment' });
  }
});

// ========================================
// COMMENTS/REVIEWS MANAGEMENT
// ========================================

// GET /api/admin/comments - Liste des commentaires pour modération
router.get('/comments', async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = supabase
      .from('comments')
      .select(`
        *,
        user:users(id, pseudonym),
        employee:employees(id, name, nickname)
      `)
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    res.json({ comments: data || [] });
  } catch (error: unknown) {
    logger.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// POST /api/admin/comments/:id/approve - Approuver un commentaire
router.post('/comments/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('comments')
      .update({
        status: 'approved',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Comment not found' });
      }
      throw error;
    }
    if (!data) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    res.json({ comment: data });
  } catch (error: unknown) {
    logger.error('Error approving comment:', error);
    res.status(500).json({ error: 'Failed to approve comment' });
  }
});

// POST /api/admin/comments/:id/reject - Rejeter un commentaire
router.post('/comments/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const { data, error } = await supabase
      .from('comments')
      .update({
        status: 'rejected',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Comment not found' });
      }
      throw error;
    }
    if (!data) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    res.json({ comment: data });
  } catch (error: unknown) {
    logger.error('Error rejecting comment:', error);
    res.status(500).json({ error: 'Failed to reject comment' });
  }
});

// POST /api/admin/comments/:id/dismiss-reports - Rejeter les signalements d'un commentaire
router.post('/comments/:id/dismiss-reports', async (req, res) => {
  try {
    const { id } = req.params;

    // First check if comment exists
    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .select('id')
      .eq('id', id)
      .single();

    if (commentError) {
      if (commentError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Comment not found' });
      }
      throw commentError;
    }
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Marquer tous les signalements comme rejetés
    const { error } = await supabase
      .from('reports')
      .update({
        status: 'dismissed',
        updated_at: new Date().toISOString()
      })
      .eq('comment_id', id)
      .eq('status', 'pending');

    if (error) {
      throw error;
    }

    res.json({ message: 'Reports dismissed successfully' });
  } catch (error: unknown) {
    logger.error('Error dismissing reports:', error);
    res.status(500).json({ error: 'Failed to dismiss reports' });
  }
});

// ========================================
// LEGACY ENDPOINTS (Migration & Setup)
// ========================================

// Ces endpoints sont conservés pour la migration et les tests
// Ils peuvent être utilisés pour remplir la base de données

// Add Soi 6 bars endpoint
router.post('/add-soi6-bars', async (req, res) => {
  try {
    // First delete existing Soi 6 bars (within 200m of center)
    const { error: deleteError } = await supabase
      .from('establishments')
      .delete()
      .filter('address', 'ilike', '%Soi 6%');

    if (deleteError) {
      logger.error('Delete error:', deleteError);
    }

    // Get Beer Bar category ID
    const { data: category } = await supabase
      .from('establishment_categories')
      .select('id')
      .eq('name', 'Beer Bar')
      .single();

    const beerBarCategoryId = category?.id;

    // Get Pub category ID
    const { data: pubCategory } = await supabase
      .from('establishment_categories')
      .select('id')
      .eq('name', 'Pub')
      .single();

    const pubCategoryId = pubCategory?.id;

    // Get admin user for created_by
    const { data: adminUser } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin')
      .limit(1)
      .single();

    const adminUserId = adminUser?.id || 1;

    // Add new Soi 6 bars
    const bars = [
      {
        name: 'Ruby Club',
        address: 'Soi 6, North Pattaya',
        zone: 'soi6',
        category_id: beerBarCategoryId,
        description: 'Large venue with sports bar atmosphere, friendly service, big screens. Local beers from 80 THB',
        status: 'pending',
        created_by: adminUserId
      },
      {
        name: 'Queen Victoria Inn',
        address: 'Soi 6, North Pattaya',
        zone: 'soi6',
        category_id: pubCategoryId,
        description: 'British-style pub with draught beers, ciders and pub grub. Only hotel directly on Soi 6',
        status: 'pending',
        created_by: adminUserId
      },
      {
        name: 'Butterfly Bar',
        address: 'Soi 6, North Pattaya',
        zone: 'soi6',
        category_id: beerBarCategoryId,
        description: 'Classic Soi 6 hostess bar with friendly atmosphere',
        status: 'pending',
        created_by: adminUserId
      },
      {
        name: 'Horny Bar',
        address: 'Soi 6, North Pattaya',
        zone: 'soi6',
        category_id: beerBarCategoryId,
        description: 'Popular short-time bar with lively atmosphere',
        status: 'pending',
        created_by: adminUserId
      },
      {
        name: 'Sexy in the City',
        address: 'Soi 6, North Pattaya',
        zone: 'soi6',
        category_id: beerBarCategoryId,
        description: 'Trendy bar with modern styling and attractive hostesses',
        status: 'pending',
        created_by: adminUserId
      },
      {
        name: 'Quicky Bar',
        address: 'Soi 6, North Pattaya',
        zone: 'soi6',
        category_id: beerBarCategoryId,
        description: 'No-nonsense bar popular with regulars',
        status: 'pending',
        created_by: adminUserId
      },
      {
        name: "Foxy's Bar",
        address: 'Soi 6, North Pattaya',
        zone: 'soi6',
        category_id: beerBarCategoryId,
        description: 'Cozy bar with friendly staff and good music',
        status: 'pending',
        created_by: adminUserId
      },
      {
        name: 'The Offshore Bar',
        address: 'Soi 6, North Pattaya',
        zone: 'soi6',
        category_id: beerBarCategoryId,
        description: 'Nautical-themed bar with sea-inspired decor',
        status: 'pending',
        created_by: adminUserId
      },
      {
        name: 'Route 69 Bar',
        address: 'Soi 6, North Pattaya',
        zone: 'soi6',
        category_id: beerBarCategoryId,
        description: 'Rock music themed bar with biker atmosphere',
        status: 'pending',
        created_by: adminUserId
      },
      {
        name: '3 Angels Bar',
        address: 'Soi 6, North Pattaya',
        zone: 'soi6',
        category_id: beerBarCategoryId,
        description: 'Small intimate bar with personal service',
        status: 'pending',
        created_by: adminUserId
      }
    ];

    const { data, error } = await supabase
      .from('establishments')
      .insert(bars)
      .select();

    if (error) {
      throw error;
    }

    res.json({ 
      message: `Successfully added ${data.length} Soi 6 bars`,
      bars: data
    });
  } catch (error: unknown) {
    logger.error('Error adding Soi 6 bars:', error);
    res.status(500).json({ error: 'Failed to add Soi 6 bars' });
  }
});

// Approve all Soi 6 bars
router.post('/approve-soi6-bars', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('establishments')
      .update({ status: 'approved' })
      .ilike('address', '%Soi 6%')
      .select();

    if (error) {
      throw error;
    }

    res.json({ 
      message: `Successfully approved ${data.length} Soi 6 bars`,
      bars: data
    });
  } catch (error: unknown) {
    logger.error('Error approving Soi 6 bars:', error);
    res.status(500).json({ error: 'Failed to approve Soi 6 bars' });
  }
});

// Create realistic employees
router.post('/create-realistic-employees', async (req, res) => {
  try {
    logger.debug('Starting realistic employee creation...');

    const thaiNames = [
      { name: 'Siriporn', nickname: 'Siri' },
      { name: 'Niran', nickname: 'Nira' },
      { name: 'Kannika', nickname: 'Kan' },
      { name: 'Ploy', nickname: 'Cherry' },
      { name: 'Malee', nickname: 'Mai' },
      { name: 'Joy', nickname: 'Joy' },
      { name: 'Lek', nickname: 'Lek' },
      { name: 'Bow', nickname: 'Bow' },
      { name: 'Gift', nickname: 'Gift' },
      { name: 'Mind', nickname: 'Mind' }
    ];

    const nationalities = ['Thai', 'Cambodian', 'Laotian'];
    
    const descriptions = [
      'Sweet and friendly, loves dancing and meeting new people.',
      'Experienced dancer with amazing energy and positive attitude.',
      'New but very enthusiastic! Learning English and loves to chat.',
      'Mature and sophisticated, perfect for conversation.',
      'Fun-loving girl who enjoys music and making friends.'
    ];

    // Get approved establishments
    const { data: establishments, error: estError } = await supabase
      .from('establishments')
      .select('id, name')
      .eq('status', 'approved');

    if (estError) {
      throw new Error(`Error fetching establishments: ${estError.message}`);
    }

    if (!establishments || establishments.length === 0) {
      return res.status(400).json({ error: 'No approved establishments found.' });
    }

    // Get admin user
    const { data: adminUser } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin')
      .limit(1)
      .single();

    if (!adminUser) {
      return res.status(400).json({ error: 'No admin user found.' });
    }

    // Create 30 unique employees (3 per establishment)
    const totalEmployees = Math.min(30, establishments.length * 3);
    const employeesToInsert = [];
    const employmentHistoryToInsert = [];
    const usedNames = new Set();

    for (let i = 0; i < totalEmployees; i++) {
      const nameIndex = i % thaiNames.length;
      const baseNameData = thaiNames[nameIndex];
      
      let uniqueName = baseNameData.name;
      let counter = 1;
      while (usedNames.has(uniqueName)) {
        uniqueName = `${baseNameData.name}${counter}`;
        counter++;
      }
      usedNames.add(uniqueName);

      const age = 18 + Math.floor(Math.random() * 10);
      const nationality = nationalities[Math.floor(Math.random() * nationalities.length)];
      const description = descriptions[Math.floor(Math.random() * descriptions.length)];
      
      const colors = ['FF1B8D', 'E91E63', '9C27B0', '673AB7', '3F51B5', '2196F3'];
      const color = colors[i % colors.length];
      
      const photos = [
        `https://placehold.co/300x400/${color}/FFFFFF?text=${uniqueName}`,
      ];

      const social_media = {
        instagram: `${uniqueName.toLowerCase()}_${baseNameData.nickname.toLowerCase()}`,
        line: `${uniqueName.toLowerCase()}line`
      };

      const employeeData = {
        name: uniqueName,
        nickname: baseNameData.nickname,
        age,
        nationality,
        description,
        photos,
        social_media,
        status: 'approved',
        self_removal_requested: false,
        created_by: adminUser.id
      };

      employeesToInsert.push(employeeData);
    }

    // Insert employees
    const { data: insertedEmployees, error: employeeError } = await supabase
      .from('employees')
      .insert(employeesToInsert)
      .select('id');

    if (employeeError) {
      throw new Error(`Error inserting employees: ${employeeError.message}`);
    }

    // Create employment relationships
    let employeeIndex = 0;
    for (const establishment of establishments) {
      const employeesPerBar = 3;
      
      for (let j = 0; j < employeesPerBar && employeeIndex < insertedEmployees.length; j++) {
        const employmentData = {
          employee_id: insertedEmployees[employeeIndex].id,
          establishment_id: establishment.id,
          position: 'Dancer/Hostess',
          start_date: '2024-01-01',
          end_date: null,
          is_current: true,
          notes: `Working at ${establishment.name}`,
          created_by: adminUser.id
        };

        employmentHistoryToInsert.push(employmentData);
        employeeIndex++;
      }
    }

    // Insert employment history
    const { error: historyError } = await supabase
      .from('employment_history')
      .insert(employmentHistoryToInsert);

    if (historyError) {
      throw new Error(`Error inserting employment history: ${historyError.message}`);
    }

    res.json({
      success: true,
      message: 'Realistic employees created successfully',
      stats: {
        establishments: establishments.length,
        employees: insertedEmployees.length,
        employmentRecords: employmentHistoryToInsert.length
      }
    });

  } catch (error: unknown) {
    logger.error('Employee creation error:', error);
    // SECURITY FIX: Don't expose error details to client
    res.status(500).json({
      error: 'Employee creation failed'
    });
  }
});

// Create basic consumables
router.post('/create-basic-consumables', async (req, res) => {
  try {
    logger.debug('Creating basic consumables...');

    // Get admin user
    const { data: adminUser } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin')
      .limit(1)
      .single();

    if (!adminUser) {
      return res.status(400).json({ error: 'No admin user found.' });
    }

    const consumables = [
      // Bières
      { name: 'Chang', category: 'beer', icon: '🍺', default_price: 70 },
      { name: 'Singha', category: 'beer', icon: '🍺', default_price: 80 },
      { name: 'Heineken', category: 'beer', icon: '🍺', default_price: 90 },
      { name: 'Tiger', category: 'beer', icon: '🍺', default_price: 85 },
      
      // Shots
      { name: 'Tequila Shot', category: 'shot', icon: '🥃', default_price: 150 },
      { name: 'Vodka Shot', category: 'shot', icon: '🥃', default_price: 120 },
      { name: 'Whiskey Shot', category: 'shot', icon: '🥃', default_price: 180 },
      
      // Cocktails
      { name: 'Mojito', category: 'cocktail', icon: '🍹', default_price: 200 },
      { name: 'Piña Colada', category: 'cocktail', icon: '🍹', default_price: 220 },
      { name: 'Sex on the Beach', category: 'cocktail', icon: '🍹', default_price: 200 },
      
      // Spiritueux
      { name: 'Whisky', category: 'spirit', icon: '🥂', default_price: 180 },
      { name: 'Vodka', category: 'spirit', icon: '🥂', default_price: 160 },
      { name: 'Rum', category: 'spirit', icon: '🥂', default_price: 170 },
      
      // Softs
      { name: 'Coca Cola', category: 'soft', icon: '🥤', default_price: 50 },
      { name: 'Sprite', category: 'soft', icon: '🥤', default_price: 50 },
      { name: 'Water', category: 'soft', icon: '🥤', default_price: 30 }
    ];

    const consumablesToInsert = consumables.map(c => ({
      ...c,
      status: 'active',
      created_by: adminUser.id
    }));

    const { data, error } = await supabase
      .from('consumable_templates')
      .insert(consumablesToInsert)
      .select();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: 'Basic consumables created successfully',
      consumables: data
    });

  } catch (error: unknown) {
    logger.error('Consumables creation error:', error);
    // SECURITY FIX: Don't expose error details to client
    res.status(500).json({
      error: 'Consumables creation failed'
    });
  }
});

export default router;
