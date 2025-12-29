"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const favoriteController_1 = require("../controllers/favoriteController");
const auth_1 = require("../middleware/auth");
// Note: csrfProtection is applied at app.use level in server.ts
const router = express_1.default.Router();
router.get('/', auth_1.authenticateToken, favoriteController_1.getFavorites);
// CSRF protection already applied at app.use('/api/favorites', csrfProtection, ...) in server.ts
router.post('/', auth_1.authenticateToken, favoriteController_1.addFavorite);
router.delete('/:employee_id', auth_1.authenticateToken, favoriteController_1.removeFavorite);
router.get('/check/:employee_id', auth_1.authenticateToken, favoriteController_1.checkFavorite);
exports.default = router;
//# sourceMappingURL=favorites.js.map