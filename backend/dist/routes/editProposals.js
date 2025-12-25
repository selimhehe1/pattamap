"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const editProposalController_1 = require("../controllers/editProposalController");
const router = express_1.default.Router();
// Middleware pour vérifier si l'utilisateur est admin ou moderator
const requireModeratorOrAdmin = (req, res, next) => {
    const userRole = req.user?.role;
    if (userRole === 'admin' || userRole === 'moderator') {
        next();
    }
    else {
        res.status(403).json({ error: 'Forbidden: Moderator or Admin role required' });
    }
};
// Routes publiques (authentification requise)
// Note: csrfProtection is applied globally at mount level in server.ts (line 755)
router.post('/', auth_1.authenticateToken, editProposalController_1.createProposal); // Créer une proposition (tous users)
router.get('/my', auth_1.authenticateToken, editProposalController_1.getMyProposals); // Mes propositions (tous users)
// Routes admin/moderator
router.get('/', auth_1.authenticateToken, requireModeratorOrAdmin, editProposalController_1.getProposals); // Liste toutes les propositions
router.post('/:id/approve', auth_1.authenticateToken, requireModeratorOrAdmin, editProposalController_1.approveProposal);
router.post('/:id/reject', auth_1.authenticateToken, requireModeratorOrAdmin, editProposalController_1.rejectProposal);
exports.default = router;
//# sourceMappingURL=editProposals.js.map