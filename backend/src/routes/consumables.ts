import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  getConsumableTemplates,
  createConsumableTemplate
} from '../controllers/consumableController';

const router = Router();

// Public route - Get all consumable templates
router.get('/', getConsumableTemplates);

// Protected route - Create new consumable template (admin only)
router.post('/', authenticateToken, createConsumableTemplate);

export default router;