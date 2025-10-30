# 👥 Owner Employee Management - Plan d'Implémentation

**Version**: 1.0
**Date**: Janvier 2025
**Statut**: Plan d'Implémentation - Phase 0 (Prerequisite VIP)
**Priorité**: 🔴 Critique
**Durée estimée**: 1-2 jours

---

## 📋 Table des Matières

1. [Vue d'Ensemble](#1-vue-densemble)
2. [Day 1 - Backend + Database](#2-day-1---backend--database)
3. [Day 2 - Frontend + Integration](#3-day-2---frontend--integration)
4. [Testing & Validation](#4-testing--validation)
5. [Déploiement](#5-déploiement)
6. [Post-Implementation](#6-post-implementation)

---

## 1. Vue d'Ensemble

### 1.1 Objectif

Permettre aux **Establishment Owners** de voir et gérer leurs employées AVANT d'implémenter le système VIP.

**Bloqueur résolu**: Owners ne peuvent actuellement pas voir qui sont leurs employées, ce qui bloque l'achat VIP pour employées.

### 1.2 Scope

**Inclus** (Phase 0 - Minimum Viable):
- ✅ Backend endpoint `GET /api/establishments/:id/employees`
- ✅ Frontend component `MyEmployeesList.tsx`
- ✅ Integration dans `MyEstablishmentsPage.tsx`
- ✅ Permission check `can_edit_employees`
- ✅ VIP status display (is_vip, expires_at)
- ✅ Bouton "Buy VIP" (navigation vers future page)

**Exclu** (Futures phases):
- ❌ VIP purchase flow (Phase 1-3)
- ❌ Employee roster management (add/remove)
- ❌ Employee analytics détaillés
- ❌ Bulk operations

### 1.3 Dépendances

**Requiert**:
- ✅ Table `establishment_owners` existante (v10.1)
- ✅ Table `current_employment` existante
- ✅ Table `employees` existante
- ✅ Auth system (JWT, CSRF) existant
- ✅ Permission `can_edit_employees` déjà dans JSONB

**Prépare pour**:
- 🚀 VIP System (Phase 1-3) - Bouton "Buy VIP" utilisera ce endpoint

### 1.4 Timeline

```
Phase 0: Owner Employee Management (1-2 jours)
├── Day 1 (Matin)   : Database + Backend (4h)
├── Day 1 (Après-midi): Backend Tests (4h)
├── Day 2 (Matin)   : Frontend Component (4h)
└── Day 2 (Après-midi): Integration + QA (4h)

→ Phase 1-3: VIP System (8 jours)
```

---

## 2. Day 1 - Backend + Database

### 2.1 Morning (4h) - Backend Implementation

#### Task 2.1.1 - Create Controller (1h)

**Fichier**: `backend/src/controllers/establishmentController.ts`

**Ajouter fonction**:

```typescript
/**
 * GET /api/establishments/:id/employees
 *
 * Returns all employees working at an establishment.
 * Only accessible by establishment owners/managers.
 *
 * @param req.params.id - Establishment ID
 * @param req.user.id - Current user ID
 * @returns { employees[], total, establishment }
 */
export const getEstablishmentEmployees = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params; // establishment_id
    const user_id = req.user?.id;

    // 1. Check ownership
    const { data: ownership, error: ownershipError } = await supabase
      .from('establishment_owners')
      .select('*')
      .eq('user_id', user_id)
      .eq('establishment_id', id)
      .single();

    if (ownershipError || !ownership) {
      return res.status(403).json({
        error: 'You are not authorized to view employees of this establishment'
      });
    }

    // 2. Fetch establishment info
    const { data: establishment, error: estError } = await supabase
      .from('establishments')
      .select('id, name, zone')
      .eq('id', id)
      .single();

    if (estError) {
      logger.error('Establishment not found:', estError);
      return res.status(404).json({ error: 'Establishment not found' });
    }

    // 3. Fetch employees via current_employment
    const { data: employments, error: empError } = await supabase
      .from('current_employment')
      .select(`
        employee_id,
        start_date,
        employee:employees!current_employment_employee_id_fkey(
          id,
          name,
          age,
          nationality,
          photos,
          status,
          average_rating,
          comment_count
        )
      `)
      .eq('establishment_id', id);

    if (empError) {
      logger.error('Failed to fetch employees:', empError);
      return res.status(500).json({ error: 'Failed to fetch employees' });
    }

    // 4. Extract employees and add current_employment info
    const employees = employments
      .filter(emp => emp.employee) // Filter out null employees
      .map(emp => ({
        ...emp.employee,
        current_employment: {
          establishment_id: id,
          establishment_name: establishment.name,
          start_date: emp.start_date
        }
      }));

    // 5. Fetch VIP status for each employee (parallel)
    const employeesWithVIP = await Promise.all(
      employees.map(async (emp) => {
        // Check if employee_vip_subscriptions table exists (will in Phase 1-3)
        // For now, return default values
        try {
          const { data: vipSub } = await supabase
            .from('employee_vip_subscriptions')
            .select('id, expires_at, status')
            .eq('employee_id', emp.id)
            .eq('status', 'active')
            .gte('expires_at', new Date().toISOString())
            .maybeSingle();

          return {
            ...emp,
            is_vip: !!vipSub,
            vip_expires_at: vipSub?.expires_at || null
          };
        } catch (error) {
          // Table doesn't exist yet (VIP not implemented)
          return {
            ...emp,
            is_vip: false,
            vip_expires_at: null
          };
        }
      })
    );

    res.json({
      employees: employeesWithVIP,
      total: employeesWithVIP.length,
      establishment
    });

  } catch (error) {
    logger.error('Get establishment employees error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
```

**Notes importantes**:
- ✅ Authorization check (ownership verification)
- ✅ Handle VIP table not existing yet (try/catch)
- ✅ Filter null employees (safety)
- ✅ Parallel VIP queries (Promise.all)

#### Task 2.1.2 - Create Route (30min)

**Fichier**: `backend/src/routes/establishments.ts`

**Ajouter route**:

```typescript
import { getEstablishmentEmployees } from '../controllers/establishmentController';

/**
 * GET /api/establishments/:id/employees
 * Get employees of establishment (owner only)
 */
router.get(
  '/:id/employees',
  authenticateToken,
  establishmentController.getEstablishmentEmployees
);
```

**Rate Limiting** (optionnel mais recommandé):

```typescript
// backend/src/middleware/rateLimiter.ts

export const establishmentEmployeesRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Max 30 requests per minute
  message: 'Too many requests to view employees',
  keyGenerator: (req: AuthRequest) => req.user?.id || req.ip,
  standardHeaders: true,
  legacyHeaders: false
});

// Apply to route
router.get(
  '/:id/employees',
  authenticateToken,
  establishmentEmployeesRateLimiter, // ← Add rate limiter
  establishmentController.getEstablishmentEmployees
);
```

#### Task 2.1.3 - Update Swagger Docs (30min)

**Fichier**: `backend/src/config/swagger.ts`

**Ajouter endpoint documentation**:

```typescript
/**
 * @swagger
 * /api/establishments/{id}/employees:
 *   get:
 *     summary: Get employees of establishment
 *     description: Returns all employees working at the establishment. Only accessible by establishment owners/managers.
 *     tags: [Establishments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Establishment ID
 *     responses:
 *       200:
 *         description: Employees retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 employees:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                       age:
 *                         type: integer
 *                       nationality:
 *                         type: string
 *                       photos:
 *                         type: array
 *                         items:
 *                           type: string
 *                       status:
 *                         type: string
 *                         enum: [pending, approved, rejected]
 *                       average_rating:
 *                         type: number
 *                         nullable: true
 *                       comment_count:
 *                         type: integer
 *                       is_vip:
 *                         type: boolean
 *                       vip_expires_at:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                       current_employment:
 *                         type: object
 *                         properties:
 *                           establishment_id:
 *                             type: string
 *                             format: uuid
 *                           establishment_name:
 *                             type: string
 *                           start_date:
 *                             type: string
 *                             format: date-time
 *                 total:
 *                   type: integer
 *                 establishment:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *                     zone:
 *                       type: string
 *       403:
 *         description: Not authorized (user is not owner/manager)
 *       404:
 *         description: Establishment not found
 *       500:
 *         description: Internal server error
 */
```

#### Task 2.1.4 - Test Backend Manually (1h)

**Postman/Thunder Client**:

```bash
# 1. Login as establishment owner
POST http://localhost:8080/api/auth/login
Body: { "email": "owner@example.com", "password": "..." }
→ Copy access_token

# 2. Get owned establishments
GET http://localhost:8080/api/establishments/my-owned
Headers: { "Authorization": "Bearer <token>" }
→ Copy establishment.id

# 3. Get employees
GET http://localhost:8080/api/establishments/<establishment_id>/employees
Headers: { "Authorization": "Bearer <token>" }

# Expected Response:
{
  "employees": [
    {
      "id": "...",
      "name": "Anna",
      "age": 22,
      "nationality": "Thai",
      "photos": ["..."],
      "status": "approved",
      "average_rating": 4.8,
      "comment_count": 23,
      "is_vip": false,
      "vip_expires_at": null,
      "current_employment": {
        "establishment_id": "...",
        "establishment_name": "Bar ABC",
        "start_date": "2024-01-15T00:00:00Z"
      }
    }
  ],
  "total": 5,
  "establishment": {
    "id": "...",
    "name": "Bar ABC",
    "zone": "soi6"
  }
}
```

**Test Cases**:
- ✅ Valid owner → Returns employees
- ✅ Unauthorized user → 403
- ✅ Invalid establishment_id → 404
- ✅ Establishment with no employees → Empty array
- ✅ VIP employee → is_vip: true (when VIP table exists)

### 2.2 Afternoon (4h) - Backend Tests

#### Task 2.2.1 - Create Test File (2h)

**Fichier**: `backend/src/controllers/__tests__/establishmentController.test.ts`

**Tests**:

```typescript
import request from 'supertest';
import app from '../../server';
import { supabase } from '../../config/supabase';

describe('GET /api/establishments/:id/employees', () => {
  let ownerToken: string;
  let otherUserToken: string;
  let establishment: any;
  let employee1: any;
  let employee2: any;

  beforeAll(async () => {
    // Setup: Create owner, establishment, employees
    // ... (similar to existing tests)
  });

  afterAll(async () => {
    // Cleanup
  });

  describe('Authorization', () => {
    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .get(`/api/establishments/${establishment.id}/employees`);

      expect(response.status).toBe(401);
    });

    it('should return 403 if user is not owner/manager', async () => {
      const response = await request(app)
        .get(`/api/establishments/${establishment.id}/employees`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Not authorized');
    });

    it('should return 200 if user is owner', async () => {
      const response = await request(app)
        .get(`/api/establishments/${establishment.id}/employees`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('Response Format', () => {
    it('should return employees with correct structure', async () => {
      const response = await request(app)
        .get(`/api/establishments/${establishment.id}/employees`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('employees');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('establishment');

      expect(Array.isArray(response.body.employees)).toBe(true);
      expect(response.body.total).toBe(2);
      expect(response.body.establishment.name).toBe(establishment.name);
    });

    it('should include employee basic info', async () => {
      const response = await request(app)
        .get(`/api/establishments/${establishment.id}/employees`)
        .set('Authorization', `Bearer ${ownerToken}`);

      const employee = response.body.employees[0];
      expect(employee).toHaveProperty('id');
      expect(employee).toHaveProperty('name');
      expect(employee).toHaveProperty('age');
      expect(employee).toHaveProperty('nationality');
      expect(employee).toHaveProperty('photos');
      expect(employee).toHaveProperty('status');
    });

    it('should include VIP status fields', async () => {
      const response = await request(app)
        .get(`/api/establishments/${establishment.id}/employees`)
        .set('Authorization', `Bearer ${ownerToken}`);

      const employee = response.body.employees[0];
      expect(employee).toHaveProperty('is_vip');
      expect(employee).toHaveProperty('vip_expires_at');
      expect(typeof employee.is_vip).toBe('boolean');
    });

    it('should include current_employment info', async () => {
      const response = await request(app)
        .get(`/api/establishments/${establishment.id}/employees`)
        .set('Authorization', `Bearer ${ownerToken}`);

      const employee = response.body.employees[0];
      expect(employee).toHaveProperty('current_employment');
      expect(employee.current_employment).toHaveProperty('establishment_id');
      expect(employee.current_employment).toHaveProperty('establishment_name');
      expect(employee.current_employment).toHaveProperty('start_date');
    });
  });

  describe('Edge Cases', () => {
    it('should return empty array if establishment has no employees', async () => {
      // Create establishment without employees
      const { data: emptyEst } = await supabase
        .from('establishments')
        .insert({ name: 'Empty Bar', zone: 'soi6' })
        .select()
        .single();

      // Assign ownership
      await supabase
        .from('establishment_owners')
        .insert({ user_id: ownerId, establishment_id: emptyEst.id, owner_role: 'owner' });

      const response = await request(app)
        .get(`/api/establishments/${emptyEst.id}/employees`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.employees).toEqual([]);
      expect(response.body.total).toBe(0);
    });

    it('should filter out rejected employees', async () => {
      // Set employee1 as rejected
      await supabase
        .from('employees')
        .update({ status: 'rejected' })
        .eq('id', employee1.id);

      const response = await request(app)
        .get(`/api/establishments/${establishment.id}/employees`)
        .set('Authorization', `Bearer ${ownerToken}`);

      const employeeIds = response.body.employees.map(e => e.id);
      expect(employeeIds).not.toContain(employee1.id);
    });

    it('should return 404 if establishment does not exist', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .get(`/api/establishments/${fakeId}/employees`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(404);
    });
  });
});
```

#### Task 2.2.2 - Run Tests (30min)

```bash
cd backend
npm test -- establishmentController.test.ts

# Expected: All tests pass ✅
```

#### Task 2.2.3 - Update Coverage (30min)

```bash
npm run test:coverage

# Check coverage for establishmentController.ts
# Target: ≥85% coverage
```

#### Task 2.2.4 - Fix Issues (1h buffer)

- Corriger tests échoués
- Ajouter tests manquants
- Refactor si nécessaire

---

## 3. Day 2 - Frontend + Integration

### 3.1 Morning (4h) - Frontend Component

#### Task 3.1.1 - Create MyEmployeesList Component (2h)

**Fichier**: `src/components/Owner/MyEmployeesList.tsx`

**Code**:

```typescript
import React, { useState, useEffect } from 'react';
import { useSecureFetch } from '../../hooks/useSecureFetch';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import EmployeeCard from '../Common/EmployeeCard';
import { Employee } from '../../types';
import './MyEmployeesList.css';

interface Props {
  establishmentId: string;
  establishmentName: string;
  canEditEmployees: boolean;
}

const MyEmployeesList: React.FC<Props> = ({
  establishmentId,
  establishmentName,
  canEditEmployees
}) => {
  const { secureFetch } = useSecureFetch();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEmployees();
  }, [establishmentId]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await secureFetch(
        `${process.env.REACT_APP_API_URL}/api/establishments/${establishmentId}/employees`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch employees');
      }

      const data = await response.json();
      setEmployees(data.employees || []);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
      setError('Failed to load employees. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBuyVIP = (employeeId: string) => {
    // Navigate to VIP purchase page (will be implemented in Phase 1-3)
    navigate(`/vip/purchase/employee/${employeeId}`);
  };

  if (loading) {
    return (
      <div className="my-employees-list-loading">
        <div className="spinner"></div>
        <p>{t('myEmployees.loading', 'Loading employees...')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-employees-list-error">
        <p className="error-message">{error}</p>
        <button onClick={fetchEmployees} className="btn-retry">
          {t('common.retry', 'Retry')}
        </button>
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <div className="my-employees-list-empty">
        <p>{t('myEmployees.noEmployees', 'No employees found for {{name}}', { name: establishmentName })}</p>
        <p className="hint">{t('myEmployees.hint', 'Employees will appear here once they are linked to this establishment.')}</p>
      </div>
    );
  }

  return (
    <div className="my-employees-list">
      <h3>
        {t('myEmployees.title', 'Employees at {{name}}', { name: establishmentName })}
        {' '}
        <span className="employee-count">({employees.length})</span>
      </h3>

      {!canEditEmployees && (
        <div className="permission-warning">
          ⚠️ {t('myEmployees.readOnly', 'You have read-only access to employees')}
          <br />
          {t('myEmployees.contactAdmin', 'Contact admin to request can_edit_employees permission')}
        </div>
      )}

      <div className="employees-grid">
        {employees.map(employee => (
          <div key={employee.id} className="employee-item">
            <EmployeeCard
              employee={employee}
              onClick={() => navigate(`/employee/${employee.id}`)}
              showEstablishment={false}
            />

            {/* VIP Actions */}
            <div className="employee-actions">
              {employee.is_vip ? (
                <div className="vip-status-badge">
                  👑 {t('myEmployees.vipActive', 'VIP Active')}
                  {employee.vip_expires_at && (
                    <span className="expiry">
                      {t('myEmployees.expires', 'Expires')}: {new Date(employee.vip_expires_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              ) : (
                canEditEmployees ? (
                  <button
                    className="btn-buy-vip"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBuyVIP(employee.id);
                    }}
                  >
                    👑 {t('myEmployees.buyVIP', 'Buy VIP')}
                  </button>
                ) : (
                  <div className="no-permission-hint">
                    {t('myEmployees.contactAdminVIP', 'Contact admin to buy VIP')}
                  </div>
                )
              )}
            </div>

            {/* Stats Summary */}
            <div className="employee-stats-summary">
              <span title={t('myEmployees.profileViews', 'Profile Views')}>
                👁️ {employee.total_views || 0}
              </span>
              <span title={t('myEmployees.favorites', 'Favorites')}>
                ⭐ {employee.total_favorites || 0}
              </span>
              <span title={t('myEmployees.rating', 'Rating')}>
                🌟 {employee.average_rating?.toFixed(1) || 'N/A'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyEmployeesList;
```

#### Task 3.1.2 - Create CSS (1h)

**Fichier**: `src/components/Owner/MyEmployeesList.css`

```css
/* My Employees List */
.my-employees-list {
  padding: 20px;
}

.my-employees-list h3 {
  margin-bottom: 20px;
  color: var(--text-primary);
  font-size: 1.5rem;
}

.employee-count {
  color: var(--text-muted);
  font-size: 1rem;
}

/* Permission Warning */
.permission-warning {
  padding: 16px;
  margin-bottom: 20px;
  background: rgba(255, 193, 7, 0.1);
  border: 1px solid rgba(255, 193, 7, 0.3);
  border-radius: 8px;
  color: var(--text-primary);
  text-align: center;
  font-size: 0.875rem;
}

/* Employees Grid */
.employees-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.employee-item {
  position: relative;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px;
  background: var(--bg-secondary);
  transition: all 0.3s ease;
}

.employee-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
}

/* VIP Actions */
.employee-actions {
  margin-top: 12px;
  display: flex;
  justify-content: center;
}

.btn-buy-vip {
  width: 100%;
  padding: 10px;
  background: linear-gradient(135deg, #FFD700, #FFA500);
  color: #000;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.875rem;
}

.btn-buy-vip:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(255, 215, 0, 0.4);
}

.vip-status-badge {
  width: 100%;
  padding: 10px;
  background: linear-gradient(135deg, #FFD700, #FFA500);
  color: #000;
  border-radius: 8px;
  text-align: center;
  font-weight: bold;
  font-size: 0.875rem;
}

.vip-status-badge .expiry {
  display: block;
  font-size: 0.75rem;
  margin-top: 4px;
  opacity: 0.8;
}

.no-permission-hint {
  width: 100%;
  padding: 10px;
  background: var(--bg-tertiary);
  color: var(--text-muted);
  border-radius: 8px;
  text-align: center;
  font-size: 0.875rem;
}

/* Employee Stats Summary */
.employee-stats-summary {
  margin-top: 12px;
  display: flex;
  justify-content: space-around;
  padding: 8px;
  background: var(--bg-tertiary);
  border-radius: 8px;
  font-size: 0.875rem;
}

.employee-stats-summary span {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--text-primary);
}

/* Loading State */
.my-employees-list-loading {
  padding: 40px;
  text-align: center;
  color: var(--text-muted);
}

.my-employees-list-loading .spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--border-color);
  border-top-color: var(--primary);
  border-radius: 50%;
  margin: 0 auto 16px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Error State */
.my-employees-list-error {
  padding: 40px;
  text-align: center;
}

.error-message {
  color: var(--danger);
  margin-bottom: 16px;
}

.btn-retry {
  padding: 10px 20px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.3s ease;
}

.btn-retry:hover {
  background: var(--primary-dark);
}

/* Empty State */
.my-employees-list-empty {
  padding: 40px;
  text-align: center;
  color: var(--text-muted);
}

.my-employees-list-empty .hint {
  margin-top: 8px;
  font-size: 0.875rem;
  opacity: 0.7;
}

/* Responsive */
@media (max-width: 768px) {
  .employees-grid {
    grid-template-columns: 1fr;
  }

  .my-employees-list {
    padding: 12px;
  }

  .my-employees-list h3 {
    font-size: 1.25rem;
  }
}
```

#### Task 3.1.3 - Add i18n Translations (1h)

**Fichier**: `src/i18n/locales/en.json` (et autres langues)

**Ajouter clés**:

```json
{
  "myEmployees": {
    "loading": "Loading employees...",
    "noEmployees": "No employees found for {{name}}",
    "hint": "Employees will appear here once they are linked to this establishment.",
    "title": "Employees at {{name}}",
    "readOnly": "You have read-only access to employees",
    "contactAdmin": "Contact admin to request can_edit_employees permission",
    "vipActive": "VIP Active",
    "expires": "Expires",
    "buyVIP": "Buy VIP",
    "contactAdminVIP": "Contact admin to buy VIP",
    "profileViews": "Profile Views",
    "favorites": "Favorites",
    "rating": "Rating"
  }
}
```

**Traduire** dans `th.json`, `ru.json`, `zh.json`, `fr.json`, `hi.json`.

### 3.2 Afternoon (4h) - Integration

#### Task 3.2.1 - Update MyEstablishmentsPage (1.5h)

**Fichier**: `src/components/MyEstablishmentsPage.tsx`

**Modifications**:

```typescript
import MyEmployeesList from './Owner/MyEmployeesList';

// ... dans le composant

const [selectedEstablishmentForEmployees, setSelectedEstablishmentForEmployees] = useState<any>(null);

// ... dans le render de chaque establishment card

<button
  onClick={() => setSelectedEstablishmentForEmployees(establishment)}
  className="btn-view-employees"
>
  👥 {t('myEstablishments.viewEmployees', 'View Employees')}
</button>

// ... à la fin du render (après la liste)

{/* Employees Modal */}
{selectedEstablishmentForEmployees && (
  <div className="employees-modal-overlay" onClick={() => setSelectedEstablishmentForEmployees(null)}>
    <div className="employees-modal-content" onClick={(e) => e.stopPropagation()}>
      <button
        className="close-modal"
        onClick={() => setSelectedEstablishmentForEmployees(null)}
        aria-label="Close"
      >
        ✕
      </button>

      <MyEmployeesList
        establishmentId={selectedEstablishmentForEmployees.id}
        establishmentName={selectedEstablishmentForEmployees.name}
        canEditEmployees={selectedEstablishmentForEmployees.permissions.can_edit_employees}
      />
    </div>
  </div>
)}
```

**CSS à ajouter** dans `MyEstablishmentsPage.css`:

```css
/* View Employees Button */
.btn-view-employees {
  margin-left: 8px;
  padding: 8px 16px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.3s ease;
  font-size: 0.875rem;
}

.btn-view-employees:hover {
  background: var(--primary-dark);
}

/* Employees Modal */
.employees-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 20px;
}

.employees-modal-content {
  background: var(--bg-primary);
  border-radius: 12px;
  max-width: 1200px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.close-modal {
  position: absolute;
  top: 16px;
  right: 16px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: none;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  font-size: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 10;
}

.close-modal:hover {
  background: var(--danger);
  color: white;
  transform: rotate(90deg);
}

/* Responsive */
@media (max-width: 768px) {
  .employees-modal-overlay {
    padding: 0;
  }

  .employees-modal-content {
    max-width: 100%;
    max-height: 100vh;
    border-radius: 0;
  }
}
```

#### Task 3.2.2 - Add i18n Key (15min)

**Fichier**: `src/i18n/locales/en.json`

```json
{
  "myEstablishments": {
    "viewEmployees": "View Employees"
  }
}
```

Traduire dans les 6 langues.

#### Task 3.2.3 - Manual Testing Frontend (1.5h)

**Test Checklist**:

- [ ] Login comme establishment owner (can_edit_employees: true)
- [ ] Navigate `/my-establishments`
- [ ] Click "View Employees" → Modal s'ouvre
- [ ] Voit liste employées avec photos, stats
- [ ] Voit badge VIP si employée VIP (test après implémentation VIP)
- [ ] Bouton "Buy VIP" visible pour employées non-VIP
- [ ] Click "Buy VIP" → Redirect `/vip/purchase/employee/{id}` (404 pour l'instant)
- [ ] Click "✕" → Modal se ferme
- [ ] Click overlay → Modal se ferme

**Test permission: false**:

- [ ] Login comme manager (can_edit_employees: false)
- [ ] Click "View Employees"
- [ ] Voit warning "Read-only access"
- [ ] Bouton "Buy VIP" absent
- [ ] Voit "Contact admin to buy VIP"

**Test edge cases**:

- [ ] Établissement sans employées → "No employees" message
- [ ] Établissement avec 20+ employées → Grid scrollable dans modal
- [ ] Mobile responsive → 1 colonne layout

#### Task 3.2.4 - Fix Issues (1h buffer)

- Corriger bugs frontend
- Ajuster styles
- Améliorer UX si nécessaire

---

## 4. Testing & Validation

### 4.1 Backend Tests

**Déjà fait** dans Day 1 Afternoon.

**Vérification finale**:

```bash
cd backend
npm test -- establishmentController.test.ts

# Expected: All pass ✅
```

### 4.2 Frontend Tests (optionnel - peut être fait après)

**Fichier**: `src/components/Owner/__tests__/MyEmployeesList.test.tsx`

**Tests basiques**:

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import MyEmployeesList from '../MyEmployeesList';

describe('MyEmployeesList', () => {
  it('renders loading state initially', () => {
    render(
      <MyEmployeesList
        establishmentId="est-123"
        establishmentName="Bar ABC"
        canEditEmployees={true}
      />
    );

    expect(screen.getByText(/loading employees/i)).toBeInTheDocument();
  });

  it('shows Buy VIP button when canEditEmployees is true', async () => {
    // Mock fetch response
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({
          employees: [{ id: '1', name: 'Anna', is_vip: false }],
          total: 1
        })
      })
    ) as jest.Mock;

    render(
      <MyEmployeesList
        establishmentId="est-123"
        establishmentName="Bar ABC"
        canEditEmployees={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Buy VIP')).toBeInTheDocument();
    });
  });

  it('hides Buy VIP button when canEditEmployees is false', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({
          employees: [{ id: '1', name: 'Anna', is_vip: false }],
          total: 1
        })
      })
    ) as jest.Mock;

    render(
      <MyEmployeesList
        establishmentId="est-123"
        establishmentName="Bar ABC"
        canEditEmployees={false}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText('Buy VIP')).not.toBeInTheDocument();
      expect(screen.getByText(/contact admin/i)).toBeInTheDocument();
    });
  });
});
```

### 4.3 Manual QA Checklist

**Backend**:
- [ ] Endpoint retourne employees corrects
- [ ] Authorization fonctionne (403 si pas owner)
- [ ] VIP status retourné correctement
- [ ] Empty array si pas d'employées
- [ ] Rate limiting fonctionne (30 req/min)

**Frontend**:
- [ ] Modal ouvre/ferme correctement
- [ ] Employées affichées avec bonnes infos
- [ ] Stats visibles (views, favorites, rating)
- [ ] Bouton "Buy VIP" conditionnel selon permission
- [ ] Warning "Read-only" si permission false
- [ ] Responsive mobile/desktop
- [ ] Loading spinner visible
- [ ] Error handling (retry button)

**Integration**:
- [ ] MyEstablishmentsPage → MyEmployeesList
- [ ] Click "View Employees" → Modal
- [ ] Click "Buy VIP" → Navigate (404 pour l'instant)
- [ ] i18n fonctionne (6 langues)

---

## 5. Déploiement

### 5.1 Pre-Deploy Checklist

- [ ] Backend tests passent
- [ ] Frontend builds sans erreurs
- [ ] i18n complet (6 langues × 14 clés)
- [ ] Swagger docs à jour
- [ ] Rate limiter configuré
- [ ] TypeScript strict mode OK
- [ ] No console.log/debug code

### 5.2 Deploy Backend

```bash
cd backend
npm run build
# Deploy to production
```

### 5.3 Deploy Frontend

```bash
npm run build
# Deploy to production
```

### 5.4 Post-Deploy Verification

**Production Testing**:

- [ ] Login comme owner → Navigate `/my-establishments`
- [ ] Click "View Employees" → Voit liste
- [ ] API endpoint répond correctement
- [ ] Swagger docs accessibles
- [ ] Sentry monitoring actif
- [ ] Rate limiting actif

---

## 6. Post-Implementation

### 6.1 Documentation Updates

**Fichiers à mettre à jour**:

- [x] `docs/features/OWNER_EMPLOYEE_MANAGEMENT.md` - Déjà créé
- [x] `docs/features/OWNER_EMPLOYEE_MANAGEMENT_IMPLEMENTATION.md` - Ce fichier
- [ ] `CLAUDE.md` - Ajouter section "Owner Employee Management"
- [ ] `docs/features/ROADMAP.md` - Marquer Phase 0 comme ✅
- [ ] `backend/src/config/swagger.ts` - Déjà fait

### 6.2 Update CLAUDE.md

**Ajouter section** dans `CLAUDE.md`:

```markdown
## 👥 Owner Employee Management (v10.3 Phase 0)

