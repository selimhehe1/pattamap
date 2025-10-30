# Employee Claim System - API Testing Commands

## Prerequisites

✅ Backend running on `http://localhost:8080`
✅ SQL migrations executed (`add_user_employee_link.sql` + `extend_moderation_queue.sql`)
✅ At least one admin user in database

---

## Test Flow

### 1. Register Regular User

**Endpoint**: `POST /api/auth/register`

```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "pseudonym": "test_employee_user",
    "email": "employee.test@example.com",
    "password": "SecurePass123!"
  }'
```

**Expected Response**:
```json
{
  "user": {
    "id": "uuid-here",
    "pseudonym": "test_employee_user",
    "email": "employee.test@example.com",
    "role": "user",
    "account_type": "regular"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Save** the `accessToken` for next steps → `$AUTH_TOKEN`

---

### 2. Create Own Employee Profile (Self-Profile)

**Endpoint**: `POST /api/employees/create-own`

**Replace** `YOUR_AUTH_TOKEN` with the token from step 1.

```bash
curl -X POST http://localhost:8080/api/employees/create-own \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "name": "Test Employee",
    "nickname": "Testy",
    "age": 25,
    "nationality": "Thai",
    "description": "This is my self-managed employee profile for testing the claim system",
    "photos": ["https://example.com/photo1.jpg"],
    "social_media": {
      "instagram": "@test_employee",
      "line": "test123"
    }
  }'
```

**Expected Response**:
```json
{
  "employee": {
    "id": "employee-uuid",
    "name": "Test Employee",
    "nickname": "Testy",
    "status": "pending",
    "is_self_profile": true,
    "user_id": "user-uuid",
    "created_by": "user-uuid"
  },
  "claimRequest": {
    "id": "claim-request-uuid",
    "item_type": "employee_claim",
    "status": "pending",
    "request_metadata": {
      "claim_type": "self_profile",
      "message": "I am creating my own profile"
    }
  }
}
```

**Save** the `claimRequest.id` → `$CLAIM_REQUEST_ID`

---

### 3. Get My Linked Profile

**Endpoint**: `GET /api/employees/me`

```bash
curl -X GET http://localhost:8080/api/employees/me \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

**Expected Response**:
```json
{
  "employee": {
    "id": "employee-uuid",
    "name": "Test Employee",
    "nickname": "Testy",
    "status": "pending",
    "is_self_profile": true,
    "user_id": "user-uuid"
  },
  "claimStatus": "pending",
  "message": "Your employee profile is pending approval"
}
```

**Status** should be `pending` (awaiting admin approval)

---

### 4. Claim Existing Employee Profile

**Endpoint**: `POST /api/employees/:employeeId/claim`

**Use Case**: When a user wants to claim an existing employee profile that was created by someone else.

**Replace**:
- `YOUR_AUTH_TOKEN` with user token
- `EXISTING_EMPLOYEE_ID` with an existing employee ID

```bash
curl -X POST http://localhost:8080/api/employees/EXISTING_EMPLOYEE_ID/claim \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "message": "This is my profile. I work at Bar XYZ.",
    "verification_proof": [
      "https://example.com/my-photo-at-work.jpg",
      "https://example.com/my-id-proof.jpg"
    ]
  }'
```

**Expected Response**:
```json
{
  "claimRequest": {
    "id": "claim-request-uuid",
    "item_type": "employee_claim",
    "item_id": "employee-uuid",
    "status": "pending",
    "request_metadata": {
      "claim_type": "existing_profile",
      "employee_id": "employee-uuid",
      "message": "This is my profile. I work at Bar XYZ."
    },
    "verification_proof": [
      "https://example.com/my-photo-at-work.jpg",
      "https://example.com/my-id-proof.jpg"
    ]
  }
}
```

---

## Admin Endpoints

### 5. Get Claim Requests (Admin/Moderator Only)

**Endpoint**: `GET /api/employees/claims`

