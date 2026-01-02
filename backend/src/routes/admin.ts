import express from 'express';
import { supabase } from '../config/supabase';
import { authenticateToken, requireRole } from '../middleware/auth';
import { csrfProtection } from '../middleware/csrf';
import { logger } from '../utils/logger';
import {
  getEstablishmentOwners,
  assignEstablishmentOwner,
  removeEstablishmentOwner,
  updateEstablishmentOwnerPermissions
} from '../controllers/establishmentOwnerController';

// Import split admin routes
import adminEmployeesRouter from './adminEmployees';
import adminUsersRouter from './adminUsers';
import adminConsumablesRouter from './adminConsumables';
import adminCommentsRouter from './adminComments';
import adminEstablishmentsRouter from './adminEstablishments';

// Import shared utilities
import { getDashboardStatsFallback } from './adminUtils';

const router = express.Router();

// FIRST ROUTE - Should work without any middleware (health check only)
router.get('/health', (req, res) => {
  res.json({ message: 'Admin router is working without authentication!' });
});

// ========================================
// AUTHENTICATION MIDDLEWARE - Protect ALL routes except /health
// ========================================
router.use((req, res, next) => {
  logger.debug('Admin route middleware reached for:', req.path);
  next();
});
router.use(authenticateToken);
router.use(requireRole(['admin', 'moderator']));

// ========================================
// MOUNT SUB-ROUTERS
// ========================================
router.use('/employees', adminEmployeesRouter);
router.use('/', adminUsersRouter); // user-stats and users routes
router.use('/consumables', adminConsumablesRouter);
router.use('/comments', adminCommentsRouter);
router.use('/establishments', adminEstablishmentsRouter);

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


// ========================================
// DASHBOARD STATISTICS
// ========================================

// GET /api/admin/dashboard-stats - Statistiques du dashboard
router.get('/dashboard-stats', async (req, res) => {
  logger.debug('Dashboard stats endpoint reached');
  try {
    // Try optimized RPC function first
    const { data: statsData, error } = await supabase.rpc('get_dashboard_stats');

    if (error) {
      // Fallback to parallel queries if RPC not available
      logger.warn('CTE function not available, using fallback method:', error.message);
      const stats = await getDashboardStatsFallback();
      return res.json({ stats });
    }

    // Use optimized RPC data
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
// LEGACY ENDPOINTS (Migration & Seeding)
// ========================================

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