### Vue d'ensemble

Feature **prerequisite pour VIP System** permettant aux establishment owners de voir et gérer leurs employées.

**Implémenté** (v10.3 Phase 0):
- ✅ Backend endpoint `GET /api/establishments/:id/employees`
- ✅ Frontend component `MyEmployeesList.tsx`
- ✅ Integration `MyEstablishmentsPage.tsx` (modal)
- ✅ Permission-based UI (can_edit_employees)
- ✅ VIP status display (prépare Phase 1-3)
- ✅ i18n support (6 langues)

**API Endpoint**:

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/establishments/:id/employees` | GET | Establishment Owner | Get employees of establishment |

**Response**:
```json
{
  "employees": [
    {
      "id": "uuid",
      "name": "Anna",
      "age": 22,
      "is_vip": false,
      "vip_expires_at": null,
      "current_employment": { ... }
    }
  ],
  "total": 5,
  "establishment": { "id": "uuid", "name": "Bar ABC", "zone": "soi6" }
}
```

**User Flow**:
1. Owner login → Navigate `/my-establishments`
2. Click "👥 View Employees" → Modal ouvre
3. Voit liste employées avec stats (views, favorites, rating)
4. Si `can_edit_employees: true` → Bouton "Buy VIP" visible
5. Click "Buy VIP" → Navigate `/vip/purchase/employee/{id}` (Phase 1-3)

**Permissions**:
- **can_edit_employees: true**: Can buy VIP, manage roster
- **can_edit_employees: false**: Read-only access

**Prépare pour**:
- VIP System (Phase 1-3) - Owners pourront acheter VIP pour leurs employées
```