**Query Parameters**:
- `status` (optional): `pending` | `approved` | `rejected`
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Replace** `YOUR_ADMIN_TOKEN` with admin user token.

```bash
# Get all pending claims
curl -X GET "http://localhost:8080/api/employees/claims?status=pending" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Get all claims (no filter)
curl -X GET http://localhost:8080/api/employees/claims \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Get approved claims with pagination
curl -X GET "http://localhost:8080/api/employees/claims?status=approved&limit=20&offset=0" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Expected Response**:
```json
{
  "claims": [
    {
      "id": "claim-uuid",
      "item_type": "employee_claim",
      "item_id": "employee-uuid",
      "status": "pending",
      "submitted_by": "user-uuid",
      "submitter": {
        "id": "user-uuid",
        "pseudonym": "test_employee_user",
        "email": "employee.test@example.com"
      },
      "request_metadata": {
        "claim_type": "self_profile",
        "message": "I am creating my own profile"
      },
      "verification_proof": [],
      "item_data": {
        "employee": {
          "id": "employee-uuid",
          "name": "Test Employee",
          "nickname": "Testy",
          "photos": ["https://example.com/photo1.jpg"]
        }
      },
      "created_at": "2025-10-11T10:30:00Z"
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

---

### 6. Approve Claim Request (Admin Only)

**Endpoint**: `POST /api/employees/claims/:id/approve`

**Replace**:
- `YOUR_ADMIN_TOKEN` with admin token
- `CLAIM_REQUEST_ID` with the claim ID from step 2

```bash
curl -X POST http://localhost:8080/api/employees/claims/CLAIM_REQUEST_ID/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Employee claim approved successfully",
  "claim": {
    "id": "claim-uuid",
    "status": "approved",
    "moderator_id": "admin-uuid",
    "reviewed_at": "2025-10-11T10:35:00Z"
  },
  "employee": {
    "id": "employee-uuid",
    "status": "approved",
    "user_id": "user-uuid"
  },
  "user": {
    "id": "user-uuid",
    "account_type": "employee",
    "linked_employee_id": "employee-uuid"
  }
}
```

**After Approval**:
- ✅ User's `account_type` changes from `regular` → `employee`
- ✅ User's `linked_employee_id` is set to employee profile ID
- ✅ Employee's `user_id` is set to user ID
- ✅ Employee's `status` changes to `approved`
- ✅ Claim request `status` changes to `approved`

---

### 7. Reject Claim Request (Admin Only)

**Endpoint**: `POST /api/employees/claims/:id/reject`

**Replace**:
- `YOUR_ADMIN_TOKEN` with admin token
- `CLAIM_REQUEST_ID` with a claim ID

```bash
curl -X POST http://localhost:8080/api/employees/claims/CLAIM_REQUEST_ID/reject \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "moderator_notes": "Insufficient verification proof. Please provide a photo of yourself at the establishment."
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Employee claim rejected",
  "claim": {
    "id": "claim-uuid",
    "status": "rejected",
    "moderator_id": "admin-uuid",
    "moderator_notes": "Insufficient verification proof. Please provide a photo of yourself at the establishment.",
    "reviewed_at": "2025-10-11T10:40:00Z"
  }
}
```

**After Rejection**:
- ✅ Claim request `status` changes to `rejected`
- ✅ `moderator_notes` saved with reason
- ❌ User remains `regular` account type
- ❌ No linking established

---

## Verification Queries (Supabase SQL)

### Check User Account Type

```sql
SELECT id, pseudonym, email, account_type, linked_employee_id
FROM users
WHERE email = 'employee.test@example.com';
```

**Expected After Approval**:
```
account_type: 'employee'
linked_employee_id: 'employee-uuid'
```

### Check Employee Linking

```sql
SELECT id, name, nickname, status, user_id, is_self_profile
FROM employees
WHERE name = 'Test Employee';
```

**Expected After Approval**:
```
status: 'approved'
user_id: 'user-uuid'
is_self_profile: true
```

### Check Claim Request

```sql
SELECT id, item_type, status, request_metadata, moderator_notes, reviewed_at
FROM moderation_queue
WHERE item_type = 'employee_claim'
ORDER BY created_at DESC
LIMIT 5;
```

### Check Bidirectional Link Integrity

```sql
-- Verify one-to-one constraint (should return same pair)
SELECT
  u.id as user_id,
  u.pseudonym,
  u.linked_employee_id,
  e.id as employee_id,
  e.name,
  e.user_id as employee_user_id
FROM users u
LEFT JOIN employees e ON u.linked_employee_id = e.id
WHERE u.account_type = 'employee';

-- Should match: u.id = e.user_id AND u.linked_employee_id = e.id
```

---

## Error Scenarios to Test

### 1. Already Linked User

**Test**: User tries to create another profile when already linked

```bash
curl -X POST http://localhost:8080/api/employees/create-own \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN_OF_ALREADY_LINKED_USER" \
  -d '{"name":"Another Profile","photos":[]}'
```

**Expected**: `409 Conflict`
```json
{
  "error": "User already linked to employee profile",
  "code": "ALREADY_LINKED"
}
```

---

### 2. Non-Admin Accessing Admin Endpoints

**Test**: Regular user tries to approve claim

```bash
curl -X POST http://localhost:8080/api/employees/claims/CLAIM_ID/approve \
  -H "Authorization: Bearer REGULAR_USER_TOKEN"
```

**Expected**: `403 Forbidden`
```json
{
  "error": "Insufficient permissions",
  "code": "INSUFFICIENT_ROLE",
  "required": ["admin"],
  "current": "user"
}
```

---

### 3. Duplicate Claim

**Test**: User tries to claim same profile twice

```bash
# First claim (should succeed)
curl -X POST http://localhost:8080/api/employees/EMPLOYEE_ID/claim \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer USER_TOKEN" \
  -d '{"message":"First claim"}'

# Second claim (should fail)
curl -X POST http://localhost:8080/api/employees/EMPLOYEE_ID/claim \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer USER_TOKEN" \
  -d '{"message":"Second claim"}'
```

**Expected**: `409 Conflict`
```json
{
  "error": "Pending claim already exists for this employee",
  "code": "CLAIM_PENDING"
}
```

---

### 4. Claim Already Linked Profile

**Test**: User tries to claim employee that's already linked to another user

```bash
curl -X POST http://localhost:8080/api/employees/LINKED_EMPLOYEE_ID/claim \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer USER_TOKEN" \
  -d '{"message":"I want this profile"}'
```

**Expected**: `409 Conflict`
```json
{
  "error": "Employee already linked to another user",
  "code": "EMPLOYEE_LINKED"
}
```

---

## Success Criteria

✅ **User Registration**: New user created with `account_type: 'regular'`
✅ **Self-Profile Creation**: Employee created with `is_self_profile: true`, claim request submitted
✅ **Get My Profile**: Returns pending employee profile
✅ **Claim Existing**: Claim request created with verification proof
✅ **Get Claims (Admin)**: Returns list of pending claims with full metadata
✅ **Approve Claim (Admin)**: User → employee account type, bidirectional link established
✅ **Reject Claim (Admin)**: Claim rejected with moderator notes
✅ **Error Handling**: All edge cases return appropriate HTTP codes and error messages

---

## Next Steps

After successful API testing:
1. ✅ Mark Phase 2 complete
2. → Proceed to **Phase 3: Frontend E2E Testing**
3. Test complete user flows in browser:
   - Register → Create Self-Profile → Admin Approval → View Dashboard
   - Register → Claim Existing → Admin Approval → Linked Profile
4. Test Admin Panel → Employee Claims Management UI
5. Verify all UI states (pending/approved/rejected)

**Estimated Time**: Phase 2 (API Testing) = 30 minutes
