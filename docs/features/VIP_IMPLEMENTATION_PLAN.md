# 🚀 PattaMap VIP System - Plan d'Implémentation (8 Jours)

**Version**: 1.0
**Date**: Janvier 2025
**Statut**: Ready for Development

---

## 📋 Vue d'Ensemble

Ce document détaille le plan d'implémentation complet du système VIP sur **8 jours de développement**.

### Timeline Globale

| Phase | Jours | Focus | Priorité |
|-------|-------|-------|----------|
| **Phase 1** | J1-J4 | VIP Employée | 🔴 Haute |
| **Phase 2** | J5-J7 | VIP Établissement | 🟡 Moyenne |
| **Phase 3** | J8 | Testing & Polish | 🟢 Critique |

### Objectifs par Phase

**Phase 1** : Système VIP Employée fonctionnel end-to-end (purchase → payment → activation → display → analytics)

**Phase 2** : Système VIP Établissement (purchase → featured homepage → maps → analytics)

**Phase 3** : Tests complets, bug fixes, documentation finale

---

## 📅 Phase 1 : VIP Employée (4 Jours)

### ⏰ Jour 1 - Backend Foundation

**Objectif** : Créer la base technique complète (DB + API + Config)

**Durée** : 8h (1 journée complète)

---

#### **Morning (4h) - Database & Configuration**

**1.1 Migration Database** (1.5h)

**Fichier** : `backend/database/migrations/013_create_vip_system.sql`

```sql
-- VIP Subscriptions for Employees
CREATE TABLE employee_vip_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  purchased_by_user_id UUID NOT NULL REFERENCES users(id),
  purchased_by_type VARCHAR(20),

  starts_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',

  duration_days INTEGER NOT NULL,
  amount_paid INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'THB',

  payment_method VARCHAR(30),
  payment_reference VARCHAR(50) UNIQUE NOT NULL,
  payment_proof_url TEXT,
  payment_verified BOOLEAN DEFAULT false,
  verified_by_admin_id UUID REFERENCES users(id),
  verified_at TIMESTAMP,
  admin_notes TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT valid_duration CHECK (duration_days IN (7, 30, 90)),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'active', 'expired', 'cancelled')),
  CONSTRAINT valid_payment_method CHECK (payment_method IN ('promptpay', 'cash'))
);

-- Indexes
CREATE INDEX idx_employee_vip_employee_id ON employee_vip_subscriptions(employee_id);
CREATE INDEX idx_employee_vip_status ON employee_vip_subscriptions(status, expires_at);
CREATE INDEX idx_employee_vip_reference ON employee_vip_subscriptions(payment_reference);
CREATE INDEX idx_employee_vip_active ON employee_vip_subscriptions(employee_id, status, expires_at)
  WHERE status = 'active';

-- VIP Analytics Events
CREATE TABLE vip_analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(20) NOT NULL,
  entity_id UUID NOT NULL,
  event_type VARCHAR(30) NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT valid_entity_type CHECK (entity_type IN ('employee', 'establishment')),
  CONSTRAINT valid_event_type CHECK (event_type IN (
    'profile_view', 'map_click', 'favorite_add', 'search_appearance', 'lineup_view'
  ))
);

CREATE INDEX idx_vip_analytics_entity ON vip_analytics_events(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_vip_analytics_event_type ON vip_analytics_events(event_type, created_at DESC);
CREATE INDEX idx_vip_analytics_created_at ON vip_analytics_events(created_at DESC);

-- Materialized View for Analytics
CREATE MATERIALIZED VIEW vip_analytics_summary AS
SELECT
  entity_type,
  entity_id,
  DATE_TRUNC('day', created_at) as date,
  event_type,
  COUNT(*) as event_count,
  COUNT(DISTINCT user_id) as unique_users
FROM vip_analytics_events
WHERE created_at >= NOW() - INTERVAL '90 days'
GROUP BY entity_type, entity_id, DATE_TRUNC('day', created_at), event_type;

CREATE UNIQUE INDEX idx_vip_analytics_summary_unique
  ON vip_analytics_summary(entity_type, entity_id, date, event_type);

CREATE INDEX idx_vip_analytics_summary_entity
  ON vip_analytics_summary(entity_id, date DESC);

-- Refresh function
CREATE OR REPLACE FUNCTION refresh_vip_analytics_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY vip_analytics_summary;
END;
$$ LANGUAGE plpgsql;

-- Payment Settings
CREATE TABLE payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_method VARCHAR(30) NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,

  promptpay_qr_code_url TEXT,
  promptpay_phone_number VARCHAR(15),
  promptpay_id_number VARCHAR(20),

  cash_contact_line VARCHAR(100),
  cash_contact_phone VARCHAR(15),
  cash_instructions TEXT,

  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by_admin_id UUID REFERENCES users(id),

  CONSTRAINT valid_payment_method CHECK (payment_method IN ('promptpay', 'cash'))
);

-- Seed initial data
INSERT INTO payment_settings (payment_method, is_active) VALUES
  ('promptpay', true),
  ('cash', true);

COMMENT ON TABLE employee_vip_subscriptions IS 'VIP subscriptions for employees to boost visibility';
COMMENT ON TABLE vip_analytics_events IS 'Tracking events for VIP analytics (views, clicks, favorites)';
COMMENT ON TABLE payment_settings IS 'Admin configuration for payment methods (PromptPay, Cash)';
```

**Action** : Exécuter dans Supabase SQL Editor

**Validation** : Vérifier que les 4 tables existent dans Supabase Dashboard

---

**1.2 Configuration Pricing** (0.5h)

**Fichier** : `backend/src/config/vipPricing.ts`

```typescript
export const VIP_PRICING = {
  employee: {
    7: 100000,   // 1,000฿ (en centimes)
    30: 320000,  // 3,200฿
    90: 800000   // 8,000฿
  },
  establishment: {
    7: 300000,    // 3,000฿
    30: 900000,   // 9,000฿
    90: 2100000,  // 21,000฿
    180: 3600000  // 36,000฿
  }
} as const;

export type VIPDuration = 7 | 30 | 90 | 180;
export type VIPEntityType = 'employee' | 'establishment';

export function getVIPPrice(
  entityType: VIPEntityType,
  durationDays: VIPDuration
): number {
  const price = VIP_PRICING[entityType][durationDays];
  if (!price) {
    throw new Error(`Invalid duration ${durationDays} for ${entityType}`);
  }
  return price;
}

export function generatePaymentReference(
  entityType: VIPEntityType
): string {
  const prefix = entityType === 'employee' ? 'VIP-EMP' : 'VIP-EST';
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${date}-${random}`;
}

export function formatAmountDisplay(amountCents: number): string {
  return `${(amountCents / 100).toLocaleString()}฿`;
}
```

**Validation** : `npm run build` dans `backend/` → Pas d'erreurs TypeScript

---

**1.3 Tracking Utils** (1h)

**Fichier** : `backend/src/utils/vipTracking.ts`

```typescript
import { supabase } from '../config/supabaseClient';
import { logger } from './logger';

export type VIPEventType =
  | 'profile_view'
  | 'map_click'
  | 'favorite_add'
  | 'search_appearance'
  | 'lineup_view';

export async function trackVIPEvent(
  entityType: 'employee' | 'establishment',
  entityId: string,
  eventType: VIPEventType,
  userId?: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const { error } = await supabase
      .from('vip_analytics_events')
      .insert({
        entity_type: entityType,
        entity_id: entityId,
        event_type: eventType,
        user_id: userId,
        metadata
      });

    if (error) {
      logger.error('Track VIP event error:', error);
    }
  } catch (error) {
    logger.error('Track VIP event exception:', error);
    // Don't throw - tracking should not break app flow
  }
}

export async function getVIPAnalytics(
  entityType: 'employee' | 'establishment',
  entityId: string,
  daysBack: number = 30
) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  const { data: events, error } = await supabase
    .from('vip_analytics_events')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: false });

  if (error) throw error;

  return calculateAnalyticsMetrics(events || []);
}

function calculateAnalyticsMetrics(events: any[]) {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const total_views = events.filter(e => e.event_type === 'profile_view').length;
  const total_favorites = events.filter(e => e.event_type === 'favorite_add').length;
  const total_search_appearances = events.filter(e => e.event_type === 'search_appearance').length;

  const thisWeekEvents = events.filter(e => new Date(e.created_at) >= sevenDaysAgo);
  const lastWeekEvents = events.filter(e =>
    new Date(e.created_at) >= fourteenDaysAgo &&
    new Date(e.created_at) < sevenDaysAgo
  );

  const views_this_week = thisWeekEvents.filter(e => e.event_type === 'profile_view').length;
  const views_last_week = lastWeekEvents.filter(e => e.event_type === 'profile_view').length;
  const views_trend = views_last_week > 0
    ? Math.round(((views_this_week - views_last_week) / views_last_week) * 100)
    : views_this_week > 0 ? 100 : 0;

  const timeline = getLast7DaysTimeline(thisWeekEvents);
  const sources = getTrafficSources(events);

  const searchEvents = events.filter(e => e.event_type === 'search_appearance');
  const avg_position = searchEvents.length > 0
    ? (searchEvents.reduce((sum, e) => sum + (e.metadata?.position || 0), 0) / searchEvents.length).toFixed(1)
    : '0';

  const click_through_rate = total_search_appearances > 0
    ? `${Math.round((total_views / total_search_appearances) * 100)}%`
    : '0%';

  return {
    total_views,
    total_favorites,
    total_search_appearances,
    views_this_week,
    views_last_week,
    views_trend,
    favorites_this_week: thisWeekEvents.filter(e => e.event_type === 'favorite_add').length,
    timeline,
    sources,
    search_position_avg: avg_position,
    click_through_rate
  };
}

function getLast7DaysTimeline(events: any[]) {
  const timeline = [];
  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const dayEvents = events.filter(e => e.created_at.startsWith(dateStr));

    timeline.push({
      date: dateStr,
      views: dayEvents.filter(e => e.event_type === 'profile_view').length,
      favorites: dayEvents.filter(e => e.event_type === 'favorite_add').length
    });
  }

  return timeline;
}

function getTrafficSources(events: any[]) {
  const viewEvents = events.filter(e => e.event_type === 'profile_view');
  const total = viewEvents.length;
  if (total === 0) return {};

  const sources: Record<string, number> = {};

  viewEvents.forEach(e => {
    const source = e.metadata?.source || 'direct';
    sources[source] = (sources[source] || 0) + 1;
  });

  const percentages: Record<string, number> = {};
  Object.entries(sources).forEach(([source, count]) => {
    percentages[source] = Math.round((count / total) * 100);
  });

  return percentages;
}
```

**Validation** : Tests unitaires (optionnel jour 1, critique jour 8)

---

**1.4 Permission Helpers** (1h)

**Fichier** : `backend/src/utils/vipPermissions.ts`

```typescript
import { supabase } from '../config/supabaseClient';

export async function checkVIPPurchasePermission(
  userId: string,
  employeeId: string
): Promise<boolean> {
  // Check if user is the employee herself
  const { data: employee } = await supabase
    .from('employees')
    .select('user_id')
    .eq('id', employeeId)
    .single();

  if (employee?.user_id === userId) return true;

  // Check if user is admin/moderator
  const { data: user } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();

  if (user?.role === 'admin' || user?.role === 'moderator') return true;

  // Check if user is establishment owner of employee's current establishment
  const { data: employment } = await supabase
    .from('current_employment')
    .select('establishment_id')
    .eq('employee_id', employeeId)
    .maybeSingle();

  if (employment) {
    const { data: ownership } = await supabase
      .from('establishment_owners')
      .select('*')
      .eq('user_id', userId)
      .eq('establishment_id', employment.establishment_id)
      .maybeSingle();

    if (ownership) return true;
  }

  return false;
}

export async function getPurchasedByType(
  userId: string,
  employeeId: string
): Promise<'employee' | 'manager' | 'admin' | 'other'> {
  const { data: employee } = await supabase
    .from('employees')
    .select('user_id')
    .eq('id', employeeId)
    .single();

  if (employee?.user_id === userId) return 'employee';

  const { data: user } = await supabase
    .from('users')
    .select('role, account_type')
    .eq('id', userId)
    .single();

  if (user?.role === 'admin') return 'admin';
  if (user?.account_type === 'establishment_owner') return 'manager';

  return 'other';
}

export async function checkVIPAnalyticsPermission(
  userId: string,
  employeeId: string
): Promise<boolean> {
  // Same as purchase permission
  return checkVIPPurchasePermission(userId, employeeId);
}
```

**Validation** : `npm run build` → Pas d'erreurs

---

#### **Afternoon (4h) - Controllers & Routes**

**1.5 VIP Employee Controller** (2.5h)

**Fichier** : `backend/src/controllers/vipEmployeeController.ts`

*Voir VIP_SYSTEM.md section 3.2 pour code complet (trop long pour inclure ici)*

**Fonctions à implémenter** :
- `initiatePurchase` - Génère reference + retourne payment details
- `uploadPaymentProof` - Upload screenshot Cloudinary
- `getVIPStatus` - Check si employée est VIP (public)
- `getVIPAnalytics` - Récupère analytics (auth required)
- `cancelVIP` - Annule VIP (no refund)
- `renewVIP` - Renouvelle VIP

**Validation** : `npm run build` → Pas d'erreurs

---

**1.6 Routes VIP Employee** (1h)

**Fichier** : `backend/src/routes/vipEmployee.ts`

```typescript
import { Router } from 'express';
import { authenticateToken, csrfProtection } from '../middleware/auth';
import * as vipEmployeeController from '../controllers/vipEmployeeController';
import { upload } from '../middleware/upload'; // Multer for file upload

const router = Router();

router.post(
  '/initiate-purchase',
  authenticateToken,
  csrfProtection,
  vipEmployeeController.initiatePurchase
);

router.post(
  '/upload-proof',
  authenticateToken,
  upload.single('proof_image'), // Multer middleware
  csrfProtection,
  vipEmployeeController.uploadPaymentProof
);

router.get(
  '/:employee_id/status',
  vipEmployeeController.getVIPStatus
);

router.get(
  '/:employee_id/analytics',
  authenticateToken,
  vipEmployeeController.getVIPAnalytics
);

router.post(
  '/:employee_id/cancel',
  authenticateToken,
  csrfProtection,
  vipEmployeeController.cancelVIP
);

router.post(
  '/:employee_id/renew',
  authenticateToken,
  csrfProtection,
  vipEmployeeController.renewVIP
);

export default router;
```

**Fichier** : `backend/src/server.ts` - Ajouter route

```typescript
import vipEmployeeRoutes from './routes/vipEmployee';

app.use('/api/vip/employee', vipEmployeeRoutes);
```

**Validation** :
```bash
npm run dev
curl http://localhost:8080/api/vip/employee/test-id/status
# Should return { is_vip: false, ... }
```

---

**1.7 Rate Limiter VIP** (0.5h)

**Fichier** : `backend/src/middleware/rateLimiter.ts` - Ajouter

```typescript
export const vipPurchaseRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: 'Too many VIP purchase attempts, please try again later',
  keyGenerator: (req: AuthRequest) => req.user?.id || req.ip
});
```

**Appliquer aux routes** :

```typescript
router.post(
  '/initiate-purchase',
  authenticateToken,
  vipPurchaseRateLimiter, // Add rate limiter
  csrfProtection,
  vipEmployeeController.initiatePurchase
);
```

**Validation** : Test avec 6 requêtes successives → 6ème bloquée

---

**✅ Fin Jour 1** : Backend foundation complet (DB + Config + API + Utils)

---

### ⏰ Jour 2 - Payment System

**Objectif** : Intégrer PromptPay + Cash + Upload screenshot + Admin config

**Durée** : 8h

---

#### **Morning (4h) - PromptPay Integration**

**2.1 Payment Settings Admin UI** (2h)

**Fichier** : `src/components/Admin/PaymentSettings.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { useSecureFetch } from '../../hooks/useSecureFetch';
import toast from '../../utils/toast';
import './PaymentSettings.css';

const PaymentSettings: React.FC = () => {
  const { secureFetch } = useSecureFetch();
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const response = await secureFetch(
      `${process.env.REACT_APP_API_URL}/api/admin/vip/payment-settings`
    );
    const data = await response.json();
    setSettings(data.settings);
    setLoading(false);
  };

  const handleQRUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('qr_code', file);

    try {
      const response = await secureFetch(
        `${process.env.REACT_APP_API_URL}/api/admin/vip/upload-qr`,
        {
          method: 'POST',
          body: formData
        }
      );

      const data = await response.json();
      setSettings({ ...settings, promptpay_qr_code_url: data.qr_url });
      toast.success('QR Code uploaded successfully!');
    } catch (error) {
      toast.error('Failed to upload QR code');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      await secureFetch(
        `${process.env.REACT_APP_API_URL}/api/admin/vip/payment-settings`,
        {
          method: 'PUT',
          body: JSON.stringify(settings)
        }
      );

      toast.success('Payment settings updated!');
    } catch (error) {
      toast.error('Failed to update settings');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="payment-settings">
      <h2>💳 Payment Settings</h2>

      {/* PromptPay Section */}
      <section className="payment-section">
        <h3>🇹🇭 PromptPay</h3>

        <div className="form-group">
          <label>QR Code Image</label>
          {settings.promptpay_qr_code_url && (
            <img
              src={settings.promptpay_qr_code_url}
              alt="PromptPay QR"
              className="qr-preview"
            />
          )}
          <input
            type="file"
            accept="image/*"
            onChange={handleQRUpload}
            disabled={uploading}
          />
          {uploading && <p>Uploading...</p>}
        </div>

        <div className="form-group">
          <label>Phone Number</label>
          <input
            type="text"
            value={settings.promptpay_phone_number || ''}
            onChange={e => setSettings({ ...settings, promptpay_phone_number: e.target.value })}
            placeholder="081-234-5678"
          />
        </div>

        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={settings.promptpay_active}
              onChange={e => setSettings({ ...settings, promptpay_active: e.target.checked })}
            />
            Active
          </label>
        </div>
      </section>

      {/* Cash Section */}
      <section className="payment-section">
        <h3>💵 Cash Payment</h3>

        <div className="form-group">
          <label>LINE Contact</label>
          <input
            type="text"
            value={settings.cash_contact_line || ''}
            onChange={e => setSettings({ ...settings, cash_contact_line: e.target.value })}
            placeholder="@pattamap"
          />
        </div>

        <div className="form-group">
          <label>Phone Contact</label>
          <input
            type="text"
            value={settings.cash_contact_phone || ''}
            onChange={e => setSettings({ ...settings, cash_contact_phone: e.target.value })}
            placeholder="081-234-5678"
          />
        </div>

        <div className="form-group">
          <label>Instructions</label>
          <textarea
            value={settings.cash_instructions || ''}
            onChange={e => setSettings({ ...settings, cash_instructions: e.target.value })}
            placeholder="Contact us on LINE to arrange cash payment..."
            rows={4}
          />
        </div>

        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={settings.cash_active}
              onChange={e => setSettings({ ...settings, cash_active: e.target.checked })}
            />
            Active
          </label>
        </div>
      </section>

      <button onClick={handleSave} className="btn-save">
        Save Settings
      </button>
    </div>
  );
};

export default PaymentSettings;
```

**Fichier** : `backend/src/controllers/adminVipController.ts` - Ajouter endpoints

```typescript
export const getPaymentSettings = async (req: AuthRequest, res: Response) => {
  const { data, error } = await supabase
    .from('payment_settings')
    .select('*');

  if (error) throw error;

  // Merge into single object
  const settings = data.reduce((acc, row) => {
    if (row.payment_method === 'promptpay') {
      acc.promptpay_qr_code_url = row.promptpay_qr_code_url;
      acc.promptpay_phone_number = row.promptpay_phone_number;
      acc.promptpay_active = row.is_active;
    } else if (row.payment_method === 'cash') {
      acc.cash_contact_line = row.cash_contact_line;
      acc.cash_contact_phone = row.cash_contact_phone;
      acc.cash_instructions = row.cash_instructions;
      acc.cash_active = row.is_active;
    }
    return acc;
  }, {} as any);

  res.json({ settings });
};

export const updatePaymentSettings = async (req: AuthRequest, res: Response) => {
  const settings = req.body;
  const admin_id = req.user?.id;

  // Update PromptPay
  await supabase
    .from('payment_settings')
    .update({
      promptpay_qr_code_url: settings.promptpay_qr_code_url,
      promptpay_phone_number: settings.promptpay_phone_number,
      is_active: settings.promptpay_active,
      updated_at: new Date().toISOString(),
      updated_by_admin_id: admin_id
    })
    .eq('payment_method', 'promptpay');

  // Update Cash
  await supabase
    .from('payment_settings')
    .update({
      cash_contact_line: settings.cash_contact_line,
      cash_contact_phone: settings.cash_contact_phone,
      cash_instructions: settings.cash_instructions,
      is_active: settings.cash_active,
      updated_at: new Date().toISOString(),
      updated_by_admin_id: admin_id
    })
    .eq('payment_method', 'cash');

  res.json({ message: 'Settings updated successfully' });
};
```

**Validation** : Admin Panel → Payment Settings tab → Upload QR + Save

---

**2.2 Upload Payment Proof (Cloudinary)** (1.5h)

**Déjà fait dans Jour 1** (`vipEmployeeController.uploadPaymentProof`)

**Test** : Upload screenshot depuis frontend → Vérifie Cloudinary upload

---

**2.3 Payment Instructions UI** (0.5h)

**Fichier** : `src/components/VIP/PaymentInstructions.tsx`

```typescript
import React from 'react';
import './PaymentInstructions.css';

interface Props {
  paymentDetails: {
    method: 'promptpay' | 'cash';
    reference: string;
    amount: number;
    qr_code_url?: string;
    phone_number?: string;
    contact_line?: string;
    contact_phone?: string;
    instructions?: string;
  };
  onUploadProof?: () => void;
}

const PaymentInstructions: React.FC<Props> = ({ paymentDetails, onUploadProof }) => {
  if (paymentDetails.method === 'promptpay') {
    return (
      <div className="payment-instructions promptpay">
        <h2>🇹🇭 PromptPay Payment</h2>
        <p className="amount">Amount: {paymentDetails.amount.toLocaleString()}฿</p>

        <div className="qr-code-container">
          <img src={paymentDetails.qr_code_url} alt="PromptPay QR Code" />
        </div>

        <p className="phone-number">Or transfer to: {paymentDetails.phone_number}</p>

        <div className="reference-code">
          <strong>Reference Code:</strong> {paymentDetails.reference}
          <button onClick={() => navigator.clipboard.writeText(paymentDetails.reference)}>
            📋 Copy
          </button>
        </div>

        <div className="instructions">
          <h3>Instructions:</h3>
          <ol>
            <li>Open your banking app</li>
            <li>Scan QR code or enter phone number</li>
            <li>Confirm payment of {paymentDetails.amount.toLocaleString()}฿</li>
            <li>Take screenshot of confirmation</li>
            <li>Upload screenshot below</li>
          </ol>
        </div>

        <button onClick={onUploadProof} className="btn-upload-proof">
          📷 Upload Payment Screenshot
        </button>

        <p className="verification-note">
          After uploading, admin will verify within 1-24 hours and activate your VIP.
        </p>
      </div>
    );
  }

  // Cash payment
  return (
    <div className="payment-instructions cash">
      <h2>💵 Cash Payment</h2>
      <p className="amount">Amount: {paymentDetails.amount.toLocaleString()}฿</p>

      <div className="contact-info">
        <h3>Contact us to arrange payment:</h3>
        <p>📱 LINE: {paymentDetails.contact_line}</p>
        <p>📞 Phone: {paymentDetails.contact_phone}</p>
      </div>

      <div className="reference-code">
        <strong>Reference Code:</strong> {paymentDetails.reference}
        <button onClick={() => navigator.clipboard.writeText(paymentDetails.reference)}>
          📋 Copy
        </button>
        <p className="note">Please provide this code when paying</p>
      </div>

      <div className="instructions">
        <p>{paymentDetails.instructions}</p>
      </div>

      <div className="next-steps">
        <h3>Next Steps:</h3>
        <ol>
          <li>Contact us on LINE or phone</li>
          <li>Mention your reference code</li>
          <li>We'll arrange a meeting time & place</li>
          <li>Bring exact cash amount</li>
          <li>VIP activated immediately after payment</li>
        </ol>
      </div>

      <div className="contact-buttons">
        <a href={`https://line.me/R/ti/p/${paymentDetails.contact_line}`} className="btn-line">
          Contact on LINE
        </a>
        <a href={`tel:${paymentDetails.contact_phone}`} className="btn-call">
          Call Now
        </a>
      </div>
    </div>
  );
};

export default PaymentInstructions;
```

**Validation** : Frontend affiche correctement QR code + instructions

---

#### **Afternoon (4h) - Admin Verification Queue**

**2.4 Admin VIP Verification Queue** (3h)

**Fichier** : `src/components/Admin/AdminVIPVerificationQueue.tsx`

*Trop long - voir VIP_SYSTEM.md section 4.2 pour design complet*

**Features** :
- Liste pending payments (PromptPay + Cash)
- Affichage screenshot payment proof
- Approve/Reject buttons
- Admin notes textfield
- Manual activation pour cash

**Fichier** : `backend/src/controllers/adminVipController.ts`

```typescript
export const getPendingVerifications = async (req: AuthRequest, res: Response) => {
  const { data, error } = await supabase
    .from('employee_vip_subscriptions')
    .select(`
      *,
      employee:employees(id, name, photos),
      purchased_by:users!employee_vip_subscriptions_purchased_by_user_id_fkey(id, pseudonym, email)
    `)
    .eq('status', 'pending')
    .not('payment_proof_url', 'is', null) // Only with proof uploaded
    .order('created_at', { ascending: true });

  if (error) throw error;

  res.json({ pending_verifications: data });
};

export const verifyPayment = async (req: AuthRequest, res: Response) => {
  const { payment_reference, action, admin_notes } = req.body;
  const admin_id = req.user?.id;

  // ... (voir VIP_SYSTEM.md pour code complet)
};

export const activateManual = async (req: AuthRequest, res: Response) => {
  const { payment_reference, amount_received, admin_notes } = req.body;
  const admin_id = req.user?.id;

  // ... (voir VIP_SYSTEM.md pour code complet)
};
```

**Validation** : Admin Panel → VIP tab → Voit pending payments

---

**2.5 Notification System Integration** (1h)

**Modifier** : `backend/src/utils/notifications.ts` (si existe) ou créer

```typescript
export async function sendVIPActivatedNotification(userId: string, subscription: any) {
  await supabase.from('notifications').insert({
    user_id: userId,
    type: 'vip_activated',
    title: 'VIP Boost Activated!',
    message: `Your VIP boost is now active for ${subscription.duration_days} days.`,
    link: `/vip/analytics/employee/${subscription.employee_id}`,
    is_read: false
  });
}

export async function sendVIPRejectedNotification(userId: string, reason: string) {
  await supabase.from('notifications').insert({
    user_id: userId,
    type: 'vip_rejected',
    title: 'Payment Rejected',
    message: `Your VIP payment was rejected. Reason: ${reason || 'Invalid proof'}`,
    link: '/employee/dashboard',
    is_read: false
  });
}
```

**Intégrer dans** `verifyPayment` controller

**Validation** : Approve payment → User reçoit notification

---

**✅ Fin Jour 2** : Payment system complet (PromptPay + Cash + Verification)

---

### ⏰ Jour 3 - Frontend Purchase Flow

**Objectif** : UI complète purchase → paiement → upload proof

**Durée** : 8h

---

#### **Morning (4h) - Purchase Page**

**3.1 Hook `useVIPStatus`** (0.5h)

**Fichier** : `src/hooks/useVIPStatus.ts`

```typescript
import { useQuery } from '@tanstack/react-query';

export interface VIPStatus {
  is_vip: boolean;
  expires_at?: string;
  days_left?: number;
  subscription?: {
    id: string;
    starts_at: string;
    expires_at: string;
    duration_days: number;
  } | null;
}

