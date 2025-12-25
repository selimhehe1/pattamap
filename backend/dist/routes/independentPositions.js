"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const independentPositionController_1 = require("../controllers/independentPositionController");
const router = (0, express_1.Router)();
// Public routes
// @deprecated v10.3 - Use /api/freelances instead
router.get('/map', independentPositionController_1.getFreelancesForMap); // Get all active freelance positions for the map
// Protected routes
// @deprecated v10.3 - Use /api/employees?type=freelance instead
router.get('/:employeeId', independentPositionController_1.getIndependentPosition);
// @deprecated v10.3 - Use /api/employees with is_freelance=true
router.post('/', auth_1.authenticateToken, independentPositionController_1.createIndependentPosition);
// @deprecated v10.3 - Use /api/employees/:id
router.put('/:employeeId', auth_1.authenticateToken, independentPositionController_1.updateIndependentPosition);
// @deprecated v10.3 - Use /api/employees/:id to end employment
router.delete('/:employeeId', auth_1.authenticateToken, independentPositionController_1.deleteIndependentPosition);
exports.default = router;
//# sourceMappingURL=independentPositions.js.map