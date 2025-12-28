"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const rateLimit_1 = require("../middleware/rateLimit");
const exportController_1 = require("../controllers/exportController");
const router = (0, express_1.Router)();
/**
 * @swagger
 * /api/export/favorites:
 *   get:
 *     summary: Export user's favorites to CSV
 *     tags: [Export]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: CSV file download
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *       401:
 *         description: Not authenticated
 */
router.get('/favorites', auth_1.authenticateToken, rateLimit_1.apiRateLimit, exportController_1.exportFavorites);
/**
 * @swagger
 * /api/export/visits:
 *   get:
 *     summary: Export user's visit history to CSV
 *     tags: [Export]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: CSV file download
 */
router.get('/visits', auth_1.authenticateToken, rateLimit_1.apiRateLimit, exportController_1.exportVisits);
/**
 * @swagger
 * /api/export/badges:
 *   get:
 *     summary: Export user's earned badges to CSV
 *     tags: [Export]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: CSV file download
 */
router.get('/badges', auth_1.authenticateToken, rateLimit_1.apiRateLimit, exportController_1.exportBadges);
/**
 * @swagger
 * /api/export/reviews:
 *   get:
 *     summary: Export user's reviews to CSV
 *     tags: [Export]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: CSV file download
 */
router.get('/reviews', auth_1.authenticateToken, rateLimit_1.apiRateLimit, exportController_1.exportReviews);
exports.default = router;
//# sourceMappingURL=export.js.map