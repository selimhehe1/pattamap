import express from 'express';
import {
  getFavorites,
  addFavorite,
  removeFavorite,
  checkFavorite
} from '../controllers/favoriteController';
import { authenticateToken } from '../middleware/auth';
import { csrfProtection } from '../middleware/csrf';

const router = express.Router();

router.get('/', authenticateToken, getFavorites);

router.post('/', authenticateToken, csrfProtection, addFavorite);

router.delete('/:employee_id', authenticateToken, csrfProtection, removeFavorite);

router.get('/check/:employee_id', authenticateToken, checkFavorite);

export default router;