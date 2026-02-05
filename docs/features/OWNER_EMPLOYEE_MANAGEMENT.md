# 👥 Owner Employee Management - Documentation Technique

**Version**: 1.0
**Date**: Janvier 2025
**Statut**: Documentation Technique - Dépendance VIP System
**Priorité**: 🔴 Critique (Prerequisite pour VIP)

---

## 📋 Table des Matières

1. [Vue d'Ensemble](#1-vue-densemble)
2. [Architecture Backend](#2-architecture-backend)
3. [Architecture Frontend](#3-architecture-frontend)
4. [Permissions](#4-permissions)
5. [Expérience Utilisateur](#5-expérience-utilisateur)
6. [Integration VIP Future](#6-integration-vip-future)
7. [Sécurité](#7-sécurité)
8. [Testing](#8-testing)

---

## 1. Vue d'Ensemble

### 1.1 Problème Actuel

**État actuel** (v10.1) :
- ✅ Establishment Owners peuvent être assignés à des établissements
- ✅ Permission `can_edit_employees` existe dans JSONB
- ❌ **MAIS** : Owners ne peuvent **pas voir** qui sont leurs employées
- ❌ **PROBLÈME** : Impossible de gérer ou acheter VIP pour employées

**Bloqueur VIP** :
- Pour acheter VIP à une employée, owner doit connaître son `employee_id`
- Actuellement, aucune UI pour voir les employées → **Feature bloquée**

### 1.2 Objectif

Permettre aux **Establishment Owners** de :

1. **Voir la liste de leurs employées** (current_employment)
2. **Accéder aux profils** des employées
3. **Voir les stats basiques** (views, favorites, rating)
4. **[Future] Acheter VIP** pour leurs employées
5. **[Future] Gérer le roster** (si permission `can_edit_employees`)

### 1.3 Cas d'Usage

#### Use Case 1 : Owner voit ses employées

```
Scenario: Owner accède à "My Establishments"
Given: Je suis logged in comme establishment_owner
  And: J'ai 1 établissement assigné (Bar ABC)
  And: Bar ABC a 5 employées actives
When: Je vais sur /my-establishments
  And: Je clique sur "View Employees" (Bar ABC)
Then: Je vois la liste de 5 employées
  And: Chaque card affiche photo, nom, age, nationality
  And: Chaque card affiche stats (views, favorites, rating)
```

#### Use Case 2 : Owner achète VIP pour employée (Future)

```
Scenario: Owner achète VIP pour Anna
Given: Je suis owner de Bar ABC
  And: Anna travaille à Bar ABC
  And: J'ai permission can_edit_employees = true
When: Je vois la liste des employées
  And: Je clique "Buy VIP" sur card Anna
Then: Je suis redirigé vers /vip/purchase/employee/{anna_id}
  And: Le paiement est marqué "purchased_by_type: manager"
```

#### Use Case 3 : Manager read-only (permission false)

```
Scenario: Manager sans permission can_edit_employees
Given: Je suis manager de Bar ABC
  And: Ma permission can_edit_employees = false
When: Je vais sur My Establishments → View Employees
Then: Je vois la liste des employées (read-only)
  And: Bouton "Buy VIP" est grisé/absent
  And: Aucun bouton d'action disponible
```

### 1.4 Dépendance VIP

**Ordre d'implémentation** :

```
Phase 0 : Owner Employee Management (1-2 jours)
  ↓
  ↓ PREREQUISITE
  ↓
Phase 1-3 : VIP System (8 jours)
```

**Pourquoi c'est critique** :
- VIP permet aux owners d'acheter pour leurs employées
- Sans voir les employées → Impossible de sélectionner qui booster
- Bloque toute la feature VIP B2B

---

## 2. Architecture Backend

### 2.1 Endpoint Principal

#### **GET /api/establishments/:id/employees**

**Description** : Récupère toutes les employées d'un établissement.

**Auth** : Requires `authenticateToken` + owner verification

**Permission check** : User doit être owner/manager de l'établissement

**Response** :

```typescript
{
  employees: [
    {
      id: "uuid",
      name: "Anna",
      age: 22,
      nationality: "Thai",
      photos: ["url1", "url2"],
      status: "approved",
      average_rating: 4.8,
      comment_count: 23,

      // Stats (optional, from analytics)
      total_views: 1250,
      total_favorites: 45,

      // Current employment info
      current_employment: {
        establishment_id: "uuid",
        establishment_name: "Bar ABC",
        start_date: "2024-01-15"
      },

      // VIP status (if exists)
      is_vip: false,
      vip_expires_at: null
    },
    // ... more employees
  ],
  total: 5,
  establishment: {
    id: "uuid",
    name: "Bar ABC",
    zone: "soi6"
  }
}
```

**Implementation** :

```typescript
// backend/src/controllers/establishmentController.ts

export const getEstablishmentEmployees = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params; // establishment_id
    const user_id = req.user?.id;

    // Check if user is owner/manager of this establishment
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

    // Fetch establishment info
    const { data: establishment, error: estError } = await supabase
      .from('establishments')
      .select('id, name, zone')
      .eq('id', id)
      .single();

    if (estError) throw estError;

    // Fetch employees via current_employment
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

    if (empError) throw empError;

    // Extract employees and add current_employment info
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

    // Fetch VIP status for each employee (parallel)
    const employeesWithVIP = await Promise.all(
      employees.map(async (emp) => {
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
      })
    );

    res.json({
      employees: employeesWithVIP,
      total: employeesWithVIP.length,
      establishment
    });

  } catch (error) {
    logger.error('Get establishment employees error:', error);
    res.status(500).json({ error: 'Failed to get employees' });
  }
};
```

**Route** :

```typescript
// backend/src/routes/establishments.ts

router.get(
  '/:id/employees',
  authenticateToken,
  establishmentController.getEstablishmentEmployees
);
```

### 2.2 Endpoint Stats (Optional - Future Enhancement)

#### **GET /api/establishments/:id/employee-stats**

**Description** : Statistiques agrégées des employées

**Response** :

```typescript
{
  total_employees: 5,
  vip_employees: 2,
  avg_rating: 4.6,
  total_views: 6250,
  total_favorites: 180,
  top_performer: {
    id: "uuid",
    name: "Anna",
    views: 1250
  }
}
```

*Note* : Peut être implémenté plus tard si besoin.

---

## 3. Architecture Frontend

### 3.1 Composants

#### **MyEmployeesList.tsx** (NOUVEAU)

**Location** : `src/components/Owner/MyEmployeesList.tsx`

**Props** :

```typescript
interface MyEmployeesListProps {
  establishmentId: string;
  establishmentName: string;
  canEditEmployees: boolean; // From owner permissions
}
```

**Features** :
- Fetch employees via `/api/establishments/:id/employees`
- Display employee cards (photo, nom, stats)
- VIP badge si employée VIP
- Bouton "Buy VIP" (si permission + VIP system implémenté)
- Responsive grid layout

**Structure** :

```typescript
import React, { useState, useEffect } from 'react';
import { useSecureFetch } from '../../hooks/useSecureFetch';
import { useNavigate } from 'react-router-dom';
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
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmployees();
  }, [establishmentId]);

  const fetchEmployees = async () => {
    try {
      const response = await secureFetch(
        `${import.meta.env.VITE_API_URL}/api/establishments/${establishmentId}/employees`
      );
      const data = await response.json();
      setEmployees(data.employees || []);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBuyVIP = (employeeId: string) => {
    // Navigate to VIP purchase page
    navigate(`/vip/purchase/employee/${employeeId}`);
  };

  if (loading) return <div className="loading">Loading employees...</div>;

  if (employees.length === 0) {
    return (
      <div className="no-employees">
        <p>No employees found for {establishmentName}</p>
        <p className="hint">Employees will appear here once they are linked to this establishment.</p>
      </div>
    );
  }

  return (
    <div className="my-employees-list">
      <h3>Employees at {establishmentName} ({employees.length})</h3>

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
                  👑 VIP Active
                  {employee.vip_expires_at && (
                    <span className="expiry">
                      Expires: {new Date(employee.vip_expires_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              ) : (
                canEditEmployees && (
                  <button
                    className="btn-buy-vip"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBuyVIP(employee.id);
                    }}
                  >
                    👑 Buy VIP
                  </button>
                )
              )}

              {!canEditEmployees && !employee.is_vip && (
                <div className="no-permission-hint">
                  Contact admin to buy VIP
                </div>
              )}
            </div>

            {/* Stats Summary */}
            <div className="employee-stats-summary">
              <span title="Profile Views">👁️ {employee.total_views || 0}</span>
              <span title="Favorites">⭐ {employee.total_favorites || 0}</span>
              <span title="Rating">🌟 {employee.average_rating?.toFixed(1) || 'N/A'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyEmployeesList;
```

**CSS** :

```css
/* src/components/Owner/MyEmployeesList.css */

.my-employees-list {
  padding: 20px;
}

.my-employees-list h3 {
  margin-bottom: 20px;
  color: var(--text-primary);
}

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
}

.no-employees {
  padding: 40px;
  text-align: center;
  color: var(--text-muted);
}

.no-employees .hint {
  margin-top: 8px;
  font-size: 0.875rem;
  opacity: 0.7;
}

.loading {
  padding: 40px;
  text-align: center;
  color: var(--text-muted);
}
```

### 3.2 Integration MyEstablishmentsPage

**Modifier** : `src/components/MyEstablishmentsPage.tsx`

**Ajout** : Bouton "View Employees" + Modal/Section

```typescript
// Line ~150 (inside establishment card)

{/* View Employees Button */}
<button
  onClick={() => setSelectedEstablishmentForEmployees(establishment)}
  className="btn-view-employees"
>
  👥 View Employees
</button>

// ... plus tard dans le render

{/* Employees Modal/Section */}
{selectedEstablishmentForEmployees && (
  <div className="employees-modal">
    <div className="employees-modal-content">
      <button
        className="close-modal"
        onClick={() => setSelectedEstablishmentForEmployees(null)}
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

**Alternative** : Expandable section (accordion style)

```typescript
// Inside establishment card
const [showEmployees, setShowEmployees] = useState(false);

<button onClick={() => setShowEmployees(!showEmployees)}>
  {showEmployees ? '▼' : '▶'} Employees ({employeeCount})
</button>

{showEmployees && (
  <MyEmployeesList
    establishmentId={establishment.id}
    establishmentName={establishment.name}
    canEditEmployees={establishment.permissions.can_edit_employees}
  />
)}
```

---

## 4. Permissions

### 4.1 Permission `can_edit_employees`

**JSONB field** : `establishment_owners.permissions`

```typescript
interface OwnerPermissions {
  can_edit_info: boolean;
  can_edit_pricing: boolean;
  can_edit_photos: boolean;
  can_edit_employees: boolean; // ← This one
  can_view_analytics: boolean;
}
```

### 4.2 Comportement selon Permission

| Permission | Actions disponibles |
|------------|---------------------|
| `can_edit_employees: false` | ✅ Voir liste employées<br>✅ Voir profils<br>❌ Buy VIP<br>❌ Add/Remove employees |
| `can_edit_employees: true` | ✅ Voir liste employées<br>✅ Voir profils<br>✅ **Buy VIP**<br>✅ [Future] Add/Remove employees |

### 4.3 Backend Permission Check

```typescript
// Exemple pour future endpoint "Buy VIP for employee"
export const purchaseVIPForEmployee = async (req: AuthRequest, res: Response) => {
  const { employee_id, duration_days } = req.body;
  const user_id = req.user?.id;

  // Get employee's establishment
  const { data: employment } = await supabase
    .from('current_employment')
    .select('establishment_id')
    .eq('employee_id', employee_id)
    .single();

  if (!employment) {
    return res.status(404).json({ error: 'Employee not found in any establishment' });
  }

  // Check owner permission
  const { data: ownership } = await supabase
    .from('establishment_owners')
    .select('permissions')
    .eq('user_id', user_id)
    .eq('establishment_id', employment.establishment_id)
    .single();

  if (!ownership || !ownership.permissions.can_edit_employees) {
    return res.status(403).json({
      error: 'You need can_edit_employees permission to buy VIP for employees'
    });
  }

  // Proceed with VIP purchase...
};
```

### 4.4 Default Permissions

**Par défaut** (défini dans admin assignment) :

| Role | can_edit_employees |
|------|--------------------|
| Owner | `false` (requiert vetting admin) |
| Manager | `false` |

**Raison** : Permission sensible → Admin doit explicitement l'activer après vérification.

---

## 5. Expérience Utilisateur

### 5.1 User Flow - Owner voit ses employées

**Route** : `/my-establishments`

```
┌─────────────────────────────────────────────────┐
│ 🏆 My Establishments                            │
├─────────────────────────────────────────────────┤
│                                                 │
│ Your Establishments (2):                       │
│                                                 │
│ ┌───────────────────────────────────────────┐  │
│ │ 🏢 Bar ABC (Soi 6)                        │  │
│ │ Role: Owner                                │  │
│ │                                            │  │
│ │ [Edit Establishment] [👥 View Employees]  │  │
│ └───────────────────────────────────────────┘  │
│                                                 │
│ ┌───────────────────────────────────────────┐  │
│ │ 🏢 GoGo XYZ (Walking Street)              │  │
│ │ Role: Manager                              │  │
│ │                                            │  │
│ │ [Edit Establishment] [👥 View Employees]  │  │
│ └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

**Click "View Employees" (Bar ABC)** :

```
┌─────────────────────────────────────────────────────────┐
│ 👥 Employees at Bar ABC (5)                     [✕ Close]│
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│ │ [Photo]  │ │ [Photo]  │ │ [Photo]  │ │ [Photo]  │  │
│ │ Anna     │ │ Lisa     │ │ Sophie   │ │ Maria    │  │
│ │ 22 • Thai│ │ 24 • VN  │ │ 23 • Thai│ │ 25 • RU  │  │
│ │          │ │          │ │          │ │          │  │
│ │👁️ 1,250  │ │👁️ 980    │ │👁️ 850    │ │👁️ 620    │  │
│ │⭐ 45     │ │⭐ 32     │ │⭐ 28     │ │⭐ 18     │  │
│ │🌟 4.8    │ │🌟 4.6    │ │🌟 4.5    │ │🌟 4.3    │  │
│ │          │ │          │ │          │ │          │  │
│ │👑 VIP    │ │[Buy VIP] │ │[Buy VIP] │ │[Buy VIP] │  │
│ │Active    │ │          │ │          │ │          │  │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│                                                         │
│ ┌──────────┐                                          │
│ │ [Photo]  │                                          │
│ │ Nana     │                                          │
│ │ 21 • Thai│                                          │
│ │          │                                          │
│ │👁️ 450    │                                          │
│ │⭐ 12     │                                          │
│ │🌟 4.2    │                                          │
│ │          │                                          │
│ │[Buy VIP] │                                          │
│ └──────────┘                                          │
└─────────────────────────────────────────────────────────┘
```

**Click "Buy VIP" (Lisa)** :

→ Redirect `/vip/purchase/employee/{lisa_id}`
→ Purchase flow normal (voir VIP_SYSTEM.md)
→ Payment marqué `purchased_by_type: "manager"`

### 5.2 User Flow - Manager sans permission

**Permission** : `can_edit_employees: false`

```
┌─────────────────────────────────────────────────────────┐
│ 👥 Employees at Bar ABC (5)                     [✕ Close]│
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ⚠️ You have read-only access to employees              │
│ Contact admin to request can_edit_employees permission │
│                                                         │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐                │
│ │ [Photo]  │ │ [Photo]  │ │ [Photo]  │                │
│ │ Anna     │ │ Lisa     │ │ Sophie   │                │
│ │ 22 • Thai│ │ 24 • VN  │ │ 23 • Thai│                │
│ │          │ │          │ │          │                │
│ │👁️ 1,250  │ │👁️ 980    │ │👁️ 850    │                │
│ │⭐ 45     │ │⭐ 32     │ │⭐ 28     │                │
│ │🌟 4.8    │ │🌟 4.6    │ │🌟 4.5    │                │
│ │          │ │          │ │          │                │
│ │👑 VIP    │ │ Contact  │ │ Contact  │                │
│ │Active    │ │ Admin    │ │ Admin    │                │
│ └──────────┘ └──────────┘ └──────────┘                │
└─────────────────────────────────────────────────────────┘
```

### 5.3 Responsive Mobile

**Mobile Layout** : 1 colonne, cards stack verticalement

```
┌────────────────────┐
│ 👥 Employees (5)   │
├────────────────────┤
│                    │
│ ┌────────────────┐ │
│ │ [Photo]        │ │
│ │ Anna, 22 Thai  │ │
│ │ 👁️ 1,250 ⭐ 45  │ │
│ │ [👑 VIP Active]│ │
│ └────────────────┘ │
│                    │
│ ┌────────────────┐ │
│ │ [Photo]        │ │
│ │ Lisa, 24 VN    │ │
│ │ 👁️ 980 ⭐ 32    │ │
│ │ [Buy VIP]      │ │
│ └────────────────┘ │
│                    │
│ ... (scroll)       │
└────────────────────┘
```

---

## 6. Integration VIP Future

### 6.1 Bouton "Buy VIP"

**Maintenant** (Phase 0 - Owner Employee Management) :
- Bouton affiché si `canEditEmployees === true`
- Click → Navigate `/vip/purchase/employee/{id}`
- Si VIP pas encore implémenté → Page 404 ou "Coming Soon"

**Après** (Phase 1-3 - VIP System) :
- Bouton fonctionne normalement
- Purchase flow identique à employée qui achète elle-même
- **DIFFÉRENCE** : `purchased_by_type = "manager"` au lieu de `"employee"`

### 6.2 Backend VIP - Support Owner Purchase

**Déjà prévu dans VIP_SYSTEM.md** :

```typescript
// backend/src/controllers/vipEmployeeController.ts - initiatePurchase

const purchased_by_type = await getUserType(user_id!, employee_id);
// Returns: 'employee' | 'manager' | 'admin' | 'other'

// Permission check
const canPurchase = await checkPurchasePermission(user_id, employee_id);
// Returns true if:
// - User is employee herself
// - User is admin/moderator
// - User is establishment owner with can_edit_employees permission ← KEY
```

**Donc** : VIP System déjà préparé pour owner purchases 👍

### 6.3 Tracking "Who Bought VIP"

**Table** : `employee_vip_subscriptions`

```sql
purchased_by_user_id UUID -- L'owner qui a payé
purchased_by_type VARCHAR(20) -- 'manager' si owner, 'employee' si elle-même
```

**Usage** :
- Analytics : Voir qui a acheté VIP pour qui
- Audit : Tracer les transactions
- Business Intelligence : Taux adoption owners vs employees

---

## 7. Sécurité

### 7.1 Authorization Checks

**Endpoint** : `GET /api/establishments/:id/employees`

**Vérifications** :

1. **User authentifié** : `authenticateToken` middleware
2. **User est owner** : Query `establishment_owners` table
3. **Establishment existe** : Check `establishments` table
4. **Employées actives** : Filter `status = 'approved'`

**Code** :

```typescript
// Check ownership
const { data: ownership, error } = await supabase
  .from('establishment_owners')
  .select('*')
  .eq('user_id', user_id)
  .eq('establishment_id', id)
  .single();

if (error || !ownership) {
  return res.status(403).json({
    error: 'Not authorized to view employees'
  });
}
```

### 7.2 Data Privacy

**Ce qui est exposé** :
- ✅ Profil public employée (nom, age, photos, nationality)
- ✅ Stats basiques (views, favorites, rating)
- ✅ VIP status (is_vip, expires_at)

**Ce qui est protégé** :
- ❌ Employee's `user_id` (privacy)
- ❌ Employee's contact info privé
- ❌ Financial data
- ❌ Analytics détaillés (réservé à employée elle-même)

### 7.3 Rate Limiting

**Prévention abus** :

```typescript
// backend/src/middleware/rateLimiter.ts

export const establishmentEmployeesRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Max 30 requests per minute
  message: 'Too many requests to view employees',
  keyGenerator: (req: AuthRequest) => req.user?.id || req.ip
});

// Apply to route
router.get(
  '/:id/employees',
  authenticateToken,
  establishmentEmployeesRateLimiter,
  establishmentController.getEstablishmentEmployees
);
```

---

## 8. Testing

### 8.1 Backend Tests

**Fichier** : `backend/src/controllers/__tests__/establishmentController.test.ts`

```typescript
describe('GET /api/establishments/:id/employees', () => {
  it('should return employees for authorized owner', async () => {
    const response = await request(app)
      .get(`/api/establishments/${establishment.id}/employees`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.employees).toHaveLength(5);
    expect(response.body.establishment.name).toBe('Bar ABC');
  });

  it('should reject unauthorized user', async () => {
    const response = await request(app)
      .get(`/api/establishments/${establishment.id}/employees`)
      .set('Authorization', `Bearer ${otherUserToken}`);

    expect(response.status).toBe(403);
    expect(response.body.error).toContain('Not authorized');
  });

  it('should include VIP status for each employee', async () => {
    // Create VIP subscription for one employee
    await createVIPSubscription(employee1.id);

    const response = await request(app)
      .get(`/api/establishments/${establishment.id}/employees`)
      .set('Authorization', `Bearer ${ownerToken}`);

    const vipEmployee = response.body.employees.find(e => e.id === employee1.id);
    expect(vipEmployee.is_vip).toBe(true);
    expect(vipEmployee.vip_expires_at).toBeDefined();
  });

  it('should filter out rejected employees', async () => {
    // Set one employee as rejected
    await supabase
      .from('employees')
      .update({ status: 'rejected' })
      .eq('id', employee1.id);

    const response = await request(app)
      .get(`/api/establishments/${establishment.id}/employees`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(response.body.employees).not.toContainEqual(
      expect.objectContaining({ id: employee1.id })
    );
  });
});
```

### 8.2 Frontend Tests

**Fichier** : `src/components/Owner/__tests__/MyEmployeesList.test.tsx`

```typescript
describe('MyEmployeesList', () => {
  it('renders employee list correctly', () => {
    const mockEmployees = [
      { id: '1', name: 'Anna', age: 22, photos: ['url'], is_vip: true },
      { id: '2', name: 'Lisa', age: 24, photos: ['url'], is_vip: false }
    ];

    render(
      <MyEmployeesList
        establishmentId="est-123"
        establishmentName="Bar ABC"
        canEditEmployees={true}
      />
    );

    expect(screen.getByText('Employees at Bar ABC (2)')).toBeInTheDocument();
    expect(screen.getByText('Anna')).toBeInTheDocument();
    expect(screen.getByText('Lisa')).toBeInTheDocument();
  });

  it('shows Buy VIP button when canEditEmployees is true', () => {
    render(
      <MyEmployeesList
        establishmentId="est-123"
        establishmentName="Bar ABC"
        canEditEmployees={true}
      />
    );

    const buyVIPButtons = screen.getAllByText('Buy VIP');
    expect(buyVIPButtons.length).toBeGreaterThan(0);
  });

  it('hides Buy VIP button when canEditEmployees is false', () => {
    render(
      <MyEmployeesList
        establishmentId="est-123"
        establishmentName="Bar ABC"
        canEditEmployees={false}
      />
    );

    expect(screen.queryByText('Buy VIP')).not.toBeInTheDocument();
    expect(screen.getByText('Contact admin to buy VIP')).toBeInTheDocument();
  });

  it('displays VIP status badge for VIP employees', () => {
    render(
      <MyEmployeesList
        establishmentId="est-123"
        establishmentName="Bar ABC"
        canEditEmployees={true}
      />
    );

    expect(screen.getByText('👑 VIP Active')).toBeInTheDocument();
  });
});
```

### 8.3 Manual Testing Checklist

**Owner avec permission** :
- [ ] Login comme owner (can_edit_employees: true)
- [ ] Navigate `/my-establishments`
- [ ] Click "View Employees"
- [ ] Voit liste employées
- [ ] Voit stats (views, favorites, rating)
- [ ] Voit badge VIP si employée VIP
- [ ] Bouton "Buy VIP" visible pour non-VIP
- [ ] Click "Buy VIP" → Redirect `/vip/purchase/employee/{id}`

**Manager sans permission** :
- [ ] Login comme manager (can_edit_employees: false)
- [ ] Navigate `/my-establishments`
- [ ] Click "View Employees"
- [ ] Voit liste employées (read-only)
- [ ] Warning "Contact admin" visible
- [ ] Bouton "Buy VIP" absent/grisé

**Edge cases** :
- [ ] Établissement sans employées → "No employees" message
- [ ] Établissement avec 20+ employées → Grid scrollable
- [ ] Mobile responsive → 1 colonne layout
- [ ] VIP expires soon → Badge "Expires in X days"

---

## 📋 Résumé Final

### Ce qui a été documenté

✅ **Vue d'ensemble** - Problème, objectif, dépendance VIP
✅ **Backend** - Endpoint `/api/establishments/:id/employees` complet
✅ **Frontend** - Composant `MyEmployeesList.tsx` avec UI détaillée
✅ **Permissions** - Comportement `can_edit_employees` (true/false)
✅ **UX** - Flows Owner et Manager avec mocks
✅ **Integration VIP** - Bouton "Buy VIP" + tracking
✅ **Sécurité** - Authorization, privacy, rate limiting
✅ **Testing** - Backend + Frontend + Manual checklist

### Prochaine Étape

📄 **Document 2** : `OWNER_EMPLOYEE_MANAGEMENT_IMPLEMENTATION.md` - Plan d'implémentation 1-2 jours

---

**Auteur** : PattaMap Development Team
**Date** : Janvier 2025
**Version** : 1.0
**Statut** : ✅ Ready for Implementation
