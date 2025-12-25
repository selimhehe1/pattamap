"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const consumableController_1 = require("../controllers/consumableController");
const router = (0, express_1.Router)();
// Public route - Get all consumable templates
router.get('/', consumableController_1.getConsumableTemplates);
// Protected route - Create new consumable template (admin only)
router.post('/', auth_1.authenticateToken, consumableController_1.createConsumableTemplate);
exports.default = router;
//# sourceMappingURL=consumables.js.map