### 6.3 Communication

**Annoncer completion** à l'équipe:

```
✅ Owner Employee Management (Phase 0) - COMPLÉTÉ

Owners peuvent maintenant voir leurs employées via /my-establishments.

Features:
- View employee list (photos, stats, VIP status)
- Permission-based UI (can_edit_employees)
- "Buy VIP" button (navigate to future VIP page)
- i18n support (6 languages)

Next: VIP System (Phase 1-3) - 8 days
```

### 6.4 Prochaine Phase

**Phase 1-3: VIP System** (8 jours)

**Utilise** Owner Employee Management:
- Bouton "Buy VIP" dans MyEmployeesList
- Purchase flow: Owner achète VIP pour employée
- Tracking: `purchased_by_type = "manager"`
- Permission check: Requiert `can_edit_employees: true`

→ Voir `docs/features/VIP_IMPLEMENTATION_PLAN.md`

---

## 📋 Résumé Final

### Durée Totale: 1-2 jours

**Day 1** (8h):
- Backend endpoint (4h)
- Backend tests (4h)

**Day 2** (8h):
- Frontend component (4h)
- Integration + QA (4h)

### Fichiers Créés/Modifiés

**Backend** (Créés):
- `backend/src/controllers/establishmentController.ts` - getEstablishmentEmployees()
- `backend/src/routes/establishments.ts` - GET /:id/employees
- `backend/src/middleware/rateLimiter.ts` - establishmentEmployeesRateLimiter
- `backend/src/controllers/__tests__/establishmentController.test.ts`

**Backend** (Modifiés):
- `backend/src/config/swagger.ts` - Ajout doc endpoint

**Frontend** (Créés):
- `src/components/Owner/MyEmployeesList.tsx`
- `src/components/Owner/MyEmployeesList.css`

**Frontend** (Modifiés):
- `src/components/MyEstablishmentsPage.tsx` - Ajout modal
- `src/components/MyEstablishmentsPage.css` - Ajout styles modal
- `src/i18n/locales/*.json` - Ajout 14 clés × 6 langues

**Documentation**:
- `docs/features/OWNER_EMPLOYEE_MANAGEMENT.md` ✅
- `docs/features/OWNER_EMPLOYEE_MANAGEMENT_IMPLEMENTATION.md` ✅
- `CLAUDE.md` - À mettre à jour

### Impact

**Débloque**:
- ✅ VIP System implementation (Phase 1-3)
- ✅ Employee roster management (future)
- ✅ Owner analytics (future)

**Améliore**:
- ✅ Owner UX (visibility sur leurs employées)
- ✅ Monétisation (prépare VIP purchases)
- ✅ Platform engagement (owners investissent plus)

---

**Auteur**: PattaMap Development Team
**Date**: Janvier 2025
**Version**: 1.0
**Statut**: ✅ Ready to Implement
