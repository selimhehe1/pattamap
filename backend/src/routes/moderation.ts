import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import {
  getModerationQueue,
  approveItem,
  rejectItem,
  getModerationStats,
  getReports,
  resolveReport
} from '../controllers/moderationController';

const router = Router();

// All moderation routes require admin or moderator role
router.use(authenticateToken);
router.use(requireRole(['admin', 'moderator']));

// Moderation queue
router.get('/queue', getModerationQueue);
router.get('/stats', getModerationStats);
router.post('/approve/:id', approveItem);
router.post('/reject/:id', rejectItem);

// Reports management
router.get('/reports', getReports);
router.post('/reports/resolve/:id', resolveReport);

export default router;