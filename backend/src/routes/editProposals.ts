import express from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  createProposal,
  getProposals,
  getMyProposals,
  approveProposal,
  rejectProposal
} from '../controllers/editProposalController';

const router = express.Router();

// Middleware pour vérifier si l'utilisateur est admin ou moderator
const requireModeratorOrAdmin = (req: any, res: any, next: any) => {
  const userRole = req.user?.role;

  if (userRole === 'admin' || userRole === 'moderator') {
    next();
  } else {
    res.status(403).json({ error: 'Forbidden: Moderator or Admin role required' });
  }
};

// Routes publiques (authentification requise)
router.post('/', authenticateToken, createProposal);                      // Créer une proposition (tous users)
router.get('/my', authenticateToken, getMyProposals);                     // Mes propositions (tous users)

// Routes admin/moderator
router.get('/', authenticateToken, requireModeratorOrAdmin, getProposals); // Liste toutes les propositions
router.post('/:id/approve', authenticateToken, requireModeratorOrAdmin, approveProposal);
router.post('/:id/reject', authenticateToken, requireModeratorOrAdmin, rejectProposal);

export default router;