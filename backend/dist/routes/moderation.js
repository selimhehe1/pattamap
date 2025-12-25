"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const moderationController_1 = require("../controllers/moderationController");
const router = (0, express_1.Router)();
// All moderation routes require admin or moderator role
router.use(auth_1.authenticateToken);
router.use((0, auth_1.requireRole)(['admin', 'moderator']));
// Moderation queue
router.get('/queue', moderationController_1.getModerationQueue);
router.get('/stats', moderationController_1.getModerationStats);
router.post('/approve/:id', moderationController_1.approveItem);
router.post('/reject/:id', moderationController_1.rejectItem);
// Reports management
router.get('/reports', moderationController_1.getReports);
router.post('/reports/resolve/:id', moderationController_1.resolveReport);
exports.default = router;
//# sourceMappingURL=moderation.js.map