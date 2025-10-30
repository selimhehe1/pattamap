# 🏆 Establishment Owners System - Technical Documentation

**Version**: v10.1
**Date**: January 2025
**Status**: ✅ Production Ready

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [Backend API](#backend-api)
5. [Frontend Components](#frontend-components)
6. [User Flows](#user-flows)
7. [Security & Permissions](#security--permissions)
8. [Testing](#testing)
9. [Deployment](#deployment)
10. [Future Enhancements](#future-enhancements)

---

## Overview

### Purpose

The Establishment Owners system allows venue owners to manage their establishments directly without requiring full admin privileges. This provides:

- **Self-service management** for establishment owners
- **Granular permission control** (5 distinct permissions)
- **Role hierarchy** (Owner vs Manager)
- **Audit trail** for all ownership assignments

### Key Features

- ✅ **Admin Panel**: Assign/remove owners, manage permissions
- ✅ **Owner Dashboard**: View and edit owned establishments
- ✅ **Granular Permissions**: 5 permission types (info, pricing, photos, employees, analytics)
- ✅ **Role System**: Owner (full control) vs Manager (limited control)
- ✅ **Registration Flow**: Dedicated "Establishment Owner" account type
- ✅ **Audit Trail**: Track who assigned ownership and when

---

## Architecture

### Tech Stack

**Backend**:
- Node.js 18+ + Express 4.18.2
- TypeScript 5.9.2
- PostgreSQL (via Supabase 2.57.4)
- JWT Authentication + httpOnly cookies

**Frontend**:
- React 19.1.1 + TypeScript 5.9.3
- React Router 7.9.1
- React Query 5.90.2
- Framer Motion 12.23.22

### System Flow

```
┌─────────────────┐
│  User Registers │ → account_type = 'establishment_owner'
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Admin Reviews  │ → Approves account (manual process)
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│  Admin Assigns Ownership    │ → POST /api/admin/establishments/:id/owners
│  - Selects establishment    │
│  - Chooses role (owner/mgr) │
│  - Sets permissions         │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Owner Accesses Dashboard   │ → GET /api/establishments/my-owned
│  - Views owned venues       │
│  - Edits (based on perms)   │
│  - Views analytics          │
└─────────────────────────────┘
```

---

## Database Schema

### Table: `establishment_owners`

**Location**: `backend/database/migrations/add_establishment_owners.sql`

```sql
CREATE TABLE IF NOT EXISTS establishment_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  owner_role TEXT NOT NULL CHECK (owner_role IN ('owner', 'manager')) DEFAULT 'owner',
  permissions JSONB DEFAULT '{
    "can_edit_info": true,
    "can_edit_pricing": true,
    "can_edit_photos": true,
    "can_edit_employees": false,
    "can_view_analytics": true
  }'::jsonb,
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Prevent duplicate assignments
  UNIQUE(user_id, establishment_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_establishment_owners_user_id ON establishment_owners(user_id);
CREATE INDEX IF NOT EXISTS idx_establishment_owners_establishment_id ON establishment_owners(establishment_id);
CREATE INDEX IF NOT EXISTS idx_establishment_owners_assigned_by ON establishment_owners(assigned_by);
```

### Permissions JSONB Structure

```typescript
interface OwnerPermissions {
  can_edit_info: boolean;        // Name, address, description, hours
  can_edit_pricing: boolean;     // Ladydrink, barfine, rooms
  can_edit_photos: boolean;      // Logo and venue photos
  can_edit_employees: boolean;   // Employee roster management
  can_view_analytics: boolean;   // View performance metrics
}
```

### Role Hierarchy

| Role | Default Permissions | Description |
|------|---------------------|-------------|
| **Owner** | All enabled (except employees) | Full control over venue |
| **Manager** | Limited (info, photos, analytics) | Day-to-day operations |

---

## Backend API

### Endpoints

All endpoints require authentication and CSRF protection.

#### 1. Get Establishment Owners (Admin Only)

```http
GET /api/admin/establishments/:id/owners
Authorization: Bearer <token>
```

**Response**:
```json
{
  "establishment": { "id": "...", "name": "..." },
  "owners": [
    {
      "id": "...",
      "user_id": "...",
      "establishment_id": "...",
      "owner_role": "owner",
      "permissions": { ... },
      "assigned_by": "...",
      "assigned_at": "2025-01-13T10:00:00Z",
      "user": { "id": "...", "pseudonym": "...", "email": "..." }
    }
  ]
}
```

#### 2. Assign Establishment Owner (Admin Only)

```http
POST /api/admin/establishments/:id/owners
Authorization: Bearer <token>
Content-Type: application/json

{
  "user_id": "...",
  "owner_role": "owner",
  "permissions": {
    "can_edit_info": true,
    "can_edit_pricing": true,
    "can_edit_photos": true,
    "can_edit_employees": false,
    "can_view_analytics": true
  }
}
```

**Validation**:
- User must exist and have `account_type='establishment_owner'`
- Establishment must exist
- No duplicate ownership (enforced by UNIQUE constraint)

**Response**: `201 Created`

#### 3. Remove Establishment Owner (Admin Only)

```http
DELETE /api/admin/establishments/:id/owners/:userId
Authorization: Bearer <token>
```

**Response**: `200 OK`

#### 4. Update Owner Permissions (Admin Only)

```http
PATCH /api/admin/establishments/:id/owners/:userId
Authorization: Bearer <token>
Content-Type: application/json

{
  "permissions": { ... },
  "owner_role": "manager"
}
```

**Response**: `200 OK`

#### 5. Get My Owned Establishments (Owner)

```http
GET /api/establishments/my-owned
Authorization: Bearer <token>
```

**Response**:
```json
{
  "establishments": [
    {
      "id": "...",
      "name": "Walking Street Gogo",
      "zone": "walking-street",
      "ownership_role": "owner",
      "permissions": { ... },
      "owned_since": "2025-01-13T10:00:00Z",
      "category": { "id": "...", "name": "Gogo Bar" },
      ...
    }
  ],
  "total": 1
}
```

### Controllers

**Location**: `backend/src/controllers/establishmentOwnerController.ts`

```typescript
export const getEstablishmentOwners: (req, res) => Promise<void>
export const getMyOwnedEstablishments: (req, res) => Promise<void>
export const assignEstablishmentOwner: (req, res) => Promise<void>
export const removeEstablishmentOwner: (req, res) => Promise<void>
export const updateEstablishmentOwnerPermissions: (req, res) => Promise<void>
```

### Middleware

**Location**: `backend/src/middleware/auth.ts`

```typescript
// Require establishment owner account type
export const requireEstablishmentOwnerAccount: (req, res, next) => void

// Check if user owns a specific establishment
export const isEstablishmentOwner: (userId: string, establishmentId: string) => Promise<boolean>
```

### Routes

**Location**: `backend/src/routes/admin.ts` and `backend/src/routes/establishments.ts`

```typescript
// Admin routes
router.get('/establishments/:id/owners', requireAdmin, getEstablishmentOwners);
router.post('/establishments/:id/owners', requireAdmin, assignEstablishmentOwner);
router.delete('/establishments/:id/owners/:userId', requireAdmin, removeEstablishmentOwner);
router.patch('/establishments/:id/owners/:userId', requireAdmin, updateEstablishmentOwnerPermissions);

// Owner routes
router.get('/establishments/my-owned', authenticateToken, getMyOwnedEstablishments);
```

---

## Frontend Components

### 1. EstablishmentOwnersAdmin.tsx (~1250 lines)

**Location**: `src/components/Admin/EstablishmentOwnersAdmin.tsx`

**Purpose**: Admin interface for managing establishment ownership

**Features**:
- Grid view of establishments with owner count badges
- Filter tabs: All / With Owners / Without Owners
- Establishment modal with:
  - Current owners list
  - Assign new owner form (user search + autocomplete)
  - Edit permissions form
  - Remove owner action
- Real-time updates with React Query

**State Management**:
```typescript
const [establishments, setEstablishments] = useState<AdminEstablishment[]>([]);
const [establishmentOwners, setEstablishmentOwners] = useState<EstablishmentOwner[]>([]);
const [selectedEstablishment, setSelectedEstablishment] = useState<AdminEstablishment | null>(null);
const [showAssignModal, setShowAssignModal] = useState(false);
const [editingOwner, setEditingOwner] = useState<EstablishmentOwner | null>(null);
```

**Key Functions**:
- `loadEstablishments()` - Fetch all establishments with owner counts
- `loadEstablishmentOwners(id)` - Fetch owners for specific establishment
- `handleAssignOwner()` - Assign new owner
- `handleRemoveOwner(userId)` - Remove existing owner
- `handleEditPermissions(owner)` - Update permissions

### 2. MyEstablishmentsPage.tsx (~700 lines)

**Location**: `src/components/MyEstablishmentsPage.tsx`

**Purpose**: Owner dashboard for managing their venues

**Features**:
- Quick stats row (establishments, views, reviews)
- Grid of owned establishments with:
  - Logo/icon display
  - Role badge (Owner/Manager)
  - Permission badges (5 types)
  - Edit button (opens OwnerEstablishmentEditModal)
- Empty state for new owners
- Access control (requires account_type='establishment_owner')

**State Management**:
```typescript
const [establishments, setEstablishments] = useState<OwnedEstablishment[]>([]);
const [stats, setStats] = useState<DashboardStats>({
  totalEstablishments: 0,
  totalViews: 0,
  totalReviews: 0,
  avgRating: 0
});
```

### 3. OwnerEstablishmentEditModal.tsx (~500 lines) - v10.1

**Location**: `src/components/OwnerEstablishmentEditModal.tsx`

**Purpose**: Permission-based edit modal for establishment owners

**Features**:
- Permission-based field visibility (only shows editable sections)
- Info section (name, address, description, hours, social media)
- Pricing section (ladydrink, barfine, rooms)
- Photo upload (logo with Cloudinary)
- Real-time validation
- Success/error toasts
- CSRF-protected updates

**Permission Checks**:
```typescript
if (permissions.can_edit_info) {
  // Show BasicInfoForm, OpeningHoursForm, SocialMediaForm
}
if (permissions.can_edit_pricing) {
  // Show PricingForm
}
if (permissions.can_edit_photos) {
  // Enable logo upload
}
```

**Integration**:
```typescript
<OwnerEstablishmentEditModal
  establishment={selectedEstablishment}
  permissions={selectedEstablishment.permissions}
  onClose={() => setSelectedEstablishment(null)}
  onSuccess={() => loadOwnedEstablishments()}
/>
```

### 4. MultiStepRegisterForm.tsx (Extended)

**Location**: `src/components/Auth/MultiStepRegisterForm.tsx`

**Changes**:
- Added 3rd account type: "Establishment Owner"
- Info banner with benefits + approval notice
- 2-step flow (same as regular users)

**Account Type Selection**:
```tsx
<label>
  <input type="radio" value="establishment_owner" />
  🏆 Establishment Owner
  <p>Manage your venues and profiles</p>
</label>
```

### 4. Header.tsx (Extended)

**Location**: `src/components/Layout/Header.tsx`

**Changes**:
- Added "My Establishments" link in user menu
- Conditional rendering based on `account_type='establishment_owner'`
- Preload functionality for performance

```tsx
{user.account_type === 'establishment_owner' && (
  <AnimatedButton onClick={() => navigate('/my-establishments')}>
    🏆 My Establishments
  </AnimatedButton>
)}
```

### 5. AdminDashboard.tsx (Extended)

**Location**: `src/components/Admin/AdminDashboard.tsx`

**Changes**:
- Added "Establishment Owners" tab
- New stat card with:
  - Total owners count
  - Establishments with owners count
  - Subtitle with additional info

### Routing

**App.tsx**:
```tsx
<Route path="/my-establishments" element={<MyEstablishmentsPage />} />
```

**lazyComponents.ts**:
```typescript
export const MyEstablishmentsPage = lazy(() => import('../components/MyEstablishmentsPage'));
```

---

## User Flows

### Flow 1: Admin Assigns Ownership

```
1. Admin navigates to Admin Panel → Establishment Owners
2. Clicks on an establishment card
3. Modal opens showing:
   - Current owners list (if any)
   - "Assign New Owner" button
4. Admin clicks "Assign New Owner"
5. Search form appears:
   - Text input for user search
   - Filters by account_type='establishment_owner'
   - Autocomplete dropdown
6. Admin selects user from results
7. Admin chooses:
   - Role: Owner or Manager
   - Permissions: 5 checkboxes (default: Owner preset)
8. Admin clicks "Assign Owner"
9. API call: POST /api/admin/establishments/:id/owners
10. Success toast + modal refreshes with new owner
```

### Flow 2: Owner Views Dashboard

```
1. Owner logs in (account_type='establishment_owner')
2. Header shows "My Establishments" link
3. Owner clicks link → navigates to /my-establishments
4. Dashboard loads:
   - Quick stats at top
   - Grid of owned establishments
5. Each card shows:
   - Venue logo/icon
   - Name, zone, category
   - Role badge (Owner/Manager)
   - Permission badges (5 types)
   - "Edit Establishment" button
6. Owner clicks "Edit" → Modal opens (Phase 2.2 - TODO)
```

### Flow 3: User Registers as Owner

```
1. User opens registration form
2. Step 1: Chooses "Establishment Owner" account type
3. Info banner appears:
   - Lists benefits
   - Shows approval requirement notice
4. User clicks "Next"
5. Step 2: Fills registration form (pseudonym, email, password)
6. Submits form → Account created with account_type='establishment_owner'
7. Toast: "Account created! An administrator will review your request."
8. Admin manually reviews and approves account
9. Admin assigns establishments via EstablishmentOwnersAdmin
10. Owner receives access to /my-establishments
```

---

## Security & Permissions

### Authentication

- **JWT Tokens**: Access token (15min) + Refresh token (7d)
- **httpOnly Cookies**: Prevent XSS attacks
- **CSRF Protection**: Custom middleware with session tokens

### Authorization Layers

#### Layer 1: Account Type Check

```typescript
if (user.account_type !== 'establishment_owner') {
  return res.status(403).json({ error: 'Establishment owner account required' });
}
```

#### Layer 2: Ownership Verification

```typescript
const isOwner = await isEstablishmentOwner(userId, establishmentId);
if (!isOwner) {
  return res.status(403).json({ error: 'Not authorized for this establishment' });
}
```

#### Layer 3: Permission Granularity

```typescript
const { permissions } = await getOwnership(userId, establishmentId);
if (!permissions.can_edit_pricing) {
  return res.status(403).json({ error: 'No permission to edit pricing' });
}
```

### Audit Trail

Every ownership assignment is logged:
- `assigned_by`: Admin user ID who created the assignment
- `assigned_at`: Timestamp of assignment
- All modifications are tracked via `updated_at`

### Rate Limiting

- **Auth endpoints**: 20 requests / 5 minutes
- **Admin endpoints**: 100 requests / 15 minutes
- **Owner endpoints**: 50 requests / 5 minutes

---

## Testing

### Backend Tests

**Location**: `backend/src/__tests__/`

**Coverage**:
- ✅ Middleware: `auth.test.ts` (92.5% stmt, 85.7% branch)
- 🚧 TODO: `establishmentOwner.test.ts`

**Example Test Suite**:
```typescript
describe('Establishment Owners API', () => {
  describe('POST /api/admin/establishments/:id/owners', () => {
    it('should assign owner with valid data', async () => {
      // Test assignment
    });

    it('should reject if user is not establishment_owner type', async () => {
      // Test validation
    });

    it('should prevent duplicate assignments', async () => {
      // Test unique constraint
    });
  });

  describe('GET /api/establishments/my-owned', () => {
    it('should return owned establishments', async () => {
      // Test owner access
    });

    it('should reject non-owner accounts', async () => {
      // Test authorization
    });
  });
});
```

### Frontend Tests

**TODO**: E2E tests with Playwright

```typescript
describe('Establishment Owners Flow', () => {
  it('should allow admin to assign ownership', async () => {
    // E2E test
  });

  it('should display owned establishments in dashboard', async () => {
    // E2E test
  });
});
```

---

## Deployment

### Environment Variables

**Backend** (`.env`):
```bash
# Required
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-key
JWT_SECRET=your-secret-min-32-chars

# Optional (for production)
NODE_ENV=production
PORT=8080
CORS_ORIGIN=https://yourdomain.com
```

**Frontend** (`.env`):
```bash
REACT_APP_API_URL=https://api.yourdomain.com
REACT_APP_ENV=production
```

### Database Migration

```bash
# Run migration
psql -h your-db-host -U postgres -d your-database -f backend/database/migrations/add_establishment_owners.sql

# Verify
psql -c "SELECT * FROM establishment_owners LIMIT 1;"
```

### Build Commands

```bash
# Backend
cd backend
npm install
npm run build
npm start

# Frontend
npm install
npm run build
# Serve build/ directory with nginx or similar
```

### Health Check

```bash
# Backend
curl http://localhost:8080/api/health

# Test endpoint
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:8080/api/establishments/my-owned
```

---

## Future Enhancements

### ✅ Phase 2.2: Edit Modal (Completed - v10.1)

**OwnerEstablishmentEditModal.tsx**:
- ✅ Form with permission-based field visibility
- ✅ Real-time validation
- ✅ Image upload for logo/photos
- ✅ Pricing updates (ladydrink, barfine, rooms)
- ✅ Permission-based section rendering
- ✅ Success/error toasts
- ✅ Integration with MyEstablishmentsPage

### Phase 2.3: Analytics Dashboard (Pending - Future v10.2+)

**OwnerDashboardStats.tsx**:
- Views over time graph
- Reviews sentiment analysis
- Peak hours heatmap
- Employee performance metrics

### Phase 3.2: Approval Workflow (Pending)

**UsersAdmin.tsx** - Pending Accounts tab:
- List users with `account_type='establishment_owner'` and pending status
- Approve/Reject buttons
- Email notifications on approval
- Audit log

### Advanced Features (Future)

1. **Bulk Operations**:
   - Assign multiple establishments at once
   - Bulk permission updates

2. **Notification System**:
   - Email owners when assigned
   - Push notifications for reviews
   - Weekly performance reports

3. **Advanced Analytics**:
   - Competitor comparison
   - Revenue forecasting
   - Customer retention metrics

4. **Mobile App**:
   - Native iOS/Android app
   - Push notifications
   - Quick edit functionality

---

## References

### Code Files

- **Backend Controller**: `backend/src/controllers/establishmentOwnerController.ts` (358 lines)
- **Backend Routes**: `backend/src/routes/admin.ts`, `backend/src/routes/establishments.ts`
- **Frontend Admin**: `src/components/Admin/EstablishmentOwnersAdmin.tsx` (1250 lines)
- **Frontend Dashboard**: `src/components/MyEstablishmentsPage.tsx` (700 lines)
- **Database Migration**: `backend/database/migrations/add_establishment_owners.sql`
- **Type Definitions**: `backend/src/types/index.ts` (EstablishmentOwner interface)

### Documentation

- **Main Doc**: `CLAUDE.md` - Project overview
- **Roadmap**: `docs/features/ROADMAP.md`
- **API Docs**: http://localhost:8080/api-docs (Swagger UI)

### External Resources

- [Supabase Documentation](https://supabase.com/docs)
- [React Query Guide](https://tanstack.com/query/latest)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

---

## Support

For questions or issues:
1. Check this documentation
2. Review API docs at `/api-docs`
3. Check logs: `backend/logs/` and browser console
4. Review GitHub issues (if applicable)

---

**Last Updated**: January 2025
**Version**: v10.1
**Status**: ✅ Production Ready
