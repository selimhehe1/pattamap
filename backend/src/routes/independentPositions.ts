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
router.get('/map', getFreelancesForMap); // Get all active freelance positions for the map

// Protected routes
router.get('/:employeeId', getIndependentPosition);
router.post('/', authenticateToken, createIndependentPosition);
router.put('/:employeeId', authenticateToken, updateIndependentPosition);
router.delete('/:employeeId', authenticateToken, deleteIndependentPosition);

export default router;
