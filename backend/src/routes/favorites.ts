import express from 'express';
import {
  getFavorites,
  addFavorite,
  removeFavorite,
  checkFavorite
} from '../controllers/favoriteController';
import { authenticateToken } from '../middleware/auth';
// Note: csrfProtection is applied at app.use level in server.ts

const router = express.Router();

router.get('/', authenticateToken, getFavorites);

// CSRF protection already applied at app.use('/api/favorites', csrfProtection, ...) in server.ts
router.post('/', authenticateToken, addFavorite);

router.delete('/:employee_id', authenticateToken, removeFavorite);

router.get('/check/:employee_id', authenticateToken, checkFavorite);

export default router;