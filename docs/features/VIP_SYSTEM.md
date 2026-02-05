# 👑 PattaMap VIP System - Documentation Technique Complète

**Version**: 1.0
**Date**: Janvier 2025
**Statut**: Documentation Technique - Prêt pour implémentation

---

## 📋 Table des Matières

1. [Vue d'Ensemble](#1-vue-densemble)
2. [Business Model](#2-business-model)
3. [Architecture Technique](#3-architecture-technique)
4. [Système de Paiement](#4-système-de-paiement)
5. [Pricing](#5-pricing)
6. [Expérience Utilisateur - VIP Employée](#6-expérience-utilisateur---vip-employée)
7. [Expérience Utilisateur - VIP Établissement](#7-expérience-utilisateur---vip-établissement)
8. [Intégration Architecture Existante](#8-intégration-architecture-existante)
9. [Analytics & Tracking](#9-analytics--tracking)
10. [Sécurité](#10-sécurité)
11. [Testing](#11-testing)

---

## 1. Vue d'Ensemble

### 1.1 Objectif

Le **système VIP** est un modèle de **visibilité payante B2B** permettant aux employées et établissements de booster leur visibilité sur PattaMap en échange d'un paiement.

**Concept** : Au lieu d'un freemium classique (utilisateurs finaux), on cible les **professionnels** (employées + établissements) qui génèrent des revenus grâce à la plateforme.

### 1.2 Deux Systèmes Distincts

#### 🌟 **VIP Employée** - Boost de Visibilité Individuel

**Cible** : Employées qui veulent plus de clients
**Prix** : 1,000฿/semaine à 8,000฿/3 mois

**Où elle devient VIP** :
- ✅ **Top position dans Lineup** (GirlsGallery d'un établissement)
- ✅ **Top position dans Search Results**
- ✅ **Badge VIP + bordure dorée** partout (EmployeeCard)
- ✅ **Analytics dashboard** (views, favorites, trends)
- ❌ **PAS de spot direct sur carte de zone** ← Important

#### 🏢 **VIP Établissement** - Featured Listing

**Cible** : Bars/Gogos qui veulent plus de visites
**Prix** : 3,000฿/semaine à 36,000฿/6 mois

**Où il devient VIP** :
- ✅ **Featured homepage** (section dédiée)
- ✅ **Logo 150% taille sur carte zone** (CustomSoi6Map, etc.)
- ✅ **Bordure dorée + pulse animation**
- ✅ **Top position liste établissements**
- ✅ **Analytics avancés** (comparaison concurrents)

### 1.3 Différences Clés

| Aspect | VIP Employée | VIP Établissement |
|--------|--------------|-------------------|
| **Affichage Carte** | ❌ Non (pas de spot direct) | ✅ Oui (logo agrandi + pulse) |
| **Search Results** | ✅ Top position | ✅ Top position |
| **Homepage Featured** | ❌ Non | ✅ Oui |
| **Lineup Établissement** | ✅ Top position | N/A |
| **Analytics** | ✅ Basique (views, favorites) | ✅ Avancé (concurrents, employees boost) |
| **Pricing** | 1,000-8,000฿ | 3,000-36,000฿ |

---

## 2. Business Model

### 2.1 Revenus Estimés

#### Scénario Conservateur (Année 1)

**VIP Employée** :
- Mois 6 : 20 employées actives
- Mix : 40% hebdo (1,000฿), 40% mensuel (3,200฿), 20% trimestriel (8,000฿)
- **Revenus/mois** : ~60,000฿ (~1,600€)

**VIP Établissement** :
- Mois 6 : 8 établissements actifs
- Mix : 20% hebdo (3,000฿), 50% mensuel (9,000฿), 30% trimestriel (21,000฿)
- **Revenus/mois** : ~70,000฿ (~1,900€)

**Total Année 1** : **~600,000฿** (~16,000€)

#### Scénario Optimiste (Année 2)

**VIP Employée** : 80 actives → **~240,000฿/mois**
**VIP Établissement** : 30 actifs → **~260,000฿/mois**

**Total Année 2** : **~6,000,000฿** (~160,000€)

### 2.2 ROI pour les Clients

#### Pour Employée VIP

**Coût** : 3,200฿/mois
**Bénéfice** : Top position dans tous les résultats → 1-2 clients supplémentaires/semaine
**ROI** : Largement rentabilisé si 1 client/semaine = 1,000-2,000฿

#### Pour Établissement VIP

**Coût** : 9,000฿/mois
**Bénéfice** : Featured homepage + cartes → 5-10 nouveaux clients/mois
**ROI** : Rentabilisé si 3-5 clients supplémentaires/mois (moyenne 2,000-3,000฿/client)

---

## 3. Architecture Technique

### 3.1 Base de Données

#### Table `employee_vip_subscriptions`

```sql
CREATE TABLE employee_vip_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  purchased_by_user_id UUID NOT NULL REFERENCES users(id),
  purchased_by_type VARCHAR(20), -- 'employee', 'manager', 'admin'

  -- Subscription details
  starts_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
    -- 'pending' (payment en attente)
    -- 'active' (VIP actif)
    -- 'expired' (période terminée)
    -- 'cancelled' (annulé manuellement)

  duration_days INTEGER NOT NULL, -- 7, 30, 90
  amount_paid INTEGER NOT NULL,   -- En centimes (100000 = 1,000฿)
  currency VARCHAR(3) DEFAULT 'THB',

  -- Payment details
  payment_method VARCHAR(30), -- 'promptpay', 'cash'
  payment_reference VARCHAR(50) UNIQUE NOT NULL, -- VIP-EMP-YYYYMMDD-XXXX
  payment_proof_url TEXT, -- Screenshot Cloudinary (si promptpay)
  payment_verified BOOLEAN DEFAULT false,
  verified_by_admin_id UUID REFERENCES users(id),
  verified_at TIMESTAMP,
  admin_notes TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
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
```

#### Table `establishment_vip_subscriptions`

```sql
CREATE TABLE establishment_vip_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  purchased_by_user_id UUID NOT NULL REFERENCES users(id),

  -- Subscription details (même structure que employee_vip_subscriptions)
  starts_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',

  duration_days INTEGER NOT NULL, -- 7, 30, 90, 180
  amount_paid INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'THB',

  -- Payment details
  payment_method VARCHAR(30),
  payment_reference VARCHAR(50) UNIQUE NOT NULL, -- VIP-EST-YYYYMMDD-XXXX
  payment_proof_url TEXT,
  payment_verified BOOLEAN DEFAULT false,
  verified_by_admin_id UUID REFERENCES users(id),
  verified_at TIMESTAMP,
  admin_notes TEXT,

  -- Analytics aggregates (cached for performance)
  total_views INTEGER DEFAULT 0,
  total_clicks INTEGER DEFAULT 0,
  total_favorites_gained INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_duration CHECK (duration_days IN (7, 30, 90, 180)),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'active', 'expired', 'cancelled')),
  CONSTRAINT valid_payment_method CHECK (payment_method IN ('promptpay', 'cash'))
);

-- Indexes
CREATE INDEX idx_establishment_vip_establishment_id ON establishment_vip_subscriptions(establishment_id);
CREATE INDEX idx_establishment_vip_status ON establishment_vip_subscriptions(status, expires_at);
CREATE INDEX idx_establishment_vip_reference ON establishment_vip_subscriptions(payment_reference);
CREATE INDEX idx_establishment_vip_active ON establishment_vip_subscriptions(establishment_id, status, expires_at)
  WHERE status = 'active';
```

#### Table `vip_analytics_events`

```sql
CREATE TABLE vip_analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(20) NOT NULL, -- 'employee', 'establishment'
  entity_id UUID NOT NULL,
  event_type VARCHAR(30) NOT NULL,
    -- 'profile_view', 'map_click', 'favorite_add', 'search_appearance', 'lineup_view'
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  metadata JSONB, -- { source: 'search', zone: 'soi6', position: 2, ... }
  created_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_entity_type CHECK (entity_type IN ('employee', 'establishment')),
  CONSTRAINT valid_event_type CHECK (event_type IN (
    'profile_view', 'map_click', 'favorite_add', 'search_appearance', 'lineup_view'
  ))
);

-- Indexes
CREATE INDEX idx_vip_analytics_entity ON vip_analytics_events(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_vip_analytics_event_type ON vip_analytics_events(event_type, created_at DESC);
CREATE INDEX idx_vip_analytics_created_at ON vip_analytics_events(created_at DESC);

-- Partition by month for performance (optional, future optimization)
-- CREATE TABLE vip_analytics_events_2025_01 PARTITION OF vip_analytics_events
--   FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

#### Materialized View `vip_analytics_summary`

```sql
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

-- Index on materialized view
CREATE UNIQUE INDEX idx_vip_analytics_summary_unique
  ON vip_analytics_summary(entity_type, entity_id, date, event_type);

CREATE INDEX idx_vip_analytics_summary_entity
  ON vip_analytics_summary(entity_id, date DESC);

-- Refresh function (called by cron job every hour)
CREATE OR REPLACE FUNCTION refresh_vip_analytics_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY vip_analytics_summary;
END;
$$ LANGUAGE plpgsql;
```

#### Table `payment_settings` (Admin Configuration)

```sql
CREATE TABLE payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_method VARCHAR(30) NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,

  -- PromptPay
  promptpay_qr_code_url TEXT, -- URL Cloudinary du QR statique
  promptpay_phone_number VARCHAR(15),
  promptpay_id_number VARCHAR(20),

  -- Cash
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
```

### 3.2 Backend API

#### Configuration Pricing

```typescript
// backend/src/config/vipPricing.ts

export const VIP_PRICING = {
  employee: {
    7: 100000,   // 1,000฿ (en centimes)
    30: 320000,  // 3,200฿ (économie 20%)
    90: 800000   // 8,000฿ (économie 33%)
  },
  establishment: {
    7: 300000,    // 3,000฿
    30: 900000,   // 9,000฿ (économie 25%)
    90: 2100000,  // 21,000฿ (économie 42%)
    180: 3600000  // 36,000฿ (économie 50%)
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
```

#### Routes VIP Employée

```typescript
// backend/src/routes/vipEmployee.ts

import { Router } from 'express';
import { authenticateToken, csrfProtection } from '../middleware/auth';
import * as vipEmployeeController from '../controllers/vipEmployeeController';

const router = Router();

// Initiate purchase (generate reference + payment details)
router.post(
  '/initiate-purchase',
  authenticateToken,
  csrfProtection,
  vipEmployeeController.initiatePurchase
);

// Upload payment proof (for PromptPay)
router.post(
  '/upload-proof',
  authenticateToken,
  csrfProtection,
  vipEmployeeController.uploadPaymentProof
);

// Get VIP status for employee (public)
router.get(
  '/:employee_id/status',
  vipEmployeeController.getVIPStatus
);

// Get VIP analytics (auth required, owner only)
router.get(
  '/:employee_id/analytics',
  authenticateToken,
  vipEmployeeController.getVIPAnalytics
);

// Cancel VIP (will expire at end of period, no refund)
router.post(
  '/:employee_id/cancel',
  authenticateToken,
  csrfProtection,
  vipEmployeeController.cancelVIP
);

// Renew VIP
router.post(
  '/:employee_id/renew',
  authenticateToken,
  csrfProtection,
  vipEmployeeController.renewVIP
);

export default router;
```

#### Routes Admin VIP

```typescript
// backend/src/routes/adminVip.ts

import { Router } from 'express';
import { authenticateToken, requireAdmin, csrfProtection } from '../middleware/auth';
import * as adminVipController from '../controllers/adminVipController';

const router = Router();

// All routes require admin role
router.use(authenticateToken);
router.use(requireAdmin);

// Get pending payment verifications
router.get(
  '/pending-verifications',
  adminVipController.getPendingVerifications
);

// Verify payment (approve or reject)
router.post(
  '/verify-payment',
  csrfProtection,
  adminVipController.verifyPayment
);

// Manually activate VIP (for cash payments)
router.post(
  '/activate-manual',
  csrfProtection,
  adminVipController.activateManual
);

// Get all VIP subscriptions (with filters)
router.get(
  '/subscriptions',
  adminVipController.getAllSubscriptions
);

// Update payment settings (PromptPay QR, cash contact)
router.put(
  '/payment-settings',
  csrfProtection,
  adminVipController.updatePaymentSettings
);

export default router;
```

#### Controller Principal - VIP Employée

```typescript
// backend/src/controllers/vipEmployeeController.ts

import { Request, Response } from 'express';
import { supabase } from '../config/supabaseClient';
import { AuthRequest } from '../middleware/auth';
import { getVIPPrice, generatePaymentReference, VIPDuration } from '../config/vipPricing';
import { cloudinary } from '../config/cloudinaryConfig';
import { logger } from '../utils/logger';

/**
 * Initiate VIP purchase
 * Generates payment reference and returns payment instructions
 */
export const initiatePurchase = async (req: AuthRequest, res: Response) => {
  try {
    const { employee_id, duration_days, payment_method } = req.body;
    const user_id = req.user?.id;

    // Validate inputs
    if (!employee_id || !duration_days || !payment_method) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (![7, 30, 90].includes(duration_days)) {
      return res.status(400).json({ error: 'Invalid duration' });
    }

    if (!['promptpay', 'cash'].includes(payment_method)) {
      return res.status(400).json({ error: 'Invalid payment method' });
    }

    // Check permissions (employee herself or manager/admin)
    const canPurchase = await checkPurchasePermission(user_id!, employee_id);
    if (!canPurchase) {
      return res.status(403).json({ error: 'Not authorized to purchase VIP for this employee' });
    }

    // Calculate price
    const amount = getVIPPrice('employee', duration_days as VIPDuration);

    // Generate unique payment reference
    const payment_reference = generatePaymentReference('employee');

    // Calculate dates
    const starts_at = new Date();
    const expires_at = new Date(starts_at);
    expires_at.setDate(expires_at.getDate() + duration_days);

    // Determine purchased_by_type
    const purchased_by_type = await getUserType(user_id!, employee_id);

    // Create pending subscription
    const { data: subscription, error } = await supabase
      .from('employee_vip_subscriptions')
      .insert({
        employee_id,
        purchased_by_user_id: user_id,
        purchased_by_type,
        starts_at: starts_at.toISOString(),
        expires_at: expires_at.toISOString(),
        status: 'pending',
        duration_days,
        amount_paid: amount,
        payment_method,
        payment_reference,
        payment_verified: false
      })
      .select()
      .single();

    if (error) throw error;

    // Fetch payment settings
    const { data: paymentSettings } = await supabase
      .from('payment_settings')
      .select('*')
      .eq('payment_method', payment_method)
      .single();

    // Build payment details response
    const payment_details: any = {
      method: payment_method,
      reference: payment_reference,
      amount: amount / 100, // Convert to฿
      amount_display: `${(amount / 100).toLocaleString()}฿`
    };

    if (payment_method === 'promptpay') {
      payment_details.qr_code_url = paymentSettings?.promptpay_qr_code_url;
      payment_details.phone_number = paymentSettings?.promptpay_phone_number;
      payment_details.instructions = 'Scan QR code or transfer to phone number, then upload payment screenshot';
    } else if (payment_method === 'cash') {
      payment_details.contact_line = paymentSettings?.cash_contact_line;
      payment_details.contact_phone = paymentSettings?.cash_contact_phone;
      payment_details.instructions = paymentSettings?.cash_instructions || 'Contact us to arrange cash payment';
    }

    res.json({
      subscription_id: subscription.id,
      payment_reference,
      amount: amount / 100,
      amount_display: `${(amount / 100).toLocaleString()}฿`,
      payment_details,
      expires_at: subscription.expires_at,
      message: 'VIP purchase initiated. Complete payment to activate.'
    });

  } catch (error) {
    logger.error('Initiate VIP purchase error:', error);
    res.status(500).json({ error: 'Failed to initiate VIP purchase' });
  }
};

/**
 * Upload payment proof (screenshot for PromptPay)
 */
export const uploadPaymentProof = async (req: AuthRequest, res: Response) => {
  try {
    const { payment_reference } = req.body;
    const proof_image = req.file; // Using multer middleware

    if (!payment_reference || !proof_image) {
      return res.status(400).json({ error: 'Missing payment reference or proof image' });
    }

    // Find subscription
    const { data: subscription, error: findError } = await supabase
      .from('employee_vip_subscriptions')
      .select('*')
      .eq('payment_reference', payment_reference)
      .single();

    if (findError || !subscription) {
      return res.status(404).json({ error: 'Payment reference not found' });
    }

    // Check authorization (must be purchaser)
    if (subscription.purchased_by_user_id !== req.user?.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Upload to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(proof_image.path, {
      folder: 'vip_payment_proofs',
      resource_type: 'image',
      format: 'jpg',
      transformation: [
        { width: 800, height: 800, crop: 'limit' },
        { quality: 'auto:good' }
      ]
    });

    // Update subscription with proof URL
    const { error: updateError } = await supabase
      .from('employee_vip_subscriptions')
      .update({
        payment_proof_url: uploadResult.secure_url,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.id);

    if (updateError) throw updateError;

    res.json({
      message: 'Payment proof uploaded successfully',
      status: 'pending_verification',
      estimated_activation: '1-24 hours'
    });

  } catch (error) {
    logger.error('Upload payment proof error:', error);
    res.status(500).json({ error: 'Failed to upload payment proof' });
  }
};

/**
 * Get VIP status for employee (public endpoint)
 */
export const getVIPStatus = async (req: Request, res: Response) => {
  try {
    const { employee_id } = req.params;

    // Find active VIP subscription
    const { data, error } = await supabase
      .from('employee_vip_subscriptions')
      .select('*')
      .eq('employee_id', employee_id)
      .eq('status', 'active')
      .gte('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;

    const isVIP = !!data;
    const daysLeft = data
      ? Math.ceil((new Date(data.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : 0;

    res.json({
      is_vip: isVIP,
      expires_at: data?.expires_at,
      days_left: daysLeft,
      subscription: data ? {
        id: data.id,
        starts_at: data.starts_at,
        expires_at: data.expires_at,
        duration_days: data.duration_days
      } : null
    });

  } catch (error) {
    logger.error('Get VIP status error:', error);
    res.status(500).json({ error: 'Failed to get VIP status' });
  }
};

/**
 * Get VIP analytics for employee
 * Auth required, owner only
 */
export const getVIPAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const { employee_id } = req.params;
    const user_id = req.user?.id;

    // Check permissions (owner only)
    const canView = await checkAnalyticsPermission(user_id!, employee_id);
    if (!canView) {
      return res.status(403).json({ error: 'Not authorized to view analytics' });
    }

    // Check if VIP is active
    const { data: vipStatus } = await supabase
      .from('employee_vip_subscriptions')
      .select('*')
      .eq('employee_id', employee_id)
      .eq('status', 'active')
      .gte('expires_at', new Date().toISOString())
      .maybeSingle();

    if (!vipStatus) {
      return res.status(403).json({ error: 'VIP subscription required to view analytics' });
    }

    // Get analytics events from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: events, error } = await supabase
      .from('vip_analytics_events')
      .select('*')
      .eq('entity_type', 'employee')
      .eq('entity_id', employee_id)
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (error) throw error;

    // Calculate metrics
    const analytics = calculateAnalytics(events, vipStatus);

    res.json({ analytics });

  } catch (error) {
    logger.error('Get VIP analytics error:', error);
    res.status(500).json({ error: 'Failed to get VIP analytics' });
  }
};

// Helper functions

async function checkPurchasePermission(user_id: string, employee_id: string): Promise<boolean> {
  // Check if user is the employee herself
  const { data: employee } = await supabase
    .from('employees')
    .select('user_id')
    .eq('id', employee_id)
    .single();

  if (employee?.user_id === user_id) return true;

  // Check if user is admin/moderator
  const { data: user } = await supabase
    .from('users')
    .select('role')
    .eq('id', user_id)
    .single();

  if (user?.role === 'admin' || user?.role === 'moderator') return true;

  // Check if user is establishment owner of employee's current establishment
  const { data: employment } = await supabase
    .from('current_employment')
    .select('establishment_id')
    .eq('employee_id', employee_id)
    .maybeSingle();

  if (employment) {
    const { data: ownership } = await supabase
      .from('establishment_owners')
      .select('*')
      .eq('user_id', user_id)
      .eq('establishment_id', employment.establishment_id)
      .maybeSingle();

    if (ownership) return true;
  }

  return false;
}

async function getUserType(user_id: string, employee_id: string): Promise<string> {
  const { data: employee } = await supabase
    .from('employees')
    .select('user_id')
    .eq('id', employee_id)
    .single();

  if (employee?.user_id === user_id) return 'employee';

  const { data: user } = await supabase
    .from('users')
    .select('role, account_type')
    .eq('id', user_id)
    .single();

  if (user?.role === 'admin') return 'admin';
  if (user?.account_type === 'establishment_owner') return 'manager';

  return 'other';
}

async function checkAnalyticsPermission(user_id: string, employee_id: string): Promise<boolean> {
  // Same as checkPurchasePermission
  return checkPurchasePermission(user_id, employee_id);
}

function calculateAnalytics(events: any[], vipStatus: any) {
  // Implementation in Analytics section
  // Returns { total_views, views_this_week, timeline, sources, etc. }
}
```

### 3.3 Frontend

#### Nouveau Hook `useVIPStatus`

```typescript
// src/hooks/useVIPStatus.ts

import { useQuery } from '@tanstack/react-query';
import { useSecureFetch } from './useSecureFetch';

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

export function useVIPStatus(entityType: 'employee' | 'establishment', entityId: string) {
  const { secureFetch } = useSecureFetch();

  return useQuery<VIPStatus>({
    queryKey: ['vipStatus', entityType, entityId],
    queryFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/vip/${entityType}/${entityId}/status`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch VIP status');
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000 // Refetch every 10 minutes
  });
}
```

#### Composant `VIPBadge`

```typescript
// src/components/VIP/VIPBadge.tsx

import React from 'react';
import './VIPBadge.css';

interface VIPBadgeProps {
  type: 'employee' | 'establishment';
  expiresAt?: string;
  size?: 'small' | 'medium' | 'large';
  showExpiry?: boolean;
}

const VIPBadge: React.FC<VIPBadgeProps> = ({
  type,
  expiresAt,
  size = 'medium',
  showExpiry = false
}) => {
  const daysLeft = expiresAt
    ? Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const isExpiringSoon = daysLeft && daysLeft <= 7;

  const icon = type === 'employee' ? '👑' : '🌟';
  const text = type === 'employee' ? 'VIP' : 'FEATURED';

  return (
    <div className={`vip-badge vip-badge-${size} vip-badge-${type}`}>
      <span className="vip-icon">{icon}</span>
      <span className="vip-text">{text}</span>

      {showExpiry && daysLeft && (
        <span className={`vip-expiry ${isExpiringSoon ? 'expiring-soon' : ''}`}>
          {daysLeft}d
        </span>
      )}
    </div>
  );
};

export default VIPBadge;
```

```css
/* src/components/VIP/VIPBadge.css */

.vip-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: 20px;
  font-weight: bold;
  box-shadow: 0 2px 8px rgba(255, 215, 0, 0.3);
  animation: vip-glow 2s infinite;
}

.vip-badge-employee {
  background: linear-gradient(135deg, #FFD700, #FFA500);
  color: #000;
}

.vip-badge-establishment {
  background: linear-gradient(135deg, #FF6B6B, #FF1493);
  color: #fff;
}

@keyframes vip-glow {
  0%, 100% { box-shadow: 0 2px 8px rgba(255, 215, 0, 0.3); }
  50% { box-shadow: 0 4px 16px rgba(255, 215, 0, 0.6); }
}

.vip-badge-small {
  padding: 2px 8px;
  font-size: 0.75rem;
}

.vip-badge-medium {
  padding: 4px 12px;
  font-size: 0.875rem;
}

.vip-badge-large {
  padding: 6px 16px;
  font-size: 1rem;
}

.vip-icon {
  font-size: 1.2em;
  animation: vip-bounce 1s infinite;
}

@keyframes vip-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}

.vip-expiry {
  font-size: 0.75em;
  opacity: 0.9;
}

.vip-expiry.expiring-soon {
  color: #ff0000;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

#### Routes Frontend

```typescript
// src/App.tsx - Ajouter dans Routes

<Route path="/vip/purchase/:entityType/:entityId" element={<PurchaseVIPPage />} />
<Route path="/vip/analytics/:entityType/:entityId" element={<VIPAnalyticsDashboard />} />
<Route path="/admin/vip-verification" element={<AdminVIPVerificationQueue />} />
```

---

## 4. Système de Paiement

### 4.1 Méthodes Disponibles

#### 🇹🇭 **PromptPay QR Code** (Priorité 1 - 80% des paiements estimés)

**Avantages** :
- ✅ Instantané (paiement en 30 secondes)
- ✅ Gratuit (0% frais vs 3-4% Stripe)
- ✅ Universel (90% des Thaïlandais l'utilisent)
- ✅ Simple (scan → confirmé)

**Workflow** :
```
1. User sélectionne durée VIP + "PromptPay"
2. Backend génère payment_reference unique (VIP-EMP-20250118-A3F9)
3. Frontend affiche QR Code statique + phone number
4. User scanne QR avec banking app → paie 3,200฿
5. User prend screenshot confirmation
6. User upload screenshot via frontend
7. Screenshot stocké dans Cloudinary
8. Admin reçoit notification
9. Admin vérifie screenshot (1-24h)
10. Admin approve → VIP activé automatiquement
```

**Configuration Admin** :
```
Admin Panel → Payment Settings → PromptPay
- Upload QR Code statique (généré depuis banking app)
- Entrer phone number (081-234-5678)
- Active/Inactive toggle
```

**Génération QR Code** (Admin side) :
```
1. Ouvrir banking app (K PLUS, SCB Easy, Bangkok Bank Mobile)
2. Menu → PromptPay → Receive Money → Generate QR Code
3. QR permanent (valide indéfiniment)
4. Télécharger image QR
5. Upload dans Admin Panel PattaMap
```

#### 💵 **Cash Payment** (Priorité 2 - 20% des paiements estimés)

**Avantages** :
- ✅ Nightlife = cash culture
- ✅ Relation directe avec client
- ✅ Activation immédiate
- ✅ Pas de frais technique

**Workflow** :
```
1. User sélectionne durée VIP + "Cash Payment"
2. Backend génère payment_reference (VIP-EMP-20250118-B7K2)
3. Frontend affiche contact info (LINE, Phone, Instructions)
4. User contacte admin sur LINE : "VIP pour Anna, code: VIP-EMP-20250118-B7K2"
5. RDV physique arrangé (bureau, bar partenaire, etc.)
6. User paie cash + donne reference code
7. Admin va dans Admin Panel → VIP Verification → "Activate Manual"
8. Admin entre reference code → Confirme montant reçu → Activate
9. VIP activé immédiatement
10. User reçoit notification
```

**Configuration Admin** :
```
Admin Panel → Payment Settings → Cash
- Contact LINE: @pattamap
- Contact Phone: 081-234-5678
- Instructions: "Contact us on LINE to arrange cash payment. Meeting locations: ..."
- Active/Inactive toggle
```

### 4.2 Validation Admin

#### Queue de Vérification

**Admin Panel Route** : `/admin/vip-verification`

```
┌─────────────────────────────────────────────────────────────┐
│ 👑 VIP PAYMENT VERIFICATION QUEUE                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Pending Verifications (3):                                 │
│                                                             │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ 🌟 EMPLOYEE VIP                                       │  │
│ │                                                       │  │
│ │ Employee: Anna (Soi 6)                               │  │
│ │ Duration: 1 month (30 days)                          │  │
│ │ Amount: 3,200฿                                       │  │
│ │ Payment Method: PromptPay                            │  │
│ │ Reference: VIP-EMP-20250118-A3F9                     │  │
│ │ Submitted: 2 hours ago                               │  │
│ │ Purchased by: anna_user (Employee)                   │  │
│ │                                                       │  │
│ │ Payment Proof:                                       │  │
│ │ ┌─────────────────────────┐                         │  │
│ │ │ [Screenshot Image]      │                         │  │
│ │ │ Kasikorn Bank           │                         │  │
│ │ │ Transfer: 3,200฿        │                         │  │
│ │ │ To: 081-234-5678        │                         │  │
│ │ │ Success ✓               │                         │  │
│ │ └─────────────────────────┘                         │  │
│ │                                                       │  │
│ │ Admin Notes:                                         │  │
│ │ ┌──────────────────────────────────────────────┐    │  │
│ │ │ [Optional notes...]                          │    │  │
│ │ └──────────────────────────────────────────────┘    │  │
│ │                                                       │  │
│ │ [✅ Approve & Activate VIP]  [❌ Reject Payment]     │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Activation Manuelle (Cash)

```
┌────────────────────────────────────────────────┐
│ 💵 MANUAL VIP ACTIVATION (Cash Payment)       │
├────────────────────────────────────────────────┤
│                                                │
│ Payment Reference:                            │
│ ┌──────────────────────────────────────────┐  │
│ │ VIP-EMP-20250118-B7K2                   │  │
│ └──────────────────────────────────────────┘  │
│                                                │
│ [Lookup]                                      │
│                                                │
│ ────────────────────────────────────────────  │
│                                                │
│ Employee: Lisa (Walking Street)               │
│ Duration: 1 week (7 days)                     │
│ Expected Amount: 1,000฿                       │
│                                                │
│ Amount Received (Cash):                       │
│ ┌──────────────────────────────────────────┐  │
│ │ 1000                                     │  │
│ └──────────────────────────────────────────┘  │
│                                                │
│ Admin Notes:                                  │
│ ┌──────────────────────────────────────────┐  │
│ │ Cash received at office on 2025-01-18    │  │
│ └──────────────────────────────────────────┘  │
│                                                │
│         [✅ Activate VIP Now]                  │
└────────────────────────────────────────────────┘
```

---

## 5. Pricing

### 5.1 VIP Employée

| Durée | Prix | Prix/jour | Économie | Cible |
|-------|------|-----------|----------|-------|
| **1 semaine** | **1,000฿** | 143฿/jour | - | Test, budget serré |
| **1 mois** | **3,200฿** | 107฿/jour | **20%** 🔥 | Standard (recommandé) |
| **3 mois** | **8,000฿** | 89฿/jour | **33%** 🔥🔥 | Hardcore users |

**Justification** :
- 1,000฿/semaine = Prix psychologique accessible (prix d'un repas restaurant)
- 3,200฿/mois = Position forte ("moins de 110฿/jour")
- Incentive claire pour mensuel (économie 20%)
- ROI évident : 1-2 clients supplémentaires/mois → largement rentabilisé

### 5.2 VIP Établissement

| Durée | Prix | Prix/jour | Économie | Cible |
|-------|------|-----------|----------|-------|
| **1 semaine** | **3,000฿** | 429฿/jour | - | Test |
| **1 mois** | **9,000฿** | 300฿/jour | **25%** 🔥 | Standard |
| **3 mois** | **21,000฿** | 233฿/jour | **42%** 🔥🔥 | Loyauté |
| **6 mois** | **36,000฿** | 200฿/jour | **50%** 🔥🔥🔥 | Hardcore |

**Justification** :
- 3,000฿/semaine = Prix psychologique fort (100฿/jour)
- 9,000฿/mois = Prix rond facile à mémoriser
- 21,000฿/3 mois = Sweet spot (économie 42%)
- 36,000฿/6 mois = Pour établissements sérieux (économie 50%)
- ROI clair : 5-10 nouveaux clients/mois → rentabilisé

---

## 6. Expérience Utilisateur - VIP Employée

### 6.1 Découverte

**Où** : Employee Dashboard (`/employee/dashboard`)

**Trigger** : Message promo permanent dans dashboard si non-VIP

```
┌─────────────────────────────────────────────────┐
│ 📊 My Dashboard - Anna                          │
├─────────────────────────────────────────────────┤
│                                                 │
│ 🆓 BASIC PROFILE                                │
│                                                 │
│ Your Profile Stats (Last 30 Days):             │
│ • Profile Views: 45                             │
│ • Favorites: 8                                  │
│ • Search Appearances: 120                       │
│                                                 │
│ ┌──────────────────────────────────────────┐   │
│ │  👑 BOOST YOUR VISIBILITY                │   │
│ │                                          │   │
│ │  VIP members get 3-5x more views:       │   │
│ │  ✅ Top position in search results      │   │
│ │  ✅ Top position in lineup (bars)       │   │
│ │  ✅ Gold border & crown on profile      │   │
│ │  ✅ Detailed analytics dashboard        │   │
│ │                                          │   │
│ │  From 1,000฿/week                       │   │
│ │                                          │   │
│ │  [🚀 Upgrade to VIP Now]                │   │
│ └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

### 6.2 Page Achat VIP

**Route** : `/vip/purchase/employee/{employee_id}`

**Accessible depuis** :
- Employee Dashboard → "Upgrade to VIP" button
- Header Menu → "Boost My Visibility" (si employee account)

```
┌──────────────────────────────────────────────────────────┐
│ 👑 BOOST YOUR VISIBILITY                                 │
│ More Views • More Favorites • More Opportunities         │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ SELECT YOUR BOOST DURATION:                             │
│                                                          │
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│ │ 1 WEEK       │  │ 1 MONTH ⭐   │  │ 3 MONTHS     │   │
│ │              │  │ SAVE 20%     │  │ SAVE 33%     │   │
│ │ 1,000฿       │  │ 3,200฿       │  │ 8,000฿       │   │
│ │ 143฿/day     │  │ 107฿/day     │  │ 89฿/day      │   │
│ │              │  │              │  │              │   │
│ │ [ Select ]   │  │ [✓ Selected] │  │ [ Select ]   │   │
│ └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                          │
│ WHAT YOU GET:                                           │
│ ✅ Top position in ALL search results                  │
│ ✅ Top position in establishment lineup                │
│ ✅ VIP crown badge on profile                          │
│ ✅ Gold border + glow animation                        │
│ ✅ Detailed analytics (views, favorites, sources)      │
│ ✅ Priority visibility 24/7                            │
│                                                          │
│ PAYMENT METHOD:                                         │
│ ( ) 🇹🇭 PromptPay QR Code (Instant) ⭐ RECOMMENDED     │
│ ( ) 💵 Cash Payment (Meet in person)                   │
│                                                          │
│                                  [Continue to Payment] │
└──────────────────────────────────────────────────────────┘
```

### 6.3 Paiement PromptPay

```
┌──────────────────────────────────────────────┐
│ 🇹🇭 PROMPTPAY PAYMENT                        │
├──────────────────────────────────────────────┤
│                                              │
│ Amount to Pay: 3,200฿                       │
│ Duration: 1 Month VIP                       │
│                                              │
│ SCAN THIS QR CODE:                          │
│ ┌────────────────────┐                      │
│ │                    │                      │
│ │   [QR CODE IMAGE]  │                      │
│ │                    │                      │
│ └────────────────────┘                      │
│                                              │
│ Or transfer to: 081-234-5678                │
│                                              │
│ Reference Code: VIP-EMP-20250118-A3F9       │
│ ⚠️ Important: Keep this code!              │
│                                              │
│ INSTRUCTIONS:                               │
│ 1. Open your banking app                   │
│ 2. Scan QR code or enter phone number      │
│ 3. Confirm payment of 3,200฿               │
│ 4. Take screenshot of confirmation         │
│ 5. Upload screenshot below                 │
│                                              │
│ ┌──────────────────────────────────────┐   │
│ │ [📷 Upload Payment Screenshot]        │   │
│ │ (Drag & drop or click to select)     │   │
│ └──────────────────────────────────────┘   │
│                                              │
│ After uploading, admin will verify within  │
│ 1-24 hours and activate your VIP.          │
│                                              │
│         [I've Paid - Upload Proof]          │
└──────────────────────────────────────────────┘
```

### 6.4 Paiement Cash

```
┌──────────────────────────────────────────────┐
│ 💵 CASH PAYMENT                              │
├──────────────────────────────────────────────┤
│                                              │
│ Amount to Pay: 3,200฿                       │
│ Duration: 1 Month VIP                       │
│                                              │
│ CONTACT US TO ARRANGE PAYMENT:              │
│                                              │
│ 📱 LINE: @pattamap                          │
│ 📞 Phone: 081-234-5678                      │
│                                              │
│ Reference Code: VIP-EMP-20250118-B7K2       │
│ ⚠️ Important: Provide this code when paying │
│                                              │
│ MEETING LOCATIONS:                          │
│ • PattaMap Office (Soi 6)                  │
│ • Partner bars (Walking Street, LK Metro)  │
│ • Or we can arrange a meeting location     │
│                                              │
│ NEXT STEPS:                                 │
│ 1. Contact us on LINE or phone             │
│ 2. Mention your reference code             │
│ 3. We'll arrange a meeting time & place    │
│ 4. Bring cash payment (exact amount)       │
│ 5. VIP activated immediately after payment │
│                                              │
│         [Contact on LINE] [Call Now]        │
└──────────────────────────────────────────────┘
```

### 6.5 Attente Validation

**Après upload screenshot PromptPay** :

```
┌──────────────────────────────────────────┐
│ ⏳ PAYMENT PENDING VERIFICATION          │
├──────────────────────────────────────────┤
│                                          │
│ ✅ Payment proof uploaded successfully  │
│                                          │
│ Reference: VIP-EMP-20250118-A3F9        │
│ Amount: 3,200฿                          │
│ Duration: 1 Month VIP                   │
│                                          │
│ Admin is verifying your payment...      │
│ Expected activation: 1-24 hours         │
│                                          │
│ You'll receive a notification when      │
│ your VIP boost is activated!            │
│                                          │
│ [ Back to Dashboard ]                   │
└──────────────────────────────────────────┘
```

### 6.6 VIP Activé

**Notification Push** : "🎉 Your VIP boost is now active! You're now featured at the top of all searches."

**Employee Dashboard (VIP Active)** :

```
┌─────────────────────────────────────────────────┐
│ 📊 My Dashboard - Anna 👑 VIP                   │
├─────────────────────────────────────────────────┤
│                                                 │
│ ┌────────────────────────────────────────────┐ │
│ │ 👑 VIP STATUS: ACTIVE                      │ │
│ │ Expires in: 29 days                        │ │
│ │                          [Renew VIP Now]   │ │
│ └────────────────────────────────────────────┘ │
│                                                 │
│ VIP PERFORMANCE (Last 7 Days):                 │
│                                                 │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│ │ 👁️ 245    │ │ ⭐ 18     │ │ 🔍 890    │        │
│ │ Views     │ │ Favorites│ │ Searches │        │
│ │ +156% ↑   │ │ +125% ↑  │ │ Rank #2  │        │
│ └──────────┘ └──────────┘ └──────────┘        │
│                                                 │
│ [📊 View Full Analytics Dashboard]             │
│                                                 │
│ TRAFFIC SOURCES:                               │
│ 🔍 Search Results: 45%                         │
│ 🏢 Lineup (Establishment): 35%                 │
│ ⭐ Favorites Page: 20%                         │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 6.7 Analytics Dashboard VIP

**Route** : `/vip/analytics/employee/{employee_id}`

```
┌──────────────────────────────────────────────────────────┐
│ 📊 VIP PERFORMANCE DASHBOARD                             │
│ Anna - 👑 VIP (Expires in 29 days) [Renew Now]          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ OVERVIEW (Last 30 Days):                                │
│                                                          │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐     │
│ │ 👁️ 1,250     │ │ ⭐ 45         │ │ 🔍 2,100      │     │
│ │ Profile Views│ │ New Favorites│ │ Searches     │     │
│ │ +180% ↑      │ │ +156% ↑      │ │ Avg Rank #2.3│     │
│ └──────────────┘ └──────────────┘ └──────────────┘     │
│                                                          │
│ PERFORMANCE TREND (Last 7 Days):                        │
│ ┌──────────────────────────────────────────────────┐   │
│ │      ┌─── Profile Views                         │   │
│ │  250 │    ╱╲                                    │   │
│ │      │   ╱  ╲    ╱╲                            │   │
│ │  150 │  ╱    ╲  ╱  ╲  ╱╲                       │   │
│ │      │ ╱      ╲╱    ╲╱  ╲                      │   │
│ │   50 │╱                 ╲                      │   │
│ │      └─────────────────────────────            │   │
│ │       M  T  W  T  F  S  S                      │   │
│ └──────────────────────────────────────────────────┘   │
│                                                          │
│ TRAFFIC SOURCES:                                        │
│ ━━━━━━━━━━━━━━━━━━━ 🔍 Search: 45%                    │
│ ━━━━━━━━━━━━━━ 🏢 Lineup: 35%                         │
│ ━━━━━━━━ ⭐ Favorites: 20%                             │
│                                                          │
│ SEARCH PERFORMANCE:                                     │
│ • Appeared in searches: 2,100 times                    │
│ • Average position: #2.3 (VIP = Top 3 guaranteed)     │
│ • Click-through rate: 59%                              │
│                                                          │
│ COMPARISON (vs Last 30 Days Before VIP):               │
│ • Views: 1,250 vs 450 (+178%)                         │
│ • Favorites: 45 vs 18 (+150%)                         │
│ • CTR: 59% vs 32% (+84%)                              │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 6.8 Affichage VIP sur la Plateforme

#### ❌ **PAS sur Carte de Zone**

**Important** : Les employées VIP n'ont **PAS de spot direct** sur les cartes de zone (CustomSoi6Map, etc.).

Les employées apparaissent sur la carte **uniquement via leur établissement** (comme avant VIP).

#### ✅ **Top Position dans Lineup** (GirlsGallery)

**Où** : Page établissement → Tab "Girls" → Galerie employées

**Avant VIP** :
```
Bar ABC - Girls (15):
┌────┐ ┌────┐ ┌────┐ ┌────┐
│Lisa│ │Anna│ │Sophie││Maria│
└────┘ └────┘ └────┘ └────┘
(Ordre aléatoire ou par created_at)
```

**Après VIP (Anna devient VIP)** :
```
Bar ABC - Girls (15):
┏━━━━┓ ┌────┐ ┌────┐ ┌────┐
┃👑  ┃ │Lisa│ │Sophie││Maria│
┃Anna┃ │    │ │    │ │    │
┗━━━━┛ └────┘ └────┘ └────┘
(Anna VIP en tête, bordure dorée)
```

#### ✅ **Top Position dans Search Results**

**Où** : Page recherche → Résultats

**Avant VIP** :
```
Search Results (45):

┌─────────────────────────────────────┐
│ [Photo] Lisa - 24 • Thai            │
│         Bar ABC, Soi 6              │
│         ⭐ 4.5 (15 reviews)          │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ [Photo] Anna - 22 • Thai            │
│         Bar ABC, Soi 6              │
│         ⭐ 4.8 (23 reviews)          │
└─────────────────────────────────────┘
```

**Après VIP (Anna devient VIP)** :
```
Search Results (45):

━━━ VIP PROFILES ━━━

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ [Photo] 👑 Anna - VIP            ┃
┃          22 • Thai               ┃
┃          Bar ABC, Soi 6          ┃
┃          ⭐ 4.8 (23 reviews)      ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
(Bordure dorée + VIP badge)

━━━ REGULAR PROFILES ━━━

┌─────────────────────────────────────┐
│ [Photo] Lisa - 24 • Thai            │
│         Bar ABC, Soi 6              │
│         ⭐ 4.5 (15 reviews)          │
└─────────────────────────────────────┘
```

#### ✅ **Badge VIP Partout** (EmployeeCard)

**Où** : Tous les composants utilisant `EmployeeCard` :
- Search Results
- GirlsGallery (lineup établissement)
- Favorites Page
- Related Employees

**Ajout dans EmployeeCard.tsx** :

```typescript
// Line 96-109 (après verified badge)
{/* VIP Crown Badge - Top Left (prioritaire sur photo count) */}
{employee.is_vip && (
  <div className="employee-card-vip-corner" title="VIP Boosted Profile">
    <span className="vip-crown-icon">👑</span>
    <span>VIP</span>
  </div>
)}

// Wrapper avec border dorée si VIP
<motion.div
  className={`employee-card-tinder ${employee.is_vip ? 'employee-card-vip' : ''} ${className}`}
  // ...
```

**CSS** :

```css
/* VIP Card Styling */
.employee-card-vip {
  border: 2px solid #FFD700;
  box-shadow: 0 4px 16px rgba(255, 215, 0, 0.3);
}

.employee-card-vip::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    135deg,
    rgba(255, 215, 0, 0.1) 0%,
    transparent 50%
  );
  pointer-events: none;
}

.employee-card-vip-corner {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 10;
  background: linear-gradient(135deg, #FFD700, #FFA500);
  color: #000;
  padding: 4px 8px;
  border-radius: 8px;
  font-weight: bold;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  gap: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.vip-crown-icon {
  font-size: 1.2em;
  animation: vip-bounce 1s infinite;
}

@keyframes vip-bounce {
  0%, 100% { transform: translateY(0) rotate(-15deg); }
  50% { transform: translateY(-3px) rotate(-15deg); }
}
```

---

## 7. Expérience Utilisateur - VIP Établissement

### 7.1 Découverte

**Où** : My Establishments Page (`/my-establishments`)

**Accessible** : Establishment Owners uniquement

```
┌─────────────────────────────────────────────────┐
│ 🏆 My Establishments                            │
├─────────────────────────────────────────────────┤
│                                                 │
│ Your Establishments (2):                       │
│                                                 │
│ ┌───────────────────────────────────────────┐  │
│ │ 🏢 Bar ABC (Soi 6)                        │  │
│ │ 📊 Last 30 days:                          │  │
│ │ • Views: 320                               │  │
│ │ • Favorites: 45                            │  │
│ │ • Reviews: 12                              │  │
│ │                                            │  │
│ │ ┌────────────────────────────────────────┐ │  │
│ │ │ 🌟 FEATURE THIS ESTABLISHMENT          │ │  │
│ │ │                                        │ │  │
│ │ │ Featured establishments get:           │ │  │
│ │ │ ✅ Shown on homepage                   │ │  │
│ │ │ ✅ Larger logo on maps (150%)          │ │  │
│ │ │ ✅ Top position in searches            │ │  │
│ │ │ ✅ Advanced analytics                  │ │  │
│ │ │ ✅ All employees get visibility boost  │ │  │
│ │ │                                        │ │  │
│ │ │ From 3,000฿/week                       │ │  │
│ │ │                                        │ │  │
│ │ │ [🚀 Upgrade to Featured]               │ │  │
│ │ └────────────────────────────────────────┘ │  │
│ └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### 7.2 Page Achat VIP Établissement

**Route** : `/vip/purchase/establishment/{establishment_id}`

```
┌──────────────────────────────────────────────────────────┐
│ 🌟 FEATURE YOUR ESTABLISHMENT                            │
│ More Visibility • More Customers • More Revenue          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ SELECT DURATION:                                        │
│                                                          │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│ │ 1 WEEK   │ │ 1 MONTH  │ │ 3 MONTHS │ │ 6 MONTHS │   │
│ │          │ │ SAVE 25% │ │ SAVE 42% │ │ SAVE 50% │   │
│ │ 3,000฿   │ │ 9,000฿   │ │ 21,000฿  │ │ 36,000฿  │   │
│ │ 429฿/day │ │ 300฿/day │ │ 233฿/day │ │ 200฿/day │   │
│ │          │ │          │ │          │ │          │   │
│ │[Select]  │ │[Selected]│ │[Select]  │ │[Select]  │   │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│                                                          │
│ WHAT YOU GET:                                           │
│ ✅ Featured section on homepage (prime visibility)     │
│ ✅ Larger logo on zone maps (150% size)                │
│ ✅ Gold border + pulse animation                       │
│ ✅ Top position in all searches & lists                │
│ ✅ All your employees get visibility boost             │
│ ✅ Advanced analytics (views, competitors, trends)     │
│ ✅ Priority support                                    │
│                                                          │
│ PAYMENT METHOD:                                         │
│ ( ) 🇹🇭 PromptPay QR Code (Instant) ⭐ RECOMMENDED     │
│ ( ) 💵 Cash Payment (Meet in person)                   │
│                                                          │
│                                  [Continue to Payment] │
└──────────────────────────────────────────────────────────┘
```

(Paiement workflows identiques à VIP Employée)

### 7.3 Featured Homepage

**Où** : Homepage (`/`) → Section dédiée

```
┌──────────────────────────────────────────────────────┐
│ HOME PAGE                                            │
├──────────────────────────────────────────────────────┤
│                                                      │
│ 🔥 FEATURED ESTABLISHMENTS                          │
│                                                      │
│ ┏━━━━━━━━━━━━━━━┓ ┏━━━━━━━━━━━━━━━┓                │
│ ┃ [LOGO]        ┃ ┃ [LOGO]        ┃                │
│ ┃ Bar ABC       ┃ ┃ GoGo XYZ      ┃                │
│ ┃ Soi 6         ┃ ┃ Walking St    ┃                │
│ ┃ ⭐ 4.8        ┃ ┃ ⭐ 4.9        ┃                │
│ ┃ 25 employees  ┃ ┃ 40 employees  ┃                │
│ ┃ 🌟 FEATURED   ┃ ┃ 🌟 FEATURED   ┃                │
│ ┗━━━━━━━━━━━━━━━┛ ┗━━━━━━━━━━━━━━━┛                │
│   Gold border + pulse animation                     │
│                                                      │
│                             [View All Establishments]│
└──────────────────────────────────────────────────────┘
```

**Implémentation** :

```typescript
// src/components/Homepage/FeaturedEstablishments.tsx

const FeaturedEstablishments: React.FC = () => {
  const { data: featured, isLoading } = useQuery({
    queryKey: ['featuredEstablishments'],
    queryFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/establishments/featured`
      );
      return response.json();
    }
  });

  if (isLoading) return <SkeletonCard count={2} />;
  if (!featured || featured.length === 0) return null;

  return (
    <section className="featured-establishments">
      <h2>🔥 Featured Establishments</h2>
      <div className="featured-grid">
        {featured.map(est => (
          <div key={est.id} className="featured-card" onClick={() => navigate(`/bar/${est.zone}/${est.slug}`)}>
            <div className="featured-badge">🌟 FEATURED</div>
            <img src={est.logo_url} alt={est.name} />
            <h3>{est.name}</h3>
            <p>{est.zone} • ⭐ {est.average_rating}</p>
            <span className="employee-count">{est.employee_count} employees</span>
          </div>
        ))}
      </div>
    </section>
  );
};
```

```css
/* src/components/Homepage/FeaturedEstablishments.css */

.featured-establishments {
  margin: 40px 0;
  padding: 20px;
}

.featured-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.featured-card {
  position: relative;
  border: 2px solid #FF6B6B;
  border-radius: 12px;
  padding: 20px;
  background: linear-gradient(135deg, rgba(255, 107, 107, 0.1), transparent);
  cursor: pointer;
  transition: all 0.3s ease;
  animation: featuredPulse 2s infinite;
}

@keyframes featuredPulse {
  0%, 100% {
    box-shadow: 0 0 15px rgba(255, 107, 107, 0.4);
    transform: scale(1);
  }
  50% {
    box-shadow: 0 0 25px rgba(255, 107, 107, 0.6);
    transform: scale(1.02);
  }
}

.featured-card:hover {
  transform: scale(1.05);
  box-shadow: 0 10px 30px rgba(255, 107, 107, 0.5);
}

.featured-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  background: linear-gradient(135deg, #FF6B6B, #FF1493);
  color: white;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: bold;
}
```

### 7.4 VIP sur Carte de Zone

**Modification** : Tous les `CustomXXXMap.tsx` (Soi6, WalkingStreet, etc.)

**Avant VIP** :
```
Carte Soi 6 :
┌───────────────────────────────┐
│                               │
│  ┌────┐  ┌────┐  ┌────┐      │
│  │Bar │  │Bar │  │Bar │      │
│  │ A  │  │ B  │  │ C  │      │
│  └────┘  └────┘  └────┘      │
│  (tous même taille)           │
└───────────────────────────────┘
```

**Après VIP (Bar B devient Featured)** :
```
Carte Soi 6 :
┌───────────────────────────────┐
│                               │
│  ┌────┐  ┏━━━━━━┓  ┌────┐   │
│  │Bar │  ┃ Bar  ┃  │Bar │   │
│  │ A  │  ┃  B   ┃  │ C  │   │
│  └────┘  ┃ 🌟   ┃  └────┘   │
│          ┗━━━━━━┛            │
│          (150% size)          │
│          (gold + pulse)       │
└───────────────────────────────┘
```

**Implémentation** :

```typescript
// src/components/Map/CustomSoi6Map.tsx (exemple)

const CustomSoi6Map: React.FC<Props> = ({ establishments, ... }) => {
  // Fetch VIP status for all establishments
  const { data: vipStatuses } = useQuery({
    queryKey: ['establishmentVIPStatuses', establishments.map(e => e.id)],
    queryFn: async () => {
      const statuses = await Promise.all(
        establishments.map(async (est) => {
          const res = await fetch(`${API_URL}/api/vip/establishment/${est.id}/status`);
          const data = await res.json();
          return { id: est.id, ...data };
        })
      );
      return statuses;
    },
    enabled: establishments.length > 0
  });

  const isVIP = (estId: string) => {
    return vipStatuses?.find(v => v.id === estId)?.is_vip || false;
  };

  return (
    <div className="custom-soi6-map">
      {establishments.map(est => {
        const vip = isVIP(est.id);
        const size = vip ? 150 : 100; // 150% if VIP

        return (
          <div
            key={est.id}
            className={`map-establishment ${vip ? 'map-establishment-vip' : ''}`}
            style={{
              gridColumn: est.grid_column,
              gridRow: est.grid_row,
              width: `${size}px`,
              height: `${size}px`
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

```css
/* VIP Establishment on Map */
.map-establishment-vip {
  position: relative;
  border: 2px solid #FF6B6B;
  box-shadow: 0 0 20px rgba(255, 107, 107, 0.5);
  animation: establishmentPulse 2s infinite;
  z-index: 100; /* Above regular establishments */
}

@keyframes establishmentPulse {
  0%, 100% {
    box-shadow: 0 0 20px rgba(255, 107, 107, 0.5);
    transform: scale(1);
  }
  50% {
    box-shadow: 0 0 30px rgba(255, 107, 107, 0.8);
    transform: scale(1.05);
  }
}

.vip-featured-badge {
  position: absolute;
  top: -10px;
  right: -10px;
  font-size: 24px;
  animation: badgeBounce 1s infinite;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
  z-index: 1;
}

@keyframes badgeBounce {
  0%, 100% { transform: translateY(0) rotate(15deg); }
  50% { transform: translateY(-5px) rotate(15deg); }
}
```

### 7.5 Analytics Dashboard VIP Établissement

**Route** : `/vip/analytics/establishment/{establishment_id}`

```
┌──────────────────────────────────────────────────────────┐
│ 📊 FEATURED ESTABLISHMENT ANALYTICS                      │
│ Bar ABC - 🌟 Featured (Expires in 85 days) [Renew]     │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ PERFORMANCE (Last 30 Days):                             │
│                                                          │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐     │
│ │ 👁️ 3,200     │ │ ⭐ 180        │ │ 💬 45         │     │
│ │ Profile Views│ │ New Favorites│ │ New Reviews  │     │
│ │ +320% ↑      │ │ +250% ↑      │ │ +180% ↑      │     │
│ └──────────────┘ └──────────────┘ └──────────────┘     │
│                                                          │
│ EMPLOYEE PROFILES BOOST:                                │
│ Your 25 employees collectively got:                     │
│ • 8,900 profile views (+280% vs non-featured)          │
│ • 450 new favorites (+310%)                            │
│                                                          │
│ TOP PERFORMERS (Your Employees):                        │
│ 1. Anna - 1,250 views (+300%)                          │
│ 2. Lisa - 980 views (+250%)                            │
│ 3. Sophie - 850 views (+220%)                          │
│                                                          │
│ COMPETITOR COMPARISON:                                  │
│ ┌────────────────────────────────────────────────┐     │
│ │ Your establishment: 3,200 views                │     │
│ │ Avg competitor (Soi 6): 1,100 views           │     │
│ │ You're performing +191% better! 🎉            │     │
│ └────────────────────────────────────────────────┘     │
│                                                          │
│ TRAFFIC SOURCES:                                        │
│ ━━━━━━━━━━━━ 🏠 Homepage Featured: 40%                 │
│ ━━━━━━━━━ 🔍 Search Results: 30%                       │
│ ━━━━━━━ 🗺️ Zone Maps: 25%                             │
│ ━━━ 🔗 Direct: 5%                                       │
│                                                          │
│ CONVERSION FUNNEL:                                      │
│ Homepage Featured → 1,280 clicks (40% CTR)             │
│ Search Results → 960 clicks (30%)                      │
│ Map Clicks → 800 (25%)                                 │
│ Direct → 160 (5%)                                      │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 8. Intégration Architecture Existante

### 8.1 Modifications Header.tsx

**Ligne ~330** : Ajouter menu items VIP

```typescript
// src/components/Layout/Header.tsx

{/* 🆕 VIP Menu Items */}
{user.account_type === 'employee' && linkedEmployeeProfile && (
  <>
    {/* Separator */}
    <div className="user-menu-section-separator" />

    <AnimatedButton
      ariaLabel="Boost my visibility with VIP"
      tabIndex={0}
      enableHaptic
      hapticLevel="light"
      className="btn-admin-menu-nightlife"
      onClick={() => {
        setShowUserMenu(false);
        navigate(`/vip/purchase/employee/${linkedEmployeeProfile.id}`);
      }}
    >
      👑 Boost My Visibility
    </AnimatedButton>
  </>
)}

{user.account_type === 'establishment_owner' && (
  <>
    {/* Separator */}
    <div className="user-menu-section-separator" />

    <AnimatedButton
      ariaLabel="Feature my establishment"
      tabIndex={0}
      enableHaptic
      hapticLevel="light"
      className="btn-admin-menu-nightlife"
      onClick={() => {
        setShowUserMenu(false);
        // Navigate to My Establishments where they can purchase VIP
        navigate('/my-establishments');
      }}
    >
      🌟 Feature My Business
    </AnimatedButton>
  </>
)}
```

### 8.2 Modifications EmployeeCard.tsx

**Ligne ~96** : Ajouter VIP badge (prioritaire sur photo count)

```typescript
// src/components/Common/EmployeeCard.tsx

{/* VIP Crown Badge - Top Left (prioritaire sur verified ET photo count) */}
{employee.is_vip && (
  <div className="employee-card-vip-corner" title="VIP Boosted Profile">
    <span className="vip-crown-icon">👑</span>
    <span>VIP</span>
  </div>
)}

{/* Verified Corner Badge OU Photo Count (only if NOT VIP) */}
{!employee.is_vip && (
  employee.is_verified ? (
    <div className="employee-card-verified-corner" title={...}>
      <span className="verified-icon">✓</span>
      <span>VERIFIED</span>
    </div>
  ) : (
    employee.photos && Array.isArray(employee.photos) && employee.photos.length > 1 && (
      <div className="employee-card-photo-count">
        📸 {employee.photos.length}
      </div>
    )
  )
)}
```

**Ligne ~52** : Ajouter className conditionnelle VIP

```typescript
<motion.div
  className={`employee-card-tinder ${employee.is_vip ? 'employee-card-vip' : ''} ${className}`}
  // ...
```

**CSS ajouté** : Voir section 6.8

### 8.3 Modifications SearchPage.tsx

**Tri VIP-first** :

```typescript
// src/components/Search/SearchPage.tsx

const SearchPage: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmployees();
  }, [filters]);

  const fetchEmployees = async () => {
    // Fetch employees from API (already includes is_vip field from JOIN)
    const response = await secureFetch(
      `${API_URL}/api/employees/search?${buildQueryParams(filters)}`
    );
    const data = await response.json();

    // Sort: VIP first, then by other criteria
    const sorted = data.employees.sort((a, b) => {
      // VIP priority
      if (a.is_vip && !b.is_vip) return -1;
      if (!a.is_vip && b.is_vip) return 1;

      // Same VIP status, sort by rating
      return (b.average_rating || 0) - (a.average_rating || 0);
    });

    setEmployees(sorted);
    setLoading(false);
  };

  // ... render
};
```

**Backend modification** :

```typescript
// backend/src/controllers/employeeController.ts

export const searchEmployees = async (req: Request, res: Response) => {
  // ... filters

  // Join with employee_vip_subscriptions to get is_vip status
  let query = supabase
    .from('employees')
    .select(`
      *,
      establishment:current_employment(establishment:establishments(*)),
      vip_subscription:employee_vip_subscriptions!left(
        id,
        expires_at,
        status
      )
    `)
    .eq('status', 'approved');

  // Apply filters...

  const { data, error } = await query;

  if (error) throw error;

  // Add is_vip computed field
  const employees = data.map(emp => ({
    ...emp,
    is_vip: emp.vip_subscription?.status === 'active' &&
            new Date(emp.vip_subscription.expires_at) > new Date()
  }));

  // Note: Sorting is done in frontend for better UX control

  res.json({ employees });
};
```

### 8.4 Modifications GirlsGallery.tsx (Lineup)

**Tri VIP-first dans lineup établissement** :

```typescript
// src/components/Bar/GirlsGallery.tsx

const GirlsGallery: React.FC<{ establishmentId: string }> = ({ establishmentId }) => {
  const { data: employees, isLoading } = useQuery({
    queryKey: ['establishmentEmployees', establishmentId],
    queryFn: async () => {
      const response = await fetch(
        `${API_URL}/api/establishments/${establishmentId}/employees`
      );
      const data = await response.json();

      // Sort: VIP first, then by other criteria
      return data.employees.sort((a, b) => {
        if (a.is_vip && !b.is_vip) return -1;
        if (!a.is_vip && b.is_vip) return 1;

        // Same VIP status, sort by average_rating
        return (b.average_rating || 0) - (a.average_rating || 0);
      });
    }
  });

  return (
    <div className="girls-gallery-grid">
      {employees?.map(emp => (
        <EmployeeCard
          key={emp.id}
          employee={emp}
          onClick={handleClick}
        />
      ))}
    </div>
  );
};
```

### 8.5 Modifications Maps (Établissements VIP)

**Tous les `CustomXXXMap.tsx`** :

```typescript
// src/components/Map/CustomSoi6Map.tsx (exemple, répéter pour toutes maps)

const CustomSoi6Map: React.FC<Props> = ({ establishments, ... }) => {
  // Fetch VIP statuses
  const establishmentIds = establishments.map(e => e.id);

  const { data: vipStatuses } = useQuery({
    queryKey: ['vipStatuses', 'establishment', establishmentIds],
    queryFn: async () => {
      const statuses = await Promise.all(
        establishmentIds.map(async (id) => {
          const res = await fetch(`${API_URL}/api/vip/establishment/${id}/status`);
          return res.json();
        })
      );
      return statuses.reduce((acc, status) => {
        acc[status.id] = status;
        return acc;
      }, {} as Record<string, VIPStatus>);
    },
    enabled: establishmentIds.length > 0,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  const getVIPStatus = (estId: string) => vipStatuses?.[estId];

  return (
    <div className="custom-soi6-map">
      <div className="grid-container">
        {establishments.map(est => {
          const vipStatus = getVIPStatus(est.id);
          const isVIP = vipStatus?.is_vip || false;
          const scale = isVIP ? 1.5 : 1; // 150% if VIP

          return (
            <div
              key={est.id}
              className={`map-position ${isVIP ? 'map-position-vip' : ''}`}
              style={{
                gridColumn: est.grid_column,
                gridRow: est.grid_row,
                transform: `scale(${scale})`,
                zIndex: isVIP ? 100 : 1
              }}
            >
              {isVIP && (
                <div className="vip-featured-badge">🌟</div>
              )}

              <img src={est.logo_url} alt={est.name} />
              <span className="est-name">{est.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
```

**CSS Maps VIP** : Voir section 7.4

### 8.6 Modifications EstablishmentListView.tsx

**Tri VIP-first** :

```typescript
// src/components/Map/EstablishmentListView.tsx

const EstablishmentListView: React.FC<Props> = ({ establishments, zone }) => {
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
      return statuses;
    }
  });

  // Sort: VIP first
  const sorted = useMemo(() => {
    return [...establishments].sort((a, b) => {
      const aVIP = vipStatuses?.find(v => v.id === a.id)?.is_vip || false;
      const bVIP = vipStatuses?.find(v => v.id === b.id)?.is_vip || false;

      if (aVIP && !bVIP) return -1;
      if (!aVIP && bVIP) return 1;

      // Same VIP status, sort by rating
      return (b.average_rating || 0) - (a.average_rating || 0);
    });
  }, [establishments, vipStatuses]);

  return (
    <div className="establishment-list">
      {sorted.map(est => {
        const vipStatus = vipStatuses?.find(v => v.id === est.id);
        const isVIP = vipStatus?.is_vip || false;

        return (
          <div
            key={est.id}
            className={`establishment-card ${isVIP ? 'establishment-card-vip' : ''}`}
          >
            {isVIP && (
              <VIPBadge type="establishment" expiresAt={vipStatus.expires_at} />
            )}

            <img src={est.logo_url} alt={est.name} />
            <h3>{est.name}</h3>
            <p>{est.zone} • ⭐ {est.average_rating}</p>
          </div>
        );
      })}
    </div>
  );
};
```

```css
/* VIP Establishment in List */
.establishment-card-vip {
  border: 2px solid #FF6B6B;
  box-shadow: 0 4px 16px rgba(255, 107, 107, 0.3);
  animation: cardPulse 2s infinite;
}

@keyframes cardPulse {
  0%, 100% {
    box-shadow: 0 4px 16px rgba(255, 107, 107, 0.3);
  }
  50% {
    box-shadow: 0 6px 24px rgba(255, 107, 107, 0.5);
  }
}
```

### 8.7 Admin Panel - VIP Tab

**Route** : `/admin/vip-verification`

**Ajout dans AdminPanel.tsx** :

```typescript
// src/components/Admin/AdminPanel.tsx

<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList>
    <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
    <TabsTrigger value="employees">Employees</TabsTrigger>
    <TabsTrigger value="establishments">Establishments</TabsTrigger>
    <TabsTrigger value="vip">👑 VIP</TabsTrigger> {/* NEW */}
    {/* ... autres tabs */}
  </TabsList>

  <TabsContent value="vip">
    <AdminVIPVerificationQueue />
  </TabsContent>
</Tabs>
```

---

## 9. Analytics & Tracking

### 9.1 Events Trackés

**5 types d'events** :

1. **`profile_view`** - Vue du profil employée/établissement
2. **`map_click`** - Clic sur carte (établissement VIP uniquement)
3. **`favorite_add`** - Ajout aux favoris
4. **`search_appearance`** - Apparition dans résultats de recherche
5. **`lineup_view`** - Vue dans lineup établissement (employée uniquement)

### 9.2 Tracking Implementation

**Helper Function** :

```typescript
// backend/src/utils/vipTracking.ts

import { supabase } from '../config/supabaseClient';
import { logger } from './logger';

export async function trackVIPEvent(
  entityType: 'employee' | 'establishment',
  entityId: string,
  eventType: 'profile_view' | 'map_click' | 'favorite_add' | 'search_appearance' | 'lineup_view',
  userId?: string,
  metadata?: any
): Promise<void> {
  try {
    await supabase.from('vip_analytics_events').insert({
      entity_type: entityType,
      entity_id: entityId,
      event_type: eventType,
      user_id: userId,
      metadata
    });
  } catch (error) {
    logger.error('Track VIP event error:', error);
    // Don't throw - tracking should not break app flow
  }
}
```

**Usage dans Controllers** :

```typescript
// backend/src/controllers/employeeController.ts

export const getEmployeeById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const user_id = (req as AuthRequest).user?.id;

  // ... fetch employee data ...

  // Track profile view
  await trackVIPEvent('employee', id, 'profile_view', user_id);

  res.json({ employee: data });
};

// backend/src/controllers/establishmentController.ts

export const getEstablishmentById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const user_id = (req as AuthRequest).user?.id;

  // ... fetch establishment data ...

  // Track profile view
  await trackVIPEvent('establishment', id, 'profile_view', user_id);

  res.json({ establishment: data });
};

// backend/src/controllers/searchController.ts

export const searchEmployees = async (req: Request, res: Response) => {
  // ... fetch & filter employees ...

  // Track search appearance for VIP employees
  const vipEmployees = employees.filter(emp => emp.is_vip);

  await Promise.all(
    vipEmployees.map((emp, index) =>
      trackVIPEvent('employee', emp.id, 'search_appearance', undefined, {
        position: index + 1,
        total_results: employees.length,
        zone: req.query.zone,
        source: 'search'
      })
    )
  );

  res.json({ employees });
};
```

**Frontend Tracking (favorites)** :

```typescript
// src/components/Employee/AddToFavoritesButton.tsx

const handleAddToFavorites = async () => {
  try {
    const response = await secureFetch(
      `${API_URL}/api/favorites`,
      {
        method: 'POST',
        body: JSON.stringify({ employee_id: employeeId })
      }
    );

    if (response.ok) {
      // Track favorite add (backend will handle VIP tracking)
      toast.success('Added to favorites!');
    }
  } catch (error) {
    toast.error('Failed to add to favorites');
  }
};

// backend/src/controllers/favoriteController.ts

export const addFavorite = async (req: AuthRequest, res: Response) => {
  const { employee_id } = req.body;
  const user_id = req.user?.id;

  // ... add to favorites ...

  // Track favorite add
  await trackVIPEvent('employee', employee_id, 'favorite_add', user_id);

  res.json({ message: 'Added to favorites' });
};
```

### 9.3 Analytics Calculation

**Helper Function** :

```typescript
// backend/src/utils/analyticsCalculator.ts

export function calculateAnalytics(events: any[], vipSubscription: any) {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  // Total counts
  const total_views = events.filter(e => e.event_type === 'profile_view').length;
  const total_map_clicks = events.filter(e => e.event_type === 'map_click').length;
  const total_favorites = events.filter(e => e.event_type === 'favorite_add').length;
  const total_search_appearances = events.filter(e => e.event_type === 'search_appearance').length;

  // This week vs last week
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

  // Timeline (last 7 days)
  const timeline = getLast7DaysTimeline(thisWeekEvents);

  // Traffic sources
  const sources = getTrafficSources(events);

  // Search performance
  const searchEvents = events.filter(e => e.event_type === 'search_appearance');
  const avg_position = searchEvents.length > 0
    ? searchEvents.reduce((sum, e) => sum + (e.metadata?.position || 0), 0) / searchEvents.length
    : 0;

  const click_through_rate = total_search_appearances > 0
    ? Math.round((total_views / total_search_appearances) * 100)
    : 0;

  return {
    total_views,
    total_map_clicks,
    total_favorites,
    total_search_appearances,

    views_this_week,
    views_last_week,
    views_trend,

    favorites_this_week: thisWeekEvents.filter(e => e.event_type === 'favorite_add').length,

    timeline,
    sources,

    search_position_avg: avg_position.toFixed(1),
    click_through_rate: `${click_through_rate}%`,

    vip_expires_at: vipSubscription.expires_at,
    vip_days_left: Math.ceil(
      (new Date(vipSubscription.expires_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    )
  };
}

function getLast7DaysTimeline(events: any[]) {
  const timeline = [];
  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const dayEvents = events.filter(e =>
      e.created_at.startsWith(dateStr)
    );

    timeline.push({
      date: dateStr,
      views: dayEvents.filter(e => e.event_type === 'profile_view').length,
      favorites: dayEvents.filter(e => e.event_type === 'favorite_add').length
    });
  }

  return timeline;
}

function getTrafficSources(events: any[]) {
  const total = events.filter(e => e.event_type === 'profile_view').length;
  if (total === 0) return {};

  const sources: Record<string, number> = {};

  events.forEach(e => {
    if (e.event_type === 'profile_view') {
      const source = e.metadata?.source || 'direct';
      sources[source] = (sources[source] || 0) + 1;
    }
  });

  // Convert to percentages
  const percentages: Record<string, number> = {};
  Object.entries(sources).forEach(([source, count]) => {
    percentages[source] = Math.round((count / total) * 100);
  });

  return percentages;
}
```

---

## 10. Sécurité

### 10.1 Validation Paiement

**Admin-only** : Seuls les admins peuvent approuver/rejeter les paiements.

**Middleware** :

```typescript
// backend/src/middleware/auth.ts

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};
```

**Controller Validation** :

```typescript
// backend/src/controllers/adminVipController.ts

export const verifyPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { payment_reference, action, admin_notes } = req.body;
    const admin_id = req.user?.id;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    // Find subscription
    const { data: subscription, error: findError } = await supabase
      .from('employee_vip_subscriptions')
      .select('*')
      .eq('payment_reference', payment_reference)
      .single();

    if (findError || !subscription) {
      return res.status(404).json({ error: 'Payment reference not found' });
    }

    if (subscription.payment_verified) {
      return res.status(400).json({ error: 'Payment already verified' });
    }

    if (action === 'approve') {
      // Activate VIP
      const { error: updateError } = await supabase
        .from('employee_vip_subscriptions')
        .update({
          status: 'active',
          payment_verified: true,
          verified_by_admin_id: admin_id,
          verified_at: new Date().toISOString(),
          admin_notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.id);

      if (updateError) throw updateError;

      // Send notification to user
      await sendNotification({
        userId: subscription.purchased_by_user_id,
        type: 'vip_activated',
        title: 'VIP Boost Activated!',
        message: `Your VIP boost is now active for ${subscription.duration_days} days.`,
        link: `/vip/analytics/employee/${subscription.employee_id}`
      });

      res.json({ message: 'VIP activated successfully' });

    } else {
      // Reject payment
      const { error: updateError } = await supabase
        .from('employee_vip_subscriptions')
        .update({
          status: 'cancelled',
          payment_verified: false,
          verified_by_admin_id: admin_id,
          verified_at: new Date().toISOString(),
          admin_notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.id);

      if (updateError) throw updateError;

      // Send notification to user
      await sendNotification({
        userId: subscription.purchased_by_user_id,
        type: 'vip_rejected',
        title: 'Payment Rejected',
        message: `Your VIP payment was rejected. Reason: ${admin_notes || 'Invalid proof'}`,
        link: '/employee/dashboard'
      });

      res.json({ message: 'Payment rejected' });
    }

  } catch (error) {
    logger.error('Verify payment error:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
};
```

### 10.2 CSRF Protection

**Toutes les routes POST/PUT/DELETE** nécessitent CSRF token :

```typescript
router.post('/initiate-purchase', authenticateToken, csrfProtection, vipEmployeeController.initiatePurchase);
router.post('/upload-proof', authenticateToken, csrfProtection, vipEmployeeController.uploadPaymentProof);
router.post('/verify-payment', authenticateToken, requireAdmin, csrfProtection, adminVipController.verifyPayment);
```

### 10.3 Audit Trail

**Toutes les transactions VIP sont auditées** :

```sql
-- Chaque subscription a:
- purchased_by_user_id (qui a payé)
- purchased_by_type ('employee', 'manager', 'admin')
- verified_by_admin_id (qui a validé)
- verified_at (quand)
- admin_notes (notes admin)

-- Query audit trail:
SELECT
  s.payment_reference,
  s.created_at as purchase_date,
  s.amount_paid,
  s.status,
  buyer.pseudonym as purchased_by,
  s.purchased_by_type,
  admin.pseudonym as verified_by,
  s.verified_at,
  s.admin_notes
FROM employee_vip_subscriptions s
LEFT JOIN users buyer ON s.purchased_by_user_id = buyer.id
LEFT JOIN users admin ON s.verified_by_admin_id = admin.id
ORDER BY s.created_at DESC;
```

### 10.4 Rate Limiting

**Prévention abus** :

```typescript
// backend/src/middleware/rateLimiter.ts

export const vipPurchaseRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Max 5 VIP purchases per hour per user
  message: 'Too many VIP purchase attempts, please try again later',
  keyGenerator: (req: AuthRequest) => req.user?.id || req.ip
});

// Apply to routes
router.post('/initiate-purchase', authenticateToken, vipPurchaseRateLimiter, csrfProtection, vipEmployeeController.initiatePurchase);
```

---

## 11. Testing

### 11.1 Tests Backend

**Tests à créer** :

```typescript
// backend/src/controllers/__tests__/vipEmployeeController.test.ts

describe('VIP Employee Controller', () => {
  describe('POST /api/vip/employee/initiate-purchase', () => {
    it('should create pending subscription with valid data', async () => {
      const response = await request(app)
        .post('/api/vip/employee/initiate-purchase')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({
          employee_id: employee.id,
          duration_days: 30,
          payment_method: 'promptpay'
        });

      expect(response.status).toBe(200);
      expect(response.body.payment_reference).toMatch(/VIP-EMP-\d{8}-[A-Z0-9]{4}/);
      expect(response.body.amount).toBe(3200);
      expect(response.body.payment_details.method).toBe('promptpay');
    });

    it('should reject invalid duration', async () => {
      const response = await request(app)
        .post('/api/vip/employee/initiate-purchase')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({
          employee_id: employee.id,
          duration_days: 15, // Invalid
          payment_method: 'promptpay'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid duration');
    });

    it('should reject unauthorized purchase', async () => {
      const response = await request(app)
        .post('/api/vip/employee/initiate-purchase')
        .set('Authorization', `Bearer ${otherUserToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({
          employee_id: employee.id,
          duration_days: 30,
          payment_method: 'promptpay'
        });

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/vip/employee/:id/status', () => {
    it('should return VIP status for active subscription', async () => {
      // Create active VIP subscription
      await createVIPSubscription(employee.id, 'active');

      const response = await request(app)
        .get(`/api/vip/employee/${employee.id}/status`);

      expect(response.status).toBe(200);
      expect(response.body.is_vip).toBe(true);
      expect(response.body.days_left).toBeGreaterThan(0);
    });

    it('should return non-VIP for expired subscription', async () => {
      await createVIPSubscription(employee.id, 'expired');

      const response = await request(app)
        .get(`/api/vip/employee/${employee.id}/status`);

      expect(response.status).toBe(200);
      expect(response.body.is_vip).toBe(false);
    });
  });
});
```

### 11.2 Tests Frontend

**Component Tests** :

```typescript
// src/components/VIP/__tests__/VIPBadge.test.tsx

describe('VIPBadge', () => {
  it('renders employee VIP badge', () => {
    render(<VIPBadge type="employee" />);
    expect(screen.getByText('👑')).toBeInTheDocument();
    expect(screen.getByText('VIP')).toBeInTheDocument();
  });

  it('renders establishment featured badge', () => {
    render(<VIPBadge type="establishment" />);
    expect(screen.getByText('🌟')).toBeInTheDocument();
    expect(screen.getByText('FEATURED')).toBeInTheDocument();
  });

  it('shows expiry warning when less than 7 days left', () => {
    const expires = new Date();
    expires.setDate(expires.getDate() + 5);

    render(
      <VIPBadge
        type="employee"
        expiresAt={expires.toISOString()}
        showExpiry
      />
    );

    const expiry = screen.getByText(/5d/);
    expect(expiry).toHaveClass('expiring-soon');
  });
});

// src/components/VIP/__tests__/PurchaseVIPPage.test.tsx

describe('PurchaseVIPPage', () => {
  it('displays pricing options', () => {
    render(<PurchaseVIPPage entityType="employee" entityId="123" />);

    expect(screen.getByText('1,000฿')).toBeInTheDocument();
    expect(screen.getByText('3,200฿')).toBeInTheDocument();
    expect(screen.getByText('8,000฿')).toBeInTheDocument();
  });

  it('selects duration and proceeds to payment', async () => {
    render(<PurchaseVIPPage entityType="employee" entityId="123" />);

    fireEvent.click(screen.getByText('3,200฿').closest('button')!);
    fireEvent.click(screen.getByText('Continue to Payment'));

    await waitFor(() => {
      expect(screen.getByText('PROMPTPAY PAYMENT')).toBeInTheDocument();
    });
  });
});
```

### 11.3 Tests E2E

**Playwright Tests** :

```typescript
// e2e/vip.spec.ts

test.describe('VIP Purchase Flow', () => {
  test('employee can purchase VIP with PromptPay', async ({ page }) => {
    // Login as employee
    await loginAsEmployee(page);

    // Navigate to dashboard
    await page.goto('/employee/dashboard');

    // Click "Upgrade to VIP"
    await page.click('text=Upgrade to VIP Now');

    // Select 1 month
    await page.click('text=3,200฿');

    // Select PromptPay
    await page.click('text=PromptPay QR Code');

    // Continue
    await page.click('text=Continue to Payment');

    // Verify QR code displayed
    await expect(page.locator('text=SCAN THIS QR CODE')).toBeVisible();

    // Upload proof (mock file)
    await page.setInputFiles('input[type="file"]', 'test-proof.jpg');
    await page.click('text=I\'ve Paid - Upload Proof');

    // Verify pending state
    await expect(page.locator('text=PAYMENT PENDING VERIFICATION')).toBeVisible();
  });

  test('admin can verify payment', async ({ page }) => {
    // Login as admin
    await loginAsAdmin(page);

    // Navigate to admin VIP verification
    await page.goto('/admin/vip-verification');

    // Click approve on first pending
    await page.click('button:text("Approve & Activate VIP")');

    // Verify success
    await expect(page.locator('text=VIP activated successfully')).toBeVisible();
  });
});
```

---

## 📋 Résumé Final

### Ce qui a été documenté

✅ **1. Vue d'ensemble** - Business model B2B, 2 systèmes VIP
✅ **2. Business Model** - Revenus estimés, ROI
✅ **3. Architecture Technique** - DB (4 tables), API (20+ endpoints), Frontend (10+ composants)
✅ **4. Système de Paiement** - PromptPay + Cash (workflows complets)
✅ **5. Pricing** - Grilles tarifaires détaillées
✅ **6. UX Employée** - 8 étapes parcours complet
✅ **7. UX Établissement** - Featured homepage, maps, analytics
✅ **8. Intégration** - 7 composants à modifier (Header, EmployeeCard, SearchPage, Maps, etc.)
✅ **9. Analytics** - 5 events trackés, dashboard complet
✅ **10. Sécurité** - Admin validation, CSRF, rate limiting, audit trail
✅ **11. Testing** - Backend, Frontend, E2E tests

### Prochaine Étape

📄 **Document 2** : `VIP_IMPLEMENTATION_PLAN.md` - Plan d'implémentation détaillé 8 jours

---

**Auteur** : PattaMap Development Team
**Date** : Janvier 2025
**Version** : 1.0
