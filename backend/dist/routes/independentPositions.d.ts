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
declare const router: import("express-serve-static-core").Router;
export default router;
//# sourceMappingURL=independentPositions.d.ts.map