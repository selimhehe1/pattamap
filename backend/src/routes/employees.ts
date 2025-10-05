import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import {
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  requestSelfRemoval,
  addEmployment,
  searchEmployees,
  getEmployeeNameSuggestions
} from '../controllers/employeeController';

const router = Router();

// Public routes
router.get('/', getEmployees);
router.get('/search', searchEmployees); // Advanced search endpoint
router.get('/suggestions/names', getEmployeeNameSuggestions); // Autocomplete suggestions
router.get('/:id', getEmployee);

// Protected routes
router.post('/', authenticateToken, createEmployee);
router.put('/:id', authenticateToken, updateEmployee);
router.delete('/:id', authenticateToken, deleteEmployee);

// Self-removal (special endpoint for employees to request removal)
router.post('/:id/request-removal', requestSelfRemoval);

// Employment history
router.post('/:id/employment', authenticateToken, addEmployment);

export default router;