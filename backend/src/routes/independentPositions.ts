/**
 * @deprecated since v10.3
 *
 * ⚠️ DEPRECATED: Independent Positions Routes
 *
 * These routes are deprecated as of v10.3. The independent_positions table
 * is no longer used for managing freelances.
 *
 * Migration Guide:
 * - GET /map → Use /api/freelances
 * - GET /:employeeId → Use /api/employees?type=freelance
 * - POST / → Use /api/employees with is_freelance=true and current_establishment_ids
 * - PUT /:employeeId → Use /api/employees/:id with current_establishment_ids
 * - DELETE /:employeeId → Use /api/employees/:id to end employment
 *
 * See: backend/database/migrations/013_refactor_freelance_nightclub_system.sql
 *
 * These routes are kept for backward compatibility but should not be used for new features.
 */

import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import {
  getIndependentPosition,
  createIndependentPosition,
  updateIndependentPosition,
  deleteIndependentPosition,
  getFreelancesForMap
} from '../controllers/independentPositionController';

const router = Router();

// Public routes
// @deprecated v10.3 - Use /api/freelances instead
router.get('/map', getFreelancesForMap); // Get all active freelance positions for the map

// Protected routes
// @deprecated v10.3 - Use /api/employees?type=freelance instead
router.get('/:employeeId', getIndependentPosition);
// @deprecated v10.3 - Use /api/employees with is_freelance=true
router.post('/', authenticateToken, createIndependentPosition);
// @deprecated v10.3 - Use /api/employees/:id
router.put('/:employeeId', authenticateToken, updateIndependentPosition);
// @deprecated v10.3 - Use /api/employees/:id to end employment
router.delete('/:employeeId', authenticateToken, deleteIndependentPosition);

export default router;
