# 🔔 PattaMap Notification System

> **Complete documentation for the PattaMap notification system (v10.3)**
> Includes in-app notifications, PWA push notifications, and comprehensive business notifications

**Version**: v10.3
**Last Updated**: January 2025
**Status**: ✅ Production-Ready

### What's New in v10.3

✨ **+15 Business Notifications** added across 5 new systems:
- **Verification System** (4 notifications): Badge request workflow
- **VIP System** (4 notifications): Subscription lifecycle
- **Edit Proposals** (3 notifications): Collaborative editing workflow
- **Establishment Owners** (3 notifications): Owner management
- **Moderation** (1 notification): Comment removal

Total: **36 notification types** (was 21 in v10.2)

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Notification Types](#notification-types)
4. [Phase 3: PWA Push Notifications](#phase-3-pwa-push-notifications)
5. [Phase 4: Enhanced NotificationBell UI](#phase-4-enhanced-notificationbell-ui)
6. [API Endpoints](#api-endpoints)
7. [Database Schema](#database-schema)
8. [Frontend Components](#frontend-components)
9. [Internationalization (i18n)](#internationalization-i18n)
10. [Testing](#testing)
11. [Deployment Guide](#deployment-guide)
12. [Troubleshooting](#troubleshooting)

---

## Overview

The PattaMap notification system is a comprehensive solution for keeping users informed about relevant events in the platform. It combines:

- **In-App Notifications**: Real-time notifications displayed in the NotificationBell dropdown
- **PWA Push Notifications**: Browser push notifications via Service Worker (Phase 3)
- **Advanced UI**: Grouping, filtering, and batch operations (Phase 4)
- **Multilingual Support**: 6 languages (EN/TH/RU/CN/FR/HI) with 1,046 translation keys

### Key Features

✅ **36 Notification Types** across 10 categories (21 existing + 15 new in v10.3)
✅ **PWA Push Notifications** with Service Worker
✅ **Dual Grouping Modes**: By Type or By Date
✅ **Advanced Filtering**: Category filters + Unread toggle
✅ **Batch Operations**: Mark entire groups as read
✅ **Responsive Design**: Mobile-optimized UI
✅ **Multilingual**: 6 languages, 100% coverage
✅ **Tested**: 50+ tests (NotificationBell, pushManager, pushController)

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     PattaMap Notification System             │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌──────────────┐    ┌──────────────────┐
│   Backend     │    │   Database   │    │    Frontend      │
│               │    │              │    │                  │
│ - Controllers │◄───┤ - Supabase   │───►│ - NotificationBell│
│ - Services    │    │ - Tables     │    │ - PushManager    │
│ - Helpers     │    │ - RLS        │    │ - PushSettings   │
└───────────────┘    └──────────────┘    └──────────────────┘
        │                                          │
        │                                          │
        ▼                                          ▼
┌───────────────┐                        ┌──────────────────┐
│ Push Service  │◄───────────────────────│ Service Worker   │
│ (web-push)    │    Push Events         │ (/service-worker)│
└───────────────┘                        └──────────────────┘
```

### Technology Stack

**Backend**:
- Node.js + Express + TypeScript
- Supabase (PostgreSQL)
- web-push (for PWA push notifications)

**Frontend**:
- React ^19.2.0 + TypeScript ^5.9.3
- react-i18next (i18n)
- Service Worker API (PWA)

**Database**:
- `notifications` table (in-app notifications)
- `push_subscriptions` table (PWA subscriptions)

---

## Backend Services & Notification Triggers

### Automatic Notification Creation

The `notificationHelper.ts` service provides the `createNotification()` function, which automatically creates in-app notifications **and** sends PWA push notifications in a single call.

**Key Features**:
- ✅ **Automatic Push**: Sends push notification automatically (non-blocking)
- ✅ **Silent Failure**: Push errors don't block notification creation
- ✅ **Flexible Metadata**: Supports custom JSONB metadata
- ✅ **Type-Safe**: Full TypeScript support for all 21 notification types

**Usage Example**:

```typescript
import { createNotification } from '../utils/notificationHelper';

// Create notification + send push automatically
await createNotification({
  user_id: 'user-123',
  type: 'comment_reply',
  title: 'New Reply',
  message: 'Someone replied to your comment',
  link: '/employees/emp-456',
  metadata: { comment_id: 'comment-789' }
});

// Automatic push notification sent in background (non-blocking)
```

**Implementation**:

```typescript
// backend/src/utils/notificationHelper.ts
export async function createNotification(params: CreateNotificationParams) {
  // 1. Create in-app notification
  const { data, error } = await supabase
    .from('notifications')
    .insert([params])
    .select()
    .single();

  if (error) throw new Error(`Failed to create notification: ${error.message}`);

  // 2. Send push notification asynchronously (non-blocking)
  sendPushToUser(params.user_id, {
    title: params.title,
    body: params.message,
    icon: '/logo192.png',
    data: { url: params.link, notificationId: data.id, type: params.type }
  }).catch(error => {
    logger.warn('Push notification failed (non-blocking)', { error });
  });

  return data;
}
```

### Automatic Notification Triggers

**6 Auto-Triggers** automatically create notifications on key events:

| Trigger | Location | Event | Notification Type |
|---------|----------|-------|-------------------|
| **Comment Reply** | `commentController.ts` | User receives reply to their comment | `comment_reply` |
| **Comment Mention** | `commentController.ts` | User mentioned in comment (@username) | `comment_mention` |
| **Employee Approved** | `admin.ts` | Employee profile approved by admin | `employee_approved` |
| **Employee Rejected** | `admin.ts` | Employee profile rejected by admin | `employee_rejected` |
| **Establishment Approved** | `admin.ts` | Establishment approved by admin | `establishment_approved` |
| **Establishment Rejected** | `admin.ts` | Establishment rejected by admin | `establishment_rejected` |

**Example Trigger Implementation** (from `admin.ts`):

```typescript
// Approve employee - auto-notify user
if (data.user_id) {
  try {
    await notifyUserContentApproved(
      data.user_id,
      'employee',
      data.name || 'Employee',
      id
    );
    logger.info(`✅ Notification sent to user ${data.user_id} for employee approval`);
  } catch (notifyError) {
    logger.error('Failed to send approval notification:', notifyError);
  }
}
```

**Trigger Coverage**:
- ✅ Social interactions (comments, mentions)
- ✅ Moderation outcomes (approvals, rejections)
- ⏳ Future: Favorite availability, profile updates, admin actions

---

## Notification Types

### 36 Notification Types (10 Categories)

**v10.2**: 21 types
**v10.3**: +15 new business notifications = **36 total**

#### 1. Ownership Requests (4 types)
- `ownership_request_submitted` - User submitted ownership request
- `ownership_request_approved` - Admin approved ownership request
- `ownership_request_rejected` - Admin rejected ownership request
- `new_ownership_request` - New ownership request pending (admin notification)

#### 2. Verification System (4 types) ⭐ **NEW v10.3**
- `verification_submitted` - Employee submitted verification request
- `verification_approved` - Admin approved verified badge
- `verification_rejected` - Admin rejected verification request
- `verification_revoked` - Admin revoked verified badge

#### 3. VIP System (4 types) ⭐ **NEW v10.3**
- `vip_purchase_confirmed` - VIP subscription purchase confirmed
- `vip_payment_verified` - Admin verified VIP payment (cash/PromptPay)
- `vip_payment_rejected` - Admin rejected VIP payment
- `vip_subscription_cancelled` - VIP subscription cancelled

#### 4. Edit Proposals (3 types) ⭐ **NEW v10.3**
- `edit_proposal_submitted` - User submitted edit proposal (notify admins)
- `edit_proposal_approved` - Admin approved edit proposal
- `edit_proposal_rejected` - Admin rejected edit proposal

#### 5. Establishment Owners (3 types) ⭐ **NEW v10.3**
- `establishment_owner_assigned` - User assigned as establishment owner
- `establishment_owner_removed` - User removed as establishment owner
- `establishment_owner_permissions_updated` - Owner permissions updated

#### 6. Moderation (7 types - 1 new)
- `employee_approved` - Employee profile approved by moderator
- `employee_rejected` - Employee profile rejected by moderator
- `establishment_approved` - Establishment approved by moderator
- `establishment_rejected` - Establishment rejected by moderator
- `comment_approved` - Comment approved by moderator
- `comment_rejected` - Comment rejected by moderator
- `comment_removed` - Comment removed by moderator ⭐ **NEW v10.3**

#### 7. Social (4 types)
- `comment_reply` - Someone replied to user's comment
- `comment_mention` - User mentioned in comment
- `new_favorite` - Someone favorited user's profile
- `favorite_available` - Favorited establishment now available

#### 8. Employee Updates (3 types)
- `employee_profile_updated` - Employee profile updated (owner notification)
- `employee_photos_updated` - Employee photos updated
- `employee_position_changed` - Employee work position changed

#### 9. Admin/Moderator (3 types)
- `new_content_pending` - New content awaiting moderation
- `new_report` - New report submitted
- `moderation_action_required` - Urgent moderation action needed

#### 10. System (2 types)
- `system` - System announcements
- `other` - Miscellaneous notifications

### Category Icons

| Category | Emoji | Color Theme |
|----------|-------|-------------|
| Ownership | 🏆 | Gold |
| Moderation | ⚖️ | Blue |
| Social | 💬 | Purple |
| Updates | 📝 | Orange |
| Admin | 🛡️ | Red |
| System | ⚙️ | Gray |

---

## Phase 3: PWA Push Notifications

### Overview

Phase 3 implements browser push notifications using the Web Push Protocol and Service Workers. Users can subscribe to push notifications and receive alerts even when the app is closed.

### Components

#### Backend

**1. Push Service** (`backend/src/services/pushService.ts`)
- Web Push initialization
- VAPID key management
- Send push notifications to subscriptions

**2. Push Controller** (`backend/src/controllers/pushController.ts`)
- `GET /api/push/vapid-public-key` - Get VAPID public key
- `POST /api/push/subscribe` - Subscribe to push
- `POST /api/push/unsubscribe` - Unsubscribe from push
- `GET /api/push/subscriptions` - Get user's subscriptions
- `GET /api/push/status` - Check push status

#### Frontend

**1. Push Manager** (`src/utils/pushManager.ts`)
- Service Worker registration
- Push subscription management
- Permission handling
- VAPID key conversion

**2. Push Settings** (`src/components/User/PushSettings.tsx`)
- UI for enabling/disabling push
- Display subscription status
- Test notification button
- Device management

**3. Service Worker** (`public/service-worker.js`)
- Handle push events
- Display notifications
- Handle notification clicks

### Database Schema

**Table: `push_subscriptions`**

```sql
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);
```

### Configuration

**Environment Variables** (backend/.env):

```bash
# VAPID Keys (generate with: npx web-push generate-vapid-keys)
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_SUBJECT=mailto:your-email@example.com
```

### User Flow

1. **Enable Push**:
   - User clicks "Enable Push Notifications" in settings
   - Browser requests notification permission
   - Service Worker registers
   - Frontend gets VAPID public key from backend
   - Frontend creates push subscription
   - Subscription saved to `push_subscriptions` table

2. **Receive Push**:
   - Backend triggers notification (e.g., new comment reply)
   - Backend fetches user's push subscriptions
   - Backend sends push notification via web-push
   - Service Worker receives push event
   - Service Worker displays notification

3. **Disable Push**:
   - User clicks "Disable Push Notifications"
   - Frontend unsubscribes from browser PushManager
   - Subscription removed from database

### Testing

```bash
# Frontend tests
npm test -- pushManager.test.ts

# Backend tests
cd backend && npm test -- pushController.test.ts
```

---

## Phase 4: Enhanced NotificationBell UI

### Overview

Phase 4 enhances the NotificationBell component with advanced organization, filtering, and batch operations. The UI supports 21 notification types with dual grouping modes and 6-language support.

### Features

#### 1. Dual Grouping Modes

**Group by Type** (default):
- Groups notifications by category (Ownership, Moderation, Social, Updates, Admin, System)
- Each group shows total count and unread count
- Collapsible groups with smooth animations

**Group by Date**:
- Groups notifications by time period (Today, Yesterday, This Week, Older)
- Helps users track notification timeline
- Same collapsible behavior

#### 2. Advanced Filtering

**Unread Filter**:
- Toggle to show only unread notifications
- Visual indicator (🔵/⚪) for active filter
- Preserves grouping while filtering

**Category Filters**:
- 6 category buttons (All, Ownership, Moderation, Social, Updates, Admin, System)
- Active filter highlighted with gradient
- Icon + label for each category

#### 3. Batch Operations

**Mark Group as Read**:
- Button appears on group headers when group has unread notifications
- Marks all unread notifications in group as read
- Uses `Promise.all()` for parallel API calls
- Updates local state immediately

**Mark All as Read**:
- Button in dropdown header
- Marks all unread notifications as read
- Single API call to `/api/notifications/mark-all-read`

#### 4. Visual Design

**Icons**: 21 distinct emoji icons for each notification type
**Animations**: Smooth expand/collapse (groupExpand), slide-in (notificationSlideIn)
**Sticky Headers**: Group headers stick to top while scrolling
**Responsive**: Fully mobile-optimized with breakpoints at 768px and 480px

### Component Structure

```typescript
NotificationBell.tsx
├── State Management
│   ├── notifications (array)
│   ├── unreadCount (number)
│   ├── filterCategory (NotificationCategory)
│   ├── showOnlyUnread (boolean)
│   ├── groupingMode (GroupingMode)
│   └── collapsedGroups (Set<string>)
│
├── Helper Functions
│   ├── getCategoryForType()
│   ├── getNotificationIcon()
│   ├── getCategoryIcon()
│   ├── filteredNotifications (useMemo)
│   └── groupedNotifications (useMemo)
│
├── UI Sections
│   ├── Bell Icon + Badge
│   ├── Dropdown Menu
│   │   ├── Header (title + "Mark all read")
│   │   ├── Filters (unread toggle + grouping mode)
│   │   ├── Category Filters (6 buttons)
│   │   ├── Grouped Notifications
│   │   │   ├── Group Header (toggle + title + counts + "mark read")
│   │   │   └── Group Items (individual notifications)
│   │   └── Empty State
│   └── Loading State
```

### CSS Architecture

**File**: `src/styles/components/notification-bell.css`

**New Classes** (Phase 4):
- `.notification-filters` - Filter button row
- `.notification-filter-btn` - Individual filter buttons
- `.notification-category-filters` - Category chip row
- `.notification-category-btn` - Category buttons
- `.notification-group` - Group container
- `.notification-group-header` - Sticky group header
- `.notification-group-toggle` - Collapsible toggle button
- `.notification-group-items` - Group content
- `@keyframes groupExpand` - Expand/collapse animation
- `@keyframes notificationSlideIn` - Slide-in animation

**Responsive Breakpoints**:
- Desktop: Default styles
- Tablet: `@media (max-width: 768px)`
- Mobile: `@media (max-width: 480px)`

---

## API Endpoints

### In-App Notifications

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/notifications` | ✅ | Get user's notifications |
| GET | `/api/notifications/unread-count` | ✅ | Get unread count |
| PATCH | `/api/notifications/:id/read` | ✅ | Mark notification as read |
| PATCH | `/api/notifications/mark-all-read` | ✅ | Mark all as read |
| DELETE | `/api/notifications/:id` | ✅ | Delete notification |

### PWA Push Notifications

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/push/vapid-public-key` | ❌ | Get VAPID public key |
| POST | `/api/push/subscribe` | ✅ + CSRF | Subscribe to push |
| POST | `/api/push/unsubscribe` | ✅ + CSRF | Unsubscribe from push |
| GET | `/api/push/subscriptions` | ✅ | Get user's subscriptions |
| GET | `/api/push/status` | ✅ | Check push status |

---

## Database Schema

### notifications Table

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 21 possible types
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  metadata JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
```

### push_subscriptions Table

```sql
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);
```

---

## Frontend Components

### 1. NotificationBell.tsx

**Location**: `src/components/Common/NotificationBell.tsx`

**Responsibility**:
- Display notification bell icon with unread badge
- Show dropdown menu with notifications
- Handle grouping, filtering, and batch operations
- Poll for new notifications every 30 seconds

**Key Props**: None (uses AuthContext)

**State**:
- `notifications: Notification[]`
- `unreadCount: number`
- `filterCategory: NotificationCategory`
- `showOnlyUnread: boolean`
- `groupingMode: GroupingMode`
- `collapsedGroups: Set<string>`

### 2. PushSettings.tsx

**Location**: `src/components/User/PushSettings.tsx`

**Responsibility**:
- Display push notification settings
- Enable/disable push notifications
- Show subscription status and device count
- Send test notifications

**Key Functions**:
- `handleEnablePush()` - Subscribe to push
- `handleDisablePush()` - Unsubscribe from push
- `handleSendTest()` - Send test notification

### 3. pushManager.ts

**Location**: `src/utils/pushManager.ts`

**Exports**:
- `registerServiceWorker()` - Register service worker
- `getServiceWorkerRegistration()` - Get existing registration
- `isPushSupported()` - Check browser support
- `getNotificationPermission()` - Get permission status
- `requestNotificationPermission()` - Request permission
- `subscribeToPush()` - Subscribe to push
- `unsubscribeFromPush()` - Unsubscribe from push
- `getCurrentSubscription()` - Get current subscription
- `isPushSubscribed()` - Check if subscribed
- `getPushStatus()` - Get push status from backend
- `showTestNotification()` - Show test notification

---

## Internationalization (i18n)

### Supported Languages

✅ **English** (en.json) - Native
✅ **Thai** (th.json) - ภาษาไทย
✅ **Russian** (ru.json) - Русский
✅ **Chinese** (cn.json) - 简体中文
✅ **French** (fr.json) - Français
✅ **Hindi** (hi.json) - हिन्दी

### Translation Keys (32 keys)

**Structure** (all 6 languages):

```json
{
  "notifications": {
    "title": "Notifications",
    "markAllRead": "Mark all read",
    "loading": "Loading notifications...",
    "empty": "No notifications yet",
    "noFiltered": "No notifications match your filters",
    "unread": "unread",
    "delete": "Delete notification",
    "viewAll": "View all notifications",
    "expand": "Expand",
    "collapse": "Collapse",
    "markGroupRead": "Mark group as read",
    "groupBy": "Group by {{mode}}",
    "type": "type",
    "date": "date",
    "toggleGrouping": "Toggle grouping mode",
    "filters": {
      "all": "All",
      "unread": "Unread",
      "unreadOnly": "Show unread only"
    },
    "categories": {
      "all": "All",
      "ownership": "Ownership",
      "moderation": "Moderation",
      "social": "Social",
      "updates": "Updates",
      "admin": "Admin",
      "system": "System"
    },
    "dateGroups": {
      "today": "Today",
      "yesterday": "Yesterday",
      "this_week": "This Week",
      "older": "Older"
    },
    "time": {
      "justNow": "Just now",
      "minutesAgo": "{{count}}m ago",
      "hoursAgo": "{{count}}h ago",
      "daysAgo": "{{count}}d ago"
    }
  }
}
```

### Usage in Components

```typescript
import { useTranslation } from 'react-i18next';

const { t } = useTranslation();

// Simple translation
t('notifications.title') // "Notifications"

// Translation with interpolation
t('notifications.groupBy', { mode: 'type' }) // "Group by type"

// Nested keys
t('notifications.filters.all') // "All"
t('notifications.categories.ownership') // "Ownership"
t('notifications.dateGroups.today') // "Today"

// Time formatting with interpolation
t('notifications.time.justNow') // "Just now"
t('notifications.time.minutesAgo', { count: 5 }) // "5m ago"
t('notifications.time.hoursAgo', { count: 2 }) // "2h ago"
t('notifications.time.daysAgo', { count: 3 }) // "3d ago"
```

---

## Testing

### Test Coverage

**Frontend Tests** (38 tests written):
- `NotificationBell.test.tsx` - 38 comprehensive UI tests
  - Rendering, grouping, filtering, batch operations
  - Note: Requires Jest environment configuration (react-router-dom setup)

**Backend Tests** (37 tests - ✅ 100% passing):
- `notificationController.test.ts` - 18 controller unit tests
  - getMyNotifications, getUnreadCount, markAsRead, markAllRead, deleteNotification
- `notifications.integration.test.ts` - 19 integration tests
  - Full API endpoint testing with authentication and CSRF
  - Complete notification flow testing

**Total**: **75 tests** (37 backend passing ✅, 38 frontend written pending Jest setup)

### Running Tests

```bash
# Frontend tests
npm test -- NotificationBell.test.tsx          # 38 UI tests (needs Jest setup)

# Backend tests (✅ All passing)
cd backend
npm test -- notificationController.test.ts     # 18 controller unit tests
npm test -- notifications.integration.test.ts  # 19 integration tests

# Run all notification tests
cd backend && npm test -- notification
```

### Test Suites

#### NotificationBell.test.tsx
1. Rendering (bell icon, badge, authenticated user)
2. Dropdown Menu (open, close, empty state)
3. Notification Grouping (by type, by date, collapse/expand)
4. Notification Filtering (unread, categories)
5. Batch Actions (mark group as read, mark all as read)
6. Individual Notification Actions (mark as read, delete)
7. Notification Icons (21 icons)
8. Error Handling
9. Real-time Updates (30s polling)

#### pushManager.test.ts
1. isPushSupported
2. getNotificationPermission
3. requestNotificationPermission
4. registerServiceWorker
5. getServiceWorkerRegistration
6. subscribeToPush
7. unsubscribeFromPush
8. getCurrentSubscription
9. isPushSubscribed
10. getPushStatus
11. showTestNotification

#### pushController.test.ts
1. getPublicKey (VAPID key)
2. subscribe (create, update, validation)
3. unsubscribe (remove subscription)
4. getUserSubscriptions (list, truncate endpoints)
5. getPushStatus (configured, subscribed)

---

## Deployment Guide

### Phase 3: PWA Push Notifications

#### 1. Generate VAPID Keys

```bash
cd backend
npx web-push generate-vapid-keys
```

This outputs:
```
Public Key: BN...your-public-key...
Private Key: abc...your-private-key...
```

#### 2. Configure Backend Environment

Add to `backend/.env`:

```bash
VAPID_PUBLIC_KEY=BN...your-public-key...
VAPID_PRIVATE_KEY=abc...your-private-key...
VAPID_SUBJECT=mailto:your-email@pattaya.guide
```

#### 3. Create Database Table

Run in Supabase SQL Editor:

```sql
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);
```

#### 4. Deploy Service Worker

Ensure `public/service-worker.js` is accessible at root:

```
https://your-domain.com/service-worker.js
```

Service Worker must be served over HTTPS (required by browsers).

#### 5. Test Push Notifications

1. Enable push in user settings
2. Check browser console for subscription success
3. Send test notification
4. Verify notification appears even when app is closed

### Phase 4: Enhanced NotificationBell UI

Phase 4 is frontend-only, no backend deployment needed.

#### Verify Deployment

1. Check NotificationBell component loads with 21 types
2. Test grouping modes (by type and by date)
3. Test filtering (unread + 6 categories)
4. Test batch operations (mark group as read)
5. Verify i18n works in all 6 languages
6. Test responsive design (mobile/tablet/desktop)

---

## Troubleshooting

### PWA Push Notifications

#### Issue: "Service workers not supported"

**Cause**: Browser doesn't support Service Workers
**Solution**: Use Chrome, Firefox, Edge, or Safari (iOS 16.4+)

#### Issue: "Permission denied"

**Cause**: User denied notification permission
**Solution**: User must manually allow in browser settings

#### Issue: "Push notifications not configured on server"

**Cause**: Missing or invalid VAPID keys in backend/.env
**Solution**:
1. Run `npx web-push generate-vapid-keys`
2. Add keys to backend/.env
3. Restart backend server

#### Issue: Service Worker fails to register

**Cause**: Service Worker not accessible or HTTPS required
**Solution**:
1. Verify `/service-worker.js` is accessible
2. Ensure production uses HTTPS
3. Check browser console for errors

### NotificationBell UI

#### Issue: Notifications not grouping

**Cause**: Frontend NotificationType out of sync with backend
**Solution**: Ensure NotificationBell.tsx has all 21 types

#### Issue: Translations missing

**Cause**: Language file missing notification keys
**Solution**: Verify all 6 language files have "notifications" object

#### Issue: Filters not working

**Cause**: filteredNotifications useMemo dependencies incorrect
**Solution**: Check useMemo dependencies include `filterCategory` and `showOnlyUnread`

#### Issue: Groups not collapsing

**Cause**: collapsedGroups Set not updating
**Solution**: Verify toggleGroup function updates Set correctly

### General Issues

#### Issue: Unread count not updating

**Cause**: 30-second polling interval
**Solution**: Wait up to 30 seconds, or manually refresh

#### Issue: Notifications not appearing

**Cause**: RLS policies blocking queries
**Solution**: Verify Supabase RLS policies allow user to read own notifications

#### Issue: Performance issues with many notifications

**Cause**: Large notification list rendering
**Solution**:
1. Implement pagination (backend ready)
2. Use React.memo() for notification items
3. Consider virtualizing long lists

---

## Future Enhancements

### Planned (v10.3+)

1. **Real-time Notifications**: Websocket/Supabase Realtime instead of polling
2. **Notification Preferences**: User can customize which notification types to receive
3. **Notification History**: Dedicated page for viewing old notifications
4. **Rich Notifications**: Images, actions buttons in notifications
5. **Sound Alerts**: Optional sound when new notification arrives
6. **Desktop Notifications**: Native desktop notifications (Electron)

### Under Consideration

- **Email Notifications**: Send important notifications via email
- **SMS Notifications**: Critical alerts via SMS (Twilio)
- **Notification Scheduling**: Schedule notifications for future delivery
- **Notification Templates**: Admin can create notification templates
- **A/B Testing**: Test different notification copy/timing

---

## Resources

### Documentation

- **API Docs**: http://localhost:8080/api-docs (Swagger UI)
- **Project Structure**: `docs/architecture/PROJECT_STRUCTURE.md`
- **Testing Guide**: `docs/development/TESTING.md`
- **i18n Implementation**: `docs/features/I18N_IMPLEMENTATION.md`

### External Resources

- [Web Push Protocol](https://datatracker.ietf.org/doc/html/rfc8030)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Notification API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)
- [web-push Library](https://github.com/web-push-libs/web-push)

### Contact

For questions or issues:
- **GitHub Issues**: [pattamap/issues](https://github.com/yourusername/pattamap/issues)
- **Email**: support@pattaya.guide
- **Slack**: #pattamap-notifications

---

**🏮 PattaMap - Keep Users Engaged with Smart Notifications**

**Version**: v10.2 | **Status**: Production-Ready | **Last Updated**: January 2025