export function useVIPStatus(
  entityType: 'employee' | 'establishment',
  entityId: string
) {
  return useQuery<VIPStatus>({
    queryKey: ['vipStatus', entityType, entityId],
    queryFn: async () => {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/vip/${entityType}/${entityId}/status`
      );
      if (!response.ok) throw new Error('Failed to fetch VIP status');
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000
  });
}
```

**Validation** : Hook retourne VIP status

---

**3.2 Composant VIPBadge** (0.5h)

**Déjà documenté dans VIP_SYSTEM.md section 3.3**

**Fichiers** :
- `src/components/VIP/VIPBadge.tsx`
- `src/components/VIP/VIPBadge.css`

**Validation** : Badge s'affiche avec animation

---

**3.3 Page Purchase VIP** (3h)

**Fichier** : `src/components/VIP/PurchaseVIPPage.tsx`

**Features** :
- Step 1: Select duration (3 cards: 1 week, 1 month, 3 mois)
- Step 2: Select payment method (PromptPay ⭐ ou Cash)
- Step 3: Initiate purchase → Afficher payment instructions
- Step 4 (si PromptPay): Upload proof
- Step 5: Pending verification state

**Structure** :

```typescript
enum PurchaseStep {
  SELECT_DURATION,
  SELECT_PAYMENT_METHOD,
  PAYMENT_INSTRUCTIONS,
  UPLOAD_PROOF,
  PENDING_VERIFICATION
}

const PurchaseVIPPage: React.FC = () => {
  const { entityType, entityId } = useParams();
  const [currentStep, setCurrentStep] = useState(PurchaseStep.SELECT_DURATION);
  const [selectedDuration, setSelectedDuration] = useState(30);
  const [paymentMethod, setPaymentMethod] = useState('promptpay');
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [subscriptionId, setSubscriptionId] = useState(null);

  // ... handlers
};
```

**Validation** : Workflow complet fonctionnel

---

#### **Afternoon (4h) - Upload & Validation**

**3.4 Upload Proof Component** (2h)

**Fichier** : `src/components/VIP/UploadPaymentProof.tsx`

```typescript
import React, { useState } from 'react';
import { useSecureFetch } from '../../hooks/useSecureFetch';
import toast from '../../utils/toast';
import './UploadPaymentProof.css';

interface Props {
  paymentReference: string;
  onUploadComplete: () => void;
}

const UploadPaymentProof: React.FC<Props> = ({ paymentReference, onUploadComplete }) => {
  const { secureFetch } = useSecureFetch();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    if (!selectedFile.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setFile(selectedFile);

    // Generate preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file first');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('proof_image', file);
      formData.append('payment_reference', paymentReference);

      const response = await secureFetch(
        `${process.env.REACT_APP_API_URL}/api/vip/employee/upload-proof`,
        {
          method: 'POST',
          body: formData
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      toast.success('Payment proof uploaded successfully!');
      onUploadComplete();

    } catch (error: any) {
      toast.error(error.message || 'Failed to upload proof');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="upload-payment-proof">
      <h2>Upload Payment Screenshot</h2>

      <div className="upload-area">
        {preview ? (
          <div className="preview-container">
            <img src={preview} alt="Payment proof preview" />
            <button onClick={() => { setFile(null); setPreview(null); }}>
              Change Image
            </button>
          </div>
        ) : (
          <div className="upload-placeholder">
            <label htmlFor="proof-upload" className="upload-label">
              <div className="upload-icon">📷</div>
              <p>Click to select or drag & drop</p>
              <p className="upload-hint">PNG, JPG up to 10MB</p>
            </label>
            <input
              id="proof-upload"
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </div>
        )}
      </div>

      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="btn-upload"
      >
        {uploading ? 'Uploading...' : 'Upload Proof'}
      </button>

      <p className="verification-note">
        After uploading, admin will verify your payment within 1-24 hours.
      </p>
    </div>
  );
};

export default UploadPaymentProof;
```

**Validation** : Upload screenshot → Backend reçoit + Cloudinary stocke

---

**3.5 Pending Verification State** (1h)

**Fichier** : `src/components/VIP/PendingVerificationState.tsx`

```typescript
const PendingVerificationState: React.FC<{ paymentReference: string }> = ({ paymentReference }) => {
  return (
    <div className="pending-verification">
      <div className="pending-icon">⏳</div>
      <h2>Payment Pending Verification</h2>

      <div className="pending-details">
        <p>✅ Payment proof uploaded successfully</p>
        <p><strong>Reference:</strong> {paymentReference}</p>
      </div>

      <div className="pending-info">
        <p>Admin is verifying your payment...</p>
        <p className="estimated-time">Expected activation: 1-24 hours</p>
      </div>

      <p className="notification-note">
        You'll receive a notification when your VIP boost is activated!
      </p>

      <button onClick={() => window.location.href = '/employee/dashboard'} className="btn-dashboard">
        Back to Dashboard
      </button>
    </div>
  );
};
```

---

**3.6 Routes Integration** (0.5h)

**Modifier** : `src/App.tsx`

```typescript
import PurchaseVIPPage from './components/VIP/PurchaseVIPPage';

<Route path="/vip/purchase/:entityType/:entityId" element={<PurchaseVIPPage />} />
```

**Validation** : Navigation `/vip/purchase/employee/123` → Page affichée

---

**3.7 Dashboard Integration** (0.5h)

**Modifier** : `src/components/Employee/EmployeeDashboard.tsx`

Ajouter promo card si non-VIP

```typescript
{!vipStatus?.is_vip && (
  <div className="vip-promo-card">
    <h3>👑 BOOST YOUR VISIBILITY</h3>
    <p>VIP members get 3-5x more views</p>
    <ul>
      <li>✅ Top position in search results</li>
      <li>✅ Gold border & crown on profile</li>
      <li>✅ Detailed analytics dashboard</li>
    </ul>
    <p className="pricing">From 1,000฿/week</p>
    <button onClick={() => navigate(`/vip/purchase/employee/${employeeId}`)}>
      Upgrade to VIP Now
    </button>
  </div>
)}
```

**Validation** : Dashboard affiche promo card si non-VIP

---

**✅ Fin Jour 3** : Frontend purchase flow complet

---

### ⏰ Jour 4 - VIP Display & Analytics

**Objectif** : Affichage VIP partout + Analytics dashboard

**Durée** : 8h

---

#### **Morning (4h) - VIP Display**

**4.1 Modifier EmployeeCard.tsx** (1.5h)

**Fichier** : `src/components/Common/EmployeeCard.tsx`

**Lignes 96-109** : Ajouter VIP badge (prioritaire)

```typescript
{/* VIP Crown Badge - Top Left (prioritaire sur tout) */}
{employee.is_vip && (
  <div className="employee-card-vip-corner" title="VIP Boosted Profile">
    <span className="vip-crown-icon">👑</span>
    <span>VIP</span>
  </div>
)}

{/* Verified OU Photo Count (only if NOT VIP) */}
{!employee.is_vip && (
  employee.is_verified ? (
    <div className="employee-card-verified-corner" {...}>
      <span className="verified-icon">✓</span>
      <span>VERIFIED</span>
    </div>
  ) : (
    employee.photos?.length > 1 && (
      <div className="employee-card-photo-count">
        📸 {employee.photos.length}
      </div>
    )
  )
)}
```

**Ligne 52** : Ajouter className VIP

```typescript
<motion.div
  className={`employee-card-tinder ${employee.is_vip ? 'employee-card-vip' : ''} ${className}`}
```

**CSS** : Ajouter styles VIP (voir VIP_SYSTEM.md section 6.8)

**Validation** : EmployeeCard affiche badge VIP + border dorée

---

**4.2 Modifier SearchPage.tsx** (1h)

**Tri VIP-first** :

```typescript
const sorted = useMemo(() => {
  return [...employees].sort((a, b) => {
    // VIP priority
    if (a.is_vip && !b.is_vip) return -1;
    if (!a.is_vip && b.is_vip) return 1;

    // Same VIP status, sort by rating
    return (b.average_rating || 0) - (a.average_rating || 0);
  });
}, [employees]);
```

**Backend modification** : Join avec VIP subscriptions

```typescript
// backend/src/controllers/employeeController.ts - searchEmployees

.select(`
  *,
  establishment:current_employment(establishment:establishments(*)),
  vip_subscription:employee_vip_subscriptions!left(id, expires_at, status)
`)

// Map to add is_vip
const employees = data.map(emp => ({
  ...emp,
  is_vip: emp.vip_subscription?.status === 'active' &&
          new Date(emp.vip_subscription.expires_at) > new Date()
}));
```

**Validation** : Search results affiche VIP en tête

---

**4.3 Modifier GirlsGallery.tsx** (1h)

**Tri VIP-first dans lineup** :

```typescript
const sortedEmployees = useMemo(() => {
  return [...employees].sort((a, b) => {
    if (a.is_vip && !b.is_vip) return -1;
    if (!a.is_vip && b.is_vip) return 1;
    return (b.average_rating || 0) - (a.average_rating || 0);
  });
}, [employees]);
```

**Backend** : Même JOIN que SearchPage

**Validation** : Lineup établissement montre VIP en tête

---

**4.4 Tracking Integration** (0.5h)

**Modifier controllers existants** :

```typescript
// backend/src/controllers/employeeController.ts - getEmployeeById

export const getEmployeeById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const user_id = (req as AuthRequest).user?.id;

  // ... fetch employee ...

  // Track profile view
  await trackVIPEvent('employee', id, 'profile_view', user_id);

  res.json({ employee: data });
};

// backend/src/controllers/favoriteController.ts - addFavorite

export const addFavorite = async (req: AuthRequest, res: Response) => {
  const { employee_id } = req.body;
  const user_id = req.user?.id;

  // ... add favorite ...

  // Track favorite add
  await trackVIPEvent('employee', employee_id, 'favorite_add', user_id);

  res.json({ message: 'Added to favorites' });
};
```

**Validation** : Events trackés dans `vip_analytics_events`

---

#### **Afternoon (4h) - Analytics Dashboard**

**4.5 VIP Analytics Dashboard** (3.5h)

**Fichier** : `src/components/VIP/VIPAnalyticsDashboard.tsx`

*Trop long - voir VIP_SYSTEM.md section 6.7 pour design complet*

**Features** :
- Overview cards (Views, Favorites, Searches)
- Trend comparison (this week vs last week)
- Line chart (Last 7 days)
- Traffic sources (bar chart)
- Search performance
- Renew VIP button

**Libraries** :
```bash
npm install react-chartjs-2 chart.js
```

**Backend endpoint** : `/api/vip/employee/:id/analytics` (déjà fait Jour 1)

**Validation** : Dashboard affiche toutes les métriques

---

**4.6 Route Analytics** (0.5h)

**Modifier** : `src/App.tsx`

```typescript
import VIPAnalyticsDashboard from './components/VIP/VIPAnalyticsDashboard';

<Route path="/vip/analytics/:entityType/:entityId" element={<VIPAnalyticsDashboard />} />
```

**Link depuis Dashboard** :

```typescript
{vipStatus?.is_vip && (
  <button onClick={() => navigate(`/vip/analytics/employee/${employeeId}`)}>
    📊 View Full Analytics
  </button>
)}
```

**Validation** : Navigation analytics → Dashboard affiché

---

**✅ Fin Jour 4** : VIP Employée 100% fonctionnel (purchase → display → analytics)

---

## 📅 Phase 2 : VIP Établissement (3 Jours)

### ⏰ Jour 5 - Backend Établissement

**Objectif** : DB + API établissements VIP

**Durée** : 8h

**Tasks** :
1. Migration `establishment_vip_subscriptions` (identique à employee, juste changer table)
2. Controller `vipEstablishmentController.ts` (copier/adapter employee controller)
3. Routes `/api/vip/establishment/*`
4. Permission checks (establishment owners)

**Validation** : API établissement fonctionnelle

---

### ⏰ Jour 6 - Frontend Établissement

**Objectif** : Purchase flow + Analytics pour établissements

**Durée** : 8h

**Tasks** :
1. Adapter `PurchaseVIPPage` pour établissements (4 durées au lieu de 3)
2. Adapter `VIPAnalyticsDashboard` (métriques spécifiques établissement)
3. Integration My Establishments page (promo card)

**Validation** : Purchase flow établissement fonctionnel

---

### ⏰ Jour 7 - Map & Featured Integration

**Objectif** : Affichage VIP sur cartes + Homepage

**Durée** : 8h

---

#### **Morning (4h) - Featured Homepage**

**7.1 Featured Establishments Component** (2h)

**Fichier** : `src/components/Homepage/FeaturedEstablishments.tsx`

*Voir VIP_SYSTEM.md section 7.3*

**Backend endpoint** :

```typescript
// backend/src/controllers/establishmentController.ts

export const getFeaturedEstablishments = async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('establishments')
    .select(`
      *,
      vip_subscription:establishment_vip_subscriptions!left(id, expires_at, status)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Filter active VIP
  const featured = data.filter(est =>
    est.vip_subscription?.status === 'active' &&
    new Date(est.vip_subscription.expires_at) > new Date()
  );

  res.json({ featured });
};
```

**Route** : `GET /api/establishments/featured`

**Validation** : Homepage affiche featured establishments

---

**7.2 Integration Homepage** (1h)

**Modifier** : `src/routes/lazyComponents.tsx` (HomePage)

Ajouter `<FeaturedEstablishments />` section

**Validation** : Section visible homepage

---

**7.3 EstablishmentListView VIP** (1h)

**Tri VIP-first** :

```typescript
const sorted = useMemo(() => {
  return [...establishments].sort((a, b) => {
    const aVIP = vipStatuses?.find(v => v.id === a.id)?.is_vip || false;
    const bVIP = vipStatuses?.find(v => v.id === b.id)?.is_vip || false;

    if (aVIP && !bVIP) return -1;
    if (!aVIP && bVIP) return 1;

    return (b.average_rating || 0) - (a.average_rating || 0);
  });
}, [establishments, vipStatuses]);
```

**Validation** : Liste établissements montre VIP en tête

---

#### **Afternoon (4h) - Maps VIP**

**7.4 Modifier CustomSoi6Map.tsx** (2h)

**Tous les maps** : CustomSoi6Map, CustomWalkingStreetMap, CustomLKMetroMap, etc.

**Pattern** :

```typescript
const CustomSoi6Map: React.FC<Props> = ({ establishments, ... }) => {
  // Fetch VIP statuses
  const { data: vipStatuses } = useQuery({
    queryKey: ['vipStatuses', 'establishment', establishments.map(e => e.id)],
    queryFn: async () => {
      const statuses = await Promise.all(
        establishments.map(async (est) => {
          const res = await fetch(`${API_URL}/api/vip/establishment/${est.id}/status`);
          const data = await res.json();
          return { id: est.id, ...data };
        })
      );
      return statuses.reduce((acc, status) => {
        acc[status.id] = status;
        return acc;
      }, {} as Record<string, VIPStatus>);
    }
  });

  const isVIP = (estId: string) => vipStatuses?.[estId]?.is_vip || false;

  return (
    <div className="custom-soi6-map">
      {establishments.map(est => {
        const vip = isVIP(est.id);
        const scale = vip ? 1.5 : 1;

        return (
          <div
            key={est.id}
            className={`map-position ${vip ? 'map-position-vip' : ''}`}
            style={{
              gridColumn: est.grid_column,
              gridRow: est.grid_row,
              transform: `scale(${scale})`,
              zIndex: vip ? 100 : 1
            }}
          >
            {vip && <div className="vip-featured-badge">🌟</div>}
            <img src={est.logo_url} alt={est.name} />
            <span>{est.name}</span>
          </div>
        );
      })}
    </div>
  );
};
```

**CSS** : Voir VIP_SYSTEM.md section 7.4

**Validation** : Tous les maps affichent VIP avec logo 150% + pulse

---

**7.5 Répliquer pour toutes les maps** (2h)

**Maps à modifier** (9 total) :
- CustomSoi6Map.tsx
- CustomWalkingStreetMap.tsx
- CustomLKMetroMap.tsx
- CustomTreetownMap.tsx
- CustomSoiBuakhaoMap.tsx
- CustomJomtienComplexMap.tsx
- CustomBoyzTownMap.tsx
- CustomSoi78Map.tsx
- CustomBeachRoadMap.tsx

**Pattern** : Copier/coller la logique VIP dans chaque map

**Validation** : Toutes les cartes affichent VIP correctement

---

**✅ Fin Jour 7** : VIP Établissement 100% fonctionnel

---

## 📅 Phase 3 : Testing & Polish (1 Jour)

### ⏰ Jour 8 - QA & Documentation

**Objectif** : Tests complets, bug fixes, documentation finale

**Durée** : 8h

---

#### **Morning (4h) - Testing**

**8.1 Tests Backend** (2h)

**Fichier** : `backend/src/controllers/__tests__/vipEmployeeController.test.ts`

```typescript
describe('VIP Employee Controller', () => {
  describe('POST /api/vip/employee/initiate-purchase', () => {
    it('should create pending subscription with valid data', async () => {
      // Test implementation
    });

    it('should reject invalid duration', async () => {
      // Test implementation
    });

    it('should reject unauthorized purchase', async () => {
      // Test implementation
    });
  });

  describe('GET /api/vip/employee/:id/status', () => {
    it('should return VIP status for active subscription', async () => {
      // Test implementation
    });

    it('should return non-VIP for expired subscription', async () => {
      // Test implementation
    });
  });

  describe('GET /api/vip/employee/:id/analytics', () => {
    it('should return analytics for authorized user', async () => {
      // Test implementation
    });

    it('should reject unauthorized analytics access', async () => {
      // Test implementation
    });
  });
});
```

**Run** : `npm test` → Tous les tests passent

---

**8.2 Tests Frontend** (1h)

**Fichier** : `src/components/VIP/__tests__/VIPBadge.test.tsx`

```typescript
describe('VIPBadge', () => {
  it('renders employee VIP badge', () => {
    render(<VIPBadge type="employee" />);
    expect(screen.getByText('👑')).toBeInTheDocument();
    expect(screen.getByText('VIP')).toBeInTheDocument();
  });

  it('shows expiry warning when less than 7 days left', () => {
    const expires = new Date();
    expires.setDate(expires.getDate() + 5);

    render(<VIPBadge type="employee" expiresAt={expires.toISOString()} showExpiry />);

    const expiry = screen.getByText(/5d/);
    expect(expiry).toHaveClass('expiring-soon');
  });
});
```

**Run** : `npm test`

---

**8.3 Manual Testing Checklist** (1h)

**VIP Employée** :
- [ ] Purchase flow (PromptPay)
- [ ] Purchase flow (Cash)
- [ ] Upload payment proof
- [ ] Admin approve payment → VIP activated
- [ ] Admin reject payment → Notification sent
- [ ] VIP badge appears on EmployeeCard
- [ ] VIP employée top position Search
- [ ] VIP employée top position Lineup
- [ ] Analytics dashboard shows data
- [ ] VIP expires → Badge disappears

**VIP Établissement** :
- [ ] Purchase flow
- [ ] Featured homepage appears
- [ ] Logo 150% on maps (all 9 maps)
- [ ] Pulse animation works
- [ ] Top position list établissements
- [ ] Analytics dashboard shows data

**Admin** :
- [ ] Payment Settings configure QR
- [ ] Verification queue shows pending
- [ ] Approve payment works
- [ ] Reject payment works
- [ ] Manual cash activation works

---

#### **Afternoon (4h) - Bug Fixes & Documentation**

**8.4 Bug Fixes** (2h)

**Common bugs à vérifier** :
- VIP status cache issues (stale data)
- Image upload failures
- Timezone issues (expires_at)
- Permission checks edge cases
- CSRF token issues
- Rate limiting false positives

**Fix tous les bugs trouvés**

---

**8.5 Update CLAUDE.md** (1h)

**Ajouter section VIP** :

```markdown
## 👑 VIP System (v10.x)

### Overview

PattaMap offers a **VIP visibility boost system** for employees and establishments.

**VIP Employée** :
- Top position search & lineup
- Gold badge + border
- Analytics dashboard
- Pricing: 1,000฿/week to 8,000฿/3 months

**VIP Établissement** :
- Featured homepage
- 150% logo on maps
- Top position lists
- Analytics dashboard
- Pricing: 3,000฿/week to 36,000฿/6 months

**Payment Methods** :
- PromptPay QR (instant, 0% fees)
- Cash (in-person, instant activation)

**Documentation** :
- Technical: [docs/features/VIP_SYSTEM.md](docs/features/VIP_SYSTEM.md)
- Implementation: [docs/features/VIP_IMPLEMENTATION_PLAN.md](docs/features/VIP_IMPLEMENTATION_PLAN.md)

**Routes** :
- `/vip/purchase/:type/:id` - Purchase VIP
- `/vip/analytics/:type/:id` - Analytics dashboard
- `/admin/vip-verification` - Admin verification queue

**Revenue Impact** :
- Year 1: ~600,000฿ (~16,000€)
- Year 2: ~6,000,000฿ (~160,000€)
```

---

**8.6 Code Cleanup** (0.5h)

- Remove console.logs
- Format code (`prettier`)
- Remove unused imports
- Add comments for complex logic

---

**8.7 Deployment Prep** (0.5h)

**Checklist** :
- [ ] Environment variables documented
- [ ] Database migrations tested on staging
- [ ] Cloudinary folder created (`vip_payment_proofs`)
- [ ] PromptPay QR uploaded in production
- [ ] Payment settings configured
- [ ] Sentry monitoring configured for VIP routes
- [ ] Analytics refresh cron job setup (hourly)

---

**✅ Fin Jour 8** : Système VIP 100% production-ready

---

## 📊 Résumé Final

### Ce qui a été implémenté

✅ **Phase 1 (J1-J4)** - VIP Employée
- Database (3 tables + materialized view)
- Backend API (6 endpoints employée + 5 admin)
- Payment system (PromptPay + Cash)
- Frontend purchase flow
- VIP display (badge + sorting)
- Analytics dashboard

✅ **Phase 2 (J5-J7)** - VIP Établissement
- Database établissement
- Backend API établissement
- Featured homepage
- Map integration (9 maps)
- List view sorting

✅ **Phase 3 (J8)** - Testing & Polish
- Backend tests
- Frontend tests
- Bug fixes
- Documentation
- Deployment prep

### Prochaines Étapes

**Après implémentation** :
1. Deploy to staging
2. Test avec utilisateurs beta
3. Gather feedback
4. Iterate si nécessaire
5. Deploy to production
6. Monitor analytics & revenues

---

**Auteur** : PattaMap Development Team
**Date** : Janvier 2025
**Version** : 1.0
**Statut** : ✅ Ready for Development
