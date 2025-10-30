# 🛠️ FEATURES IMPLEMENTATION GUIDE - PattaMap

**Dernière mise à jour** : 5 octobre 2025
**Complément de** : `FEATURES_ROADMAP.md`

Ce document fournit les détails techniques d'implémentation pour chaque fonctionnalité à développer.

---

## 1️⃣ Multilingue (i18n) - 4 jours

### Architecture

```
src/
├── locales/
│   ├── fr.json          # Français (existant)
│   ├── en.json          # Anglais
│   ├── th.json          # Thaï
│   └── ru.json          # Russe
├── contexts/
│   └── LanguageContext.tsx
└── utils/
    └── i18n.ts
```

### Étape 1 : Installation (30min)

```bash
cd pattaya-directory
npm install react-i18next i18next i18next-browser-languagedetector
```

### Étape 2 : Configuration i18n (1h)

**Créer `src/utils/i18n.ts`** :
```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import fr from '../locales/fr.json';
import en from '../locales/en.json';
import th from '../locales/th.json';
import ru from '../locales/ru.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
      th: { translation: th },
      ru: { translation: ru }
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
```

### Étape 3 : Fichiers de traduction (2j)

**`src/locales/en.json`** :
```json
{
  "header": {
    "search": "Search",
    "addEmployee": "Add Employee",
    "addEstablishment": "Add Establishment",
    "login": "Login",
    "logout": "Logout",
    "admin": "Admin Panel"
  },
  "map": {
    "zones": {
      "soi6": "Soi 6",
      "walkingstreet": "Walking Street",
      "lkmetro": "LK Metro",
      "treetown": "Treetown"
    }
  },
  "search": {
    "filters": "Filters",
    "ageRange": "Age Range",
    "nationality": "Nationality",
    "zone": "Zone",
    "onlyVerified": "Verified profiles only"
  },
  "profile": {
    "verified": "Verified",
    "favorites": "Add to Favorites",
    "sendTip": "Send Tip",
    "writeReview": "Write a Review"
  }
}
```

**Répéter pour** : `fr.json`, `th.json`, `ru.json`

### Étape 4 : Wrapper App (15min)

**Modifier `src/index.tsx`** :
```typescript
import './utils/i18n'; // AVANT tout le reste
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

### Étape 5 : Sélecteur de langue dans Header (1h)

**Modifier `src/components/Layout/Header.tsx`** :
```typescript
import { useTranslation } from 'react-i18next';

const Header: React.FC = () => {
  const { t, i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
  };

  return (
    <header>
      {/* Existing code */}

      <div className="language-selector">
        <button onClick={() => changeLanguage('fr')}>🇫🇷</button>
        <button onClick={() => changeLanguage('en')}>🇬🇧</button>
        <button onClick={() => changeLanguage('th')}>🇹🇭</button>
        <button onClick={() => changeLanguage('ru')}>🇷🇺</button>
      </div>
    </header>
  );
};
```

### Étape 6 : Remplacer tous les textes hardcodés (1.5j)

**Avant** :
```typescript
<button>Ajouter aux Favoris</button>
```

**Après** :
```typescript
import { useTranslation } from 'react-i18next';

const Component = () => {
  const { t } = useTranslation();

  return <button>{t('profile.favorites')}</button>;
};
```

### Fichiers à modifier (~50 fichiers)
- ✅ Tous les composants dans `src/components/`
- ✅ `App.tsx`
- ✅ Messages d'erreur dans les hooks
- ✅ Placeholders des formulaires

### Tests

```typescript
// src/__tests__/i18n.test.ts
import i18n from '../utils/i18n';

test('translations load correctly', () => {
  i18n.changeLanguage('en');
  expect(i18n.t('header.search')).toBe('Search');

  i18n.changeLanguage('fr');
  expect(i18n.t('header.search')).toBe('Rechercher');
});
```

---

## 2️⃣ Système de Vérification - 2 jours

### Base de données

**Migration SQL** :
```sql
-- Ajouter colonnes à la table employees
ALTER TABLE employees
ADD COLUMN verified BOOLEAN DEFAULT FALSE,
ADD COLUMN verified_at TIMESTAMP,
ADD COLUMN verified_by UUID REFERENCES users(id);

-- Créer table pour documents de vérification
CREATE TABLE verification_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL, -- 'id_card', 'passport', 'work_permit'
  document_url TEXT NOT NULL, -- Cloudinary URL
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  uploaded_by UUID REFERENCES users(id),
  reviewed_by UUID REFERENCES users(id),
  review_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_verification_docs_employee ON verification_documents(employee_id);
CREATE INDEX idx_verification_docs_status ON verification_documents(status);
```

### Backend - Routes API

**Créer `backend/src/routes/verification.ts`** :
```typescript
import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import {
  uploadVerificationDocument,
  approveVerification,
  rejectVerification,
  getVerificationDocuments
} from '../controllers/verificationController';
import { uploadMiddleware } from '../middleware/upload';

const router = Router();

// User/Moderator uploads verification doc
router.post(
  '/upload/:employee_id',
  authenticateToken,
  uploadMiddleware.single('document'),
  uploadVerificationDocument
);

// Admin approves verification
router.post(
  '/approve/:employee_id',
  authenticateToken,
  requireRole(['admin']),
  approveVerification
);

// Admin rejects verification
router.post(
  '/reject/:employee_id',
  authenticateToken,
  requireRole(['admin']),
  rejectVerification
);

// Get verification documents for employee
router.get(
  '/:employee_id',
  authenticateToken,
  requireRole(['admin', 'moderator']),
  getVerificationDocuments
);

export default router;
```

### Backend - Controller

**Créer `backend/src/controllers/verificationController.ts`** :
```typescript
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { supabase } from '../config/supabase';
import { uploadToCloudinary } from '../utils/cloudinary';
import { logger } from '../utils/logger';

export const uploadVerificationDocument = async (req: AuthRequest, res: Response) => {
  try {
    const { employee_id } = req.params;
    const { document_type } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No document uploaded' });
    }

    // Upload to Cloudinary
    const uploadResult = await uploadToCloudinary(file.buffer, 'verification_docs');

    // Save to database
    const { data, error } = await supabase
      .from('verification_documents')
      .insert({
        employee_id,
        document_type,
        document_url: uploadResult.secure_url,
        uploaded_by: req.user?.id,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ document: data });
  } catch (error) {
    logger.error('Upload verification error:', error);
    res.status(500).json({ error: 'Failed to upload verification document' });
  }
};

export const approveVerification = async (req: AuthRequest, res: Response) => {
  try {
    const { employee_id } = req.params;
    const { review_notes } = req.body;

    // Update employee as verified
    const { error: employeeError } = await supabase
      .from('employees')
      .update({
        verified: true,
        verified_at: new Date().toISOString(),
        verified_by: req.user?.id
      })
      .eq('id', employee_id);

    if (employeeError) throw employeeError;

    // Update all pending docs to approved
    const { error: docsError } = await supabase
      .from('verification_documents')
      .update({
        status: 'approved',
        reviewed_by: req.user?.id,
        review_notes
      })
      .eq('employee_id', employee_id)
      .eq('status', 'pending');

    if (docsError) throw docsError;

    res.json({ message: 'Employee verified successfully' });
  } catch (error) {
    logger.error('Approve verification error:', error);
    res.status(500).json({ error: 'Failed to approve verification' });
  }
};
```

### Frontend - Badge vérifié

**Modifier `src/components/Bar/GirlProfile.tsx`** :
```typescript
interface Employee {
  // ... existing fields
  verified?: boolean;
  verified_at?: string;
}

const GirlProfile: React.FC<{ employee: Employee }> = ({ employee }) => {
  return (
    <div className="employee-profile">
      <h2>
        {employee.name}
        {employee.verified && (
          <span className="verified-badge" title="Verified Profile">
            ✓
          </span>
        )}
      </h2>
      {/* Rest of profile */}
    </div>
  );
};
```

**CSS pour badge** :
```css
.verified-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background: #1da1f2;
  color: white;
  border-radius: 50%;
  font-size: 12px;
  font-weight: bold;
  margin-left: 8px;
}
```

### Frontend - Filtre de recherche

**Modifier `src/components/Search/SearchFilters.tsx`** :
```typescript
const SearchFilters: React.FC = () => {
  const [onlyVerified, setOnlyVerified] = useState(false);

  return (
    <div className="search-filters">
      {/* Existing filters */}

      <label>
        <input
          type="checkbox"
          checked={onlyVerified}
          onChange={(e) => setOnlyVerified(e.target.checked)}
        />
        Profils vérifiés uniquement
      </label>
    </div>
  );
};
```

### Tests

```typescript
describe('Verification System', () => {
  it('should display verified badge for verified profiles', () => {
    const employee = { id: '1', name: 'Anna', verified: true };
    render(<GirlProfile employee={employee} />);

    expect(screen.getByTitle('Verified Profile')).toBeInTheDocument();
  });

  it('should filter only verified profiles when checkbox is checked', async () => {
    render(<SearchPage />);

    const checkbox = screen.getByLabelText('Profils vérifiés uniquement');
    fireEvent.click(checkbox);

    const results = await screen.findAllByTestId('employee-card');
    results.forEach(result => {
      expect(result).toHaveClass('verified');
    });
  });
});
```

---

## 3️⃣ Notifications Push (PWA) - 5 jours

### Étape 1 : Conversion en PWA (1j)

**Créer `public/manifest.json`** :
```json
{
  "name": "PattaMap - Pattaya Directory",
  "short_name": "PattaMap",
  "description": "Entertainment employee directory for Pattaya",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0a2e",
  "theme_color": "#ff00ff",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/logo192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/logo512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

**Modifier `public/index.html`** :
```html
<head>
  <!-- Existing tags -->
  <link rel="manifest" href="%PUBLIC_URL%/manifest.json" />
  <meta name="theme-color" content="#ff00ff" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
</head>
```

### Étape 2 : Firebase Setup (1h)

```bash
npm install firebase
```

**Créer projet Firebase** :
1. Console Firebase → Add Project
2. Settings → Cloud Messaging
3. Copier `vapidKey`

**Créer `src/config/firebase.ts`** :
```typescript
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);

export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();

    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: process.env.REACT_APP_FIREBASE_VAPID_KEY
      });

      return token;
    }
  } catch (error) {
    console.error('Notification permission error:', error);
  }
};
```

### Étape 3 : Service Worker (2h)

**Créer `public/firebase-messaging-sw.js`** :
```javascript
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('Background message:', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo192.png',
    badge: '/badge-72x72.png',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});
```

### Étape 4 : Backend - Notifications Table (1h)

**Migration SQL** :
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'favorite_active', 'new_review', 'new_employee', 'reply'
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB, -- Additional data (employee_id, establishment_id, etc.)
  read BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);

-- Table pour stocker les FCM tokens
CREATE TABLE fcm_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  device_info TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_used TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_fcm_tokens_user ON fcm_tokens(user_id);
```

### Étape 5 : Backend - Envoyer notifications (1.5j)

**Installer** :
```bash
cd backend
npm install firebase-admin
```

**Créer `backend/src/utils/notifications.ts`** :
```typescript
import admin from 'firebase-admin';
import { supabase } from '../config/supabase';
import { logger } from './logger';

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  })
});

export interface NotificationPayload {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export const sendNotification = async (payload: NotificationPayload) => {
  try {
    // 1. Save to database
    await supabase.from('notifications').insert({
      user_id: payload.userId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      data: payload.data,
      sent_at: new Date().toISOString()
    });

    // 2. Get user's FCM tokens
    const { data: tokens } = await supabase
      .from('fcm_tokens')
      .select('token')
      .eq('user_id', payload.userId);

    if (!tokens || tokens.length === 0) {
      logger.info('No FCM tokens found for user:', payload.userId);
      return;
    }

    // 3. Send push notifications via FCM
    const message = {
      notification: {
        title: payload.title,
        body: payload.body
      },
      data: payload.data || {},
      tokens: tokens.map(t => t.token)
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    logger.info('Notifications sent:', response.successCount);

  } catch (error) {
    logger.error('Send notification error:', error);
  }
};

// Helper: Send to all followers when favorite is active
export const notifyFavoriteActive = async (employeeId: string, employeeName: string) => {
  const { data: favorites } = await supabase
    .from('favorites')
    .select('user_id')
    .eq('employee_id', employeeId);

  if (!favorites) return;

  for (const fav of favorites) {
    await sendNotification({
      userId: fav.user_id,
      type: 'favorite_active',
      title: `${employeeName} is available!`,
      body: 'Your favorite is now working. Come visit!',
      data: {
        employee_id: employeeId,
        url: `/profile/${employeeId}`
      }
    });
  }
};
```

### Frontend - Demander permission (30min)

**Créer `src/components/Common/NotificationPermission.tsx`** :
```typescript
import React, { useEffect, useState } from 'react';
import { requestNotificationPermission } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useSecureFetch } from '../../hooks/useSecureFetch';

const NotificationPermission: React.FC = () => {
  const { user } = useAuth();
  const { secureFetch } = useSecureFetch();
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (user && Notification.permission === 'default') {
      setShowPrompt(true);
    }
  }, [user]);

  const handleEnable = async () => {
    const token = await requestNotificationPermission();

    if (token) {
      // Save token to backend
      await secureFetch(`${process.env.REACT_APP_API_URL}/api/notifications/register-device`, {
        method: 'POST',
        body: JSON.stringify({ fcm_token: token })
      });

      setShowPrompt(false);
    }
  };

  if (!showPrompt) return null;

  return (
    <div className="notification-prompt">
      <p>Enable notifications to get updates about your favorites!</p>
      <button onClick={handleEnable}>Enable Notifications</button>
      <button onClick={() => setShowPrompt(false)}>Not now</button>
    </div>
  );
};

export default NotificationPermission;
```

### Tests

```typescript
describe('Notifications', () => {
  it('should request permission when user is logged in', () => {
    const mockUser = { id: '1', pseudonym: 'Test' };
    render(<NotificationPermission />, { user: mockUser });

    expect(screen.getByText(/Enable notifications/i)).toBeInTheDocument();
  });

  it('should save FCM token after permission granted', async () => {
    mockRequestPermission.mockResolvedValue('fcm_token_123');

    render(<NotificationPermission />);
    fireEvent.click(screen.getByText('Enable Notifications'));

    await waitFor(() => {
      expect(mockSecureFetch).toHaveBeenCalledWith(
        expect.stringContaining('/register-device'),
        expect.objectContaining({
          body: JSON.stringify({ fcm_token: 'fcm_token_123' })
        })
      );
    });
  });
});
```

---

## 4️⃣ Historique de Visites - 2 jours

### Base de données

**Migration SQL** :
```sql
CREATE TABLE visit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  establishment_id UUID REFERENCES establishments(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL, -- Optional
  visit_date DATE NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  private_notes TEXT, -- Only visible to the user
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_visit_logs_user ON visit_logs(user_id);
CREATE INDEX idx_visit_logs_establishment ON visit_logs(establishment_id);
CREATE INDEX idx_visit_logs_date ON visit_logs(visit_date DESC);

-- Constraint: One visit per user per establishment per day
CREATE UNIQUE INDEX idx_visit_logs_unique
ON visit_logs(user_id, establishment_id, visit_date);
```

### Backend - Routes

**Créer `backend/src/routes/visits.ts`** :
```typescript
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  createVisit,
  getUserVisits,
  updateVisit,
  deleteVisit,
  getVisitStats
} from '../controllers/visitController';

const router = Router();

router.post('/', authenticateToken, createVisit);
router.get('/', authenticateToken, getUserVisits);
router.put('/:id', authenticateToken, updateVisit);
router.delete('/:id', authenticateToken, deleteVisit);
router.get('/stats', authenticateToken, getVisitStats);

export default router;
```

### Backend - Controller

**Créer `backend/src/controllers/visitController.ts`** :
```typescript
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

export const createVisit = async (req: AuthRequest, res: Response) => {
  try {
    const { establishment_id, employee_id, visit_date, rating, private_notes } = req.body;
    const user_id = req.user?.id;

    const { data, error } = await supabase
      .from('visit_logs')
      .insert({
        user_id,
        establishment_id,
        employee_id,
        visit_date,
        rating,
        private_notes
      })
      .select(`
        *,
        establishment:establishments(id, name, zone, address),
        employee:employees(id, name, nickname, photos)
      `)
      .single();

    if (error) {
      if (error.code === '23505') { // Unique violation
        return res.status(400).json({ error: 'Visit already logged for this date' });
      }
      throw error;
    }

    res.json({ visit: data });
  } catch (error) {
    logger.error('Create visit error:', error);
    res.status(500).json({ error: 'Failed to create visit log' });
  }
};

export const getUserVisits = async (req: AuthRequest, res: Response) => {
  try {
    const user_id = req.user?.id;
    const { from_date, to_date, establishment_id, sort = 'visit_date', order = 'desc' } = req.query;

    let query = supabase
      .from('visit_logs')
      .select(`
        *,
        establishment:establishments(id, name, zone, address, logo_url),
        employee:employees(id, name, nickname, photos)
      `)
      .eq('user_id', user_id);

    if (from_date) query = query.gte('visit_date', from_date);
    if (to_date) query = query.lte('visit_date', to_date);
    if (establishment_id) query = query.eq('establishment_id', establishment_id);

    query = query.order(String(sort), { ascending: order === 'asc' });

    const { data, error } = await query;

    if (error) throw error;

    res.json({ visits: data });
  } catch (error) {
    logger.error('Get visits error:', error);
    res.status(500).json({ error: 'Failed to fetch visits' });
  }
};

export const getVisitStats = async (req: AuthRequest, res: Response) => {
  try {
    const user_id = req.user?.id;

    const { data: visits, error } = await supabase
      .from('visit_logs')
      .select('*')
      .eq('user_id', user_id);

    if (error) throw error;

    const stats = {
      totalVisits: visits.length,
      uniqueEstablishments: new Set(visits.map(v => v.establishment_id)).size,
      averageRating: visits
        .filter(v => v.rating)
        .reduce((sum, v) => sum + v.rating, 0) / visits.filter(v => v.rating).length || 0,
      mostVisitedZone: getMostFrequent(visits.map(v => v.establishment?.zone)),
      visitsByMonth: groupByMonth(visits)
    };

    res.json({ stats });
  } catch (error) {
    logger.error('Get visit stats error:', error);
    res.status(500).json({ error: 'Failed to fetch visit statistics' });
  }
};
```

### Frontend - UserDashboard

**Modifier `src/components/User/UserDashboard.tsx`** :
```typescript
import React, { useState, useEffect } from 'react';
import { useSecureFetch } from '../../hooks/useSecureFetch';

interface Visit {
  id: string;
  visit_date: string;
  rating?: number;
  private_notes?: string;
  establishment: {
    id: string;
    name: string;
    zone: string;
    logo_url?: string;
  };
  employee?: {
    id: string;
    name: string;
    photos: string[];
  };
}

const VisitsTimeline: React.FC = () => {
  const { secureFetch } = useSecureFetch();
  const [visits, setVisits] = useState<Visit[]>([]);

  useEffect(() => {
    fetchVisits();
  }, []);

  const fetchVisits = async () => {
    const response = await secureFetch(`${process.env.REACT_APP_API_URL}/api/visits`);
    const data = await response.json();
    setVisits(data.visits);
  };

  return (
    <div className="visits-timeline">
      <h2>My Visit History</h2>

      {visits.map(visit => (
        <div key={visit.id} className="visit-card">
          <div className="visit-date">{new Date(visit.visit_date).toLocaleDateString()}</div>

          <div className="visit-establishment">
            {visit.establishment.logo_url && (
              <img src={visit.establishment.logo_url} alt={visit.establishment.name} />
            )}
            <h3>{visit.establishment.name}</h3>
            <span className="zone-badge">{visit.establishment.zone}</span>
          </div>

          {visit.rating && (
            <div className="visit-rating">
              {'⭐'.repeat(visit.rating)}
            </div>
          )}

          {visit.private_notes && (
            <div className="visit-notes">
              <p>{visit.private_notes}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
```

### Frontend - Bouton "Mark as Visited"

**Modifier `src/components/Bar/BarDetailPage.tsx`** :
```typescript
const BarDetailPage: React.FC = () => {
  const { id } = useParams();
  const { secureFetch } = useSecureFetch();
  const [showVisitModal, setShowVisitModal] = useState(false);

  const markAsVisited = async (visitData: any) => {
    await secureFetch(`${process.env.REACT_APP_API_URL}/api/visits`, {
      method: 'POST',
      body: JSON.stringify({
        establishment_id: id,
        visit_date: visitData.date,
        rating: visitData.rating,
        private_notes: visitData.notes
      })
    });

    setShowVisitModal(false);
    alert('Visit logged successfully!');
  };

  return (
    <div className="bar-detail">
      {/* Existing content */}

      <button onClick={() => setShowVisitModal(true)}>
        Mark as Visited
      </button>

      {showVisitModal && (
        <VisitModal
          onSubmit={markAsVisited}
          onClose={() => setShowVisitModal(false)}
        />
      )}
    </div>
  );
};
```

---

## 5️⃣ Mode Hors Ligne - 3 jours

### Étape 1 : Service Worker avec Workbox (1j)

**Installer** :
```bash
npm install workbox-webpack-plugin
```

**Créer `src/service-worker.js`** :
```javascript
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

// Precache all static assets
precacheAndRoute(self.__WB_MANIFEST);

// Cache API responses
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/establishments'),
  new StaleWhileRevalidate({
    cacheName: 'api-establishments',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 24 * 60 * 60 // 24 hours
      })
    ]
  })
);

registerRoute(
  ({ url }) => url.pathname.startsWith('/api/employees'),
  new StaleWhileRevalidate({
    cacheName: 'api-employees',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 24 * 60 * 60
      })
    ]
  })
);

// Cache images from Cloudinary
registerRoute(
  ({ url }) => url.hostname === 'res.cloudinary.com',
  new CacheFirst({
    cacheName: 'cloudinary-images',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 500,
        maxAgeSeconds: 7 * 24 * 60 * 60 // 7 days
      })
    ]
  })
);

// Network first for user-specific data
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/favorites'),
  new NetworkFirst({
    cacheName: 'api-user-data',
    networkTimeoutSeconds: 3
  })
);

// Offline page fallback
const OFFLINE_PAGE = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('offline').then((cache) => cache.add(OFFLINE_PAGE))
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(OFFLINE_PAGE);
      })
    );
  }
});
```

### Étape 2 : Page Offline (1h)

**Créer `public/offline.html`** :
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PattaMap - Offline</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #0a0a2e, #16213e);
      color: white;
    }
    h1 { font-size: 3rem; margin: 0; }
    p { font-size: 1.2rem; margin: 20px 0; }
    button {
      padding: 12px 24px;
      font-size: 1rem;
      background: #ff00ff;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <h1>📡 No Connection</h1>
  <p>You're offline, but some content is still available.</p>
  <button onclick="window.location.reload()">Try Again</button>
</body>
</html>
```

### Étape 3 : Enregistrer Service Worker (30min)

**Modifier `src/index.tsx`** :
```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker
serviceWorkerRegistration.register({
  onUpdate: (registration) => {
    alert('New version available! Please refresh.');
  },
  onSuccess: (registration) => {
    console.log('Service Worker registered:', registration);
  }
});
```

**Créer `src/serviceWorkerRegistration.ts`** :
```typescript
export function register(config?: {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
}) {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`;

      navigator.serviceWorker
        .register(swUrl)
        .then((registration) => {
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    config?.onUpdate?.(registration);
                  } else {
                    config?.onSuccess?.(registration);
                  }
                }
              };
            }
          };
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    });
  }
}
```

### Étape 4 : Indicateur Offline (1h)

**Créer `src/components/Common/OfflineIndicator.tsx`** :
```typescript
import React, { useState, useEffect } from 'react';
import './OfflineIndicator.css';

const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="offline-indicator">
      <span className="offline-icon">📡</span>
      <span className="offline-text">Offline Mode - Some features limited</span>
    </div>
  );
};

export default OfflineIndicator;
```

**CSS** :
```css
.offline-indicator {
  position: fixed;
  top: 60px;
  left: 0;
  right: 0;
  background: #ff6b6b;
  color: white;
  padding: 12px;
  text-align: center;
  z-index: 9999;
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from { transform: translateY(-100%); }
  to { transform: translateY(0); }
}
```

### Étape 5 : Sync Queue pour actions (1.5j)

**Créer `src/utils/syncQueue.ts`** :
```typescript
interface QueuedAction {
  id: string;
  type: 'favorite' | 'comment' | 'visit';
  endpoint: string;
  method: string;
  body: any;
  timestamp: number;
}

const QUEUE_KEY = 'pattamap_sync_queue';

export const addToSyncQueue = (action: Omit<QueuedAction, 'id' | 'timestamp'>) => {
  const queue = getSyncQueue();
  const queuedAction: QueuedAction = {
    ...action,
    id: crypto.randomUUID(),
    timestamp: Date.now()
  };

  queue.push(queuedAction);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
};

export const getSyncQueue = (): QueuedAction[] => {
  const stored = localStorage.getItem(QUEUE_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const processSyncQueue = async () => {
  const queue = getSyncQueue();

  for (const action of queue) {
    try {
      await fetch(`${process.env.REACT_APP_API_URL}${action.endpoint}`, {
        method: action.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.body),
        credentials: 'include'
      });

      // Remove from queue on success
      removeFromSyncQueue(action.id);
    } catch (error) {
      console.error('Sync failed for action:', action.id, error);
    }
  }
};

export const removeFromSyncQueue = (actionId: string) => {
  const queue = getSyncQueue();
  const filtered = queue.filter(a => a.id !== actionId);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
};

// Auto-sync when online
window.addEventListener('online', () => {
  processSyncQueue();
});
```

---

## 6️⃣ Système de Tips - 7 jours

### Étape 1 : Stripe Connect Setup (2j)

**Installer** :
```bash
cd backend
npm install stripe
```

**Backend - Configuration** :
```typescript
// backend/src/config/stripe.ts
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
});
```

**Migration SQL** :
```sql
-- Add Stripe account ID to employees
ALTER TABLE employees
ADD COLUMN stripe_account_id VARCHAR(255),
ADD COLUMN stripe_onboarding_completed BOOLEAN DEFAULT FALSE;

-- Table for tip transactions
CREATE TABLE tips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  to_employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- Amount in cents
  currency VARCHAR(3) DEFAULT 'THB',
  stripe_payment_intent_id VARCHAR(255) UNIQUE,
  stripe_transfer_id VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
  platform_fee INTEGER, -- 5% commission in cents
  message TEXT, -- Optional message with tip
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tips_from_user ON tips(from_user_id);
CREATE INDEX idx_tips_to_employee ON tips(to_employee_id);
CREATE INDEX idx_tips_status ON tips(status);
```

### Étape 2 : Stripe Connect Onboarding (2j)

**Backend - Routes** :
```typescript
// backend/src/routes/stripe.ts
import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import {
  createConnectAccount,
  getAccountStatus,
  createAccountLink,
  handleWebhook
} from '../controllers/stripeController';

const router = Router();

// Employee creates Stripe Connect account
router.post('/connect/account', authenticateToken, createConnectAccount);

// Get onboarding status
router.get('/connect/status/:employee_id', authenticateToken, getAccountStatus);

// Create onboarding link
router.post('/connect/onboarding-link', authenticateToken, createAccountLink);

// Stripe webhook (NO AUTH - Stripe signs the request)
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

export default router;
```

**Backend - Controller** :
```typescript
// backend/src/controllers/stripeController.ts
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { stripe } from '../config/stripe';
import { supabase } from '../config/supabase';

export const createConnectAccount = async (req: AuthRequest, res: Response) => {
  try {
    const { employee_id, email } = req.body;

    // Create Stripe Connect account
    const account = await stripe.accounts.create({
      type: 'express',
      email,
      capabilities: {
        transfers: { requested: true }
      },
      business_type: 'individual',
      country: 'TH'
    });

    // Save to database
    await supabase
      .from('employees')
      .update({
        stripe_account_id: account.id,
        stripe_onboarding_completed: false
      })
      .eq('id', employee_id);

    res.json({ account_id: account.id });
  } catch (error) {
    console.error('Create Connect account error:', error);
    res.status(500).json({ error: 'Failed to create Stripe account' });
  }
};

export const createAccountLink = async (req: AuthRequest, res: Response) => {
  try {
    const { account_id } = req.body;

    const accountLink = await stripe.accountLinks.create({
      account: account_id,
      refresh_url: `${process.env.FRONTEND_URL}/stripe/refresh`,
      return_url: `${process.env.FRONTEND_URL}/stripe/success`,
      type: 'account_onboarding'
    });

    res.json({ url: accountLink.url });
  } catch (error) {
    console.error('Create account link error:', error);
    res.status(500).json({ error: 'Failed to create onboarding link' });
  }
};
```

### Étape 3 : Send Tip (2j)

**Backend - Routes** :
```typescript
// backend/src/routes/tips.ts
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { sendTip, getTipHistory, getEmployeeTipStats } from '../controllers/tipController';

const router = Router();

router.post('/', authenticateToken, sendTip);
router.get('/history', authenticateToken, getTipHistory);
router.get('/stats/:employee_id', getEmployeeTipStats);

export default router;
```

**Backend - Controller** :
```typescript
// backend/src/controllers/tipController.ts
export const sendTip = async (req: AuthRequest, res: Response) => {
  try {
    const { employee_id, amount, message } = req.body; // amount in THB
    const from_user_id = req.user?.id;

    // Get employee's Stripe account
    const { data: employee } = await supabase
      .from('employees')
      .select('stripe_account_id, stripe_onboarding_completed')
      .eq('id', employee_id)
      .single();

    if (!employee?.stripe_onboarding_completed) {
      return res.status(400).json({ error: 'Employee has not completed Stripe onboarding' });
    }

    const amountInCents = Math.round(amount * 100); // Convert THB to cents
    const platformFee = Math.round(amountInCents * 0.05); // 5% commission

    // Create Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'thb',
      application_fee_amount: platformFee,
      transfer_data: {
        destination: employee.stripe_account_id
      },
      metadata: {
        employee_id,
        from_user_id: from_user_id!,
        message
      }
    });

    // Save to database
    const { data: tip } = await supabase
      .from('tips')
      .insert({
        from_user_id,
        to_employee_id: employee_id,
        amount: amountInCents,
        platform_fee: platformFee,
        stripe_payment_intent_id: paymentIntent.id,
        message,
        status: 'pending'
      })
      .select()
      .single();

    res.json({
      client_secret: paymentIntent.client_secret,
      tip
    });
  } catch (error) {
    console.error('Send tip error:', error);
    res.status(500).json({ error: 'Failed to send tip' });
  }
};
```

### Étape 4 : Frontend - Tip UI (1j)

**Créer `src/components/Bar/TipModal.tsx`** :
```typescript
import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY!);

interface TipModalProps {
  employeeId: string;
  employeeName: string;
  onClose: () => void;
}

const TipForm: React.FC<TipModalProps> = ({ employeeId, employeeName, onClose }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { secureFetch } = useSecureFetch();

  const [amount, setAmount] = useState(100);
  const [message, setMessage] = useState('');
  const [processing, setProcessing] = useState(false);

  const predefinedAmounts = [100, 200, 500, 1000];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);

    try {
      // Create tip on backend
      const response = await secureFetch(`${process.env.REACT_APP_API_URL}/api/tips`, {
        method: 'POST',
        body: JSON.stringify({ employee_id: employeeId, amount, message })
      });

      const { client_secret } = await response.json();

      // Confirm payment
      const { error, paymentIntent } = await stripe.confirmCardPayment(client_secret, {
        payment_method: {
          card: elements.getElement(CardElement)!
        }
      });

      if (error) {
        alert(error.message);
      } else if (paymentIntent.status === 'succeeded') {
        alert(`Tip of ${amount}฿ sent to ${employeeName}!`);
        onClose();
      }
    } catch (error) {
      alert('Failed to send tip');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="tip-form">
      <h2>Send Tip to {employeeName}</h2>

      <div className="amount-selector">
        {predefinedAmounts.map(amt => (
          <button
            key={amt}
            type="button"
            className={amount === amt ? 'active' : ''}
            onClick={() => setAmount(amt)}
          >
            {amt}฿
          </button>
        ))}
      </div>

      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(Number(e.target.value))}
        placeholder="Custom amount"
        min="50"
      />

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Optional message..."
        maxLength={200}
      />

      <CardElement options={{ style: { base: { fontSize: '16px' } } }} />

      <button type="submit" disabled={!stripe || processing}>
        {processing ? 'Processing...' : `Send ${amount}฿`}
      </button>

      <button type="button" onClick={onClose}>Cancel</button>

      <p className="fee-notice">Platform fee: 5% ({Math.round(amount * 0.05)}฿)</p>
    </form>
  );
};

const TipModal: React.FC<TipModalProps> = (props) => (
  <Elements stripe={stripePromise}>
    <TipForm {...props} />
  </Elements>
);

export default TipModal;
```

---

## 7️⃣ Gamification - 4 jours

### Base de données

**Migration SQL** :
```sql
-- User achievements table
CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  achievement_type VARCHAR(50) NOT NULL,
  achievement_name VARCHAR(100) NOT NULL,
  achievement_icon VARCHAR(10),
  points INTEGER DEFAULT 0,
  unlocked_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_achievements_user ON user_achievements(user_id);
CREATE INDEX idx_achievements_type ON user_achievements(achievement_type);

-- User levels and points
ALTER TABLE users
ADD COLUMN total_points INTEGER DEFAULT 0,
ADD COLUMN level INTEGER DEFAULT 1,
ADD COLUMN level_name VARCHAR(50) DEFAULT 'Bronze';

-- Points history (for transparency)
CREATE TABLE points_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL, -- 'review_created', 'photo_added', etc.
  points_earned INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_points_history_user ON points_history(user_id);
```

### Backend - Points System

**Créer `backend/src/utils/gamification.ts`** :
```typescript
import { supabase } from '../config/supabase';
import { logger } from './logger';

const POINT_VALUES = {
  review_created: 10,
  photo_added: 5,
  profile_created: 50,
  visit_logged: 20,
  friend_invited: 100
};

const LEVEL_THRESHOLDS = [
  { level: 1, name: 'Bronze', min: 0, max: 100 },
  { level: 2, name: 'Silver', min: 100, max: 500 },
  { level: 3, name: 'Gold', min: 500, max: 2000 },
  { level: 4, name: 'Diamond', min: 2000, max: 5000 },
  { level: 5, name: 'VIP', min: 5000, max: Infinity }
];

export const awardPoints = async (
  userId: string,
  actionType: keyof typeof POINT_VALUES,
  description?: string
) => {
  const points = POINT_VALUES[actionType];

  try {
    // 1. Add to points history
    await supabase.from('points_history').insert({
      user_id: userId,
      action_type: actionType,
      points_earned: points,
      description
    });

    // 2. Update user total points
    const { data: user } = await supabase
      .from('users')
      .select('total_points')
      .eq('id', userId)
      .single();

    const newTotal = (user?.total_points || 0) + points;

    // 3. Calculate new level
    const newLevel = LEVEL_THRESHOLDS.find(
      l => newTotal >= l.min && newTotal < l.max
    );

    await supabase
      .from('users')
      .update({
        total_points: newTotal,
        level: newLevel?.level,
        level_name: newLevel?.name
      })
      .eq('id', userId);

    // 4. Check for achievement unlocks
    await checkAchievements(userId);

    logger.info(`Awarded ${points} points to user ${userId} for ${actionType}`);
  } catch (error) {
    logger.error('Award points error:', error);
  }
};

const checkAchievements = async (userId: string) => {
  // Get user stats
  const { data: reviews } = await supabase
    .from('comments')
    .select('id')
    .eq('user_id', userId);

  const { data: visits } = await supabase
    .from('visit_logs')
    .select('id')
    .eq('user_id', userId);

  // Achievement: Explorer (10 visits)
  if (visits && visits.length >= 10) {
    await unlockAchievement(userId, 'explorer', 'Explorer', '🌟', 100);
  }

  // Achievement: Critic (20 reviews)
  if (reviews && reviews.length >= 20) {
    await unlockAchievement(userId, 'critic', 'Critic', '📝', 150);
  }
};

const unlockAchievement = async (
  userId: string,
  type: string,
  name: string,
  icon: string,
  bonusPoints: number
) => {
  // Check if already unlocked
  const { data: existing } = await supabase
    .from('user_achievements')
    .select('id')
    .eq('user_id', userId)
    .eq('achievement_type', type)
    .single();

  if (existing) return;

  // Unlock achievement
  await supabase.from('user_achievements').insert({
    user_id: userId,
    achievement_type: type,
    achievement_name: name,
    achievement_icon: icon,
    points: bonusPoints
  });

  // Award bonus points
  await awardPoints(userId, 'review_created', `Achievement unlocked: ${name}`);
};
```

### Backend - Integrate with existing actions

**Modifier `backend/src/controllers/commentController.ts`** :
```typescript
import { awardPoints } from '../utils/gamification';

export const createComment = async (req: AuthRequest, res: Response) => {
  try {
    // ... existing code to create comment ...

    // Award points
    await awardPoints(req.user!.id, 'review_created', `Review for employee ${employee_id}`);

    res.json({ comment: data });
  } catch (error) {
    // ... error handling ...
  }
};
```

### Frontend - Level Badge

**Créer `src/components/Common/LevelBadge.tsx`** :
```typescript
import React from 'react';
import './LevelBadge.css';

interface LevelBadgeProps {
  level: number;
  levelName: string;
  points: number;
}

const LevelBadge: React.FC<LevelBadgeProps> = ({ level, levelName, points }) => {
  const getIcon = () => {
    switch (levelName) {
      case 'Bronze': return '🥉';
      case 'Silver': return '🥈';
      case 'Gold': return '🥇';
      case 'Diamond': return '💎';
      case 'VIP': return '👑';
      default: return '⭐';
    }
  };

  return (
    <div className={`level-badge level-${levelName.toLowerCase()}`}>
      <span className="level-icon">{getIcon()}</span>
      <div className="level-info">
        <span className="level-name">{levelName}</span>
        <span className="level-points">{points} pts</span>
      </div>
    </div>
  );
};

export default LevelBadge;
```

### Frontend - Achievements Page

**Créer `src/components/User/AchievementsPage.tsx`** :
```typescript
import React, { useEffect, useState } from 'react';
import { useSecureFetch } from '../../hooks/useSecureFetch';

const AchievementsPage: React.FC = () => {
  const { secureFetch } = useSecureFetch();
  const [achievements, setAchievements] = useState([]);
  const [stats, setStats] = useState({ totalPoints: 0, level: 1, levelName: 'Bronze' });

  useEffect(() => {
    fetchAchievements();
  }, []);

  const fetchAchievements = async () => {
    const response = await secureFetch(`${process.env.REACT_APP_API_URL}/api/achievements`);
    const data = await response.json();

    setAchievements(data.achievements);
    setStats(data.stats);
  };

  const allAchievements = [
    { type: 'explorer', name: 'Explorer', icon: '🌟', requirement: '10 visits' },
    { type: 'critic', name: 'Critic', icon: '📝', requirement: '20 reviews' },
    { type: 'photographer', name: 'Photographer', icon: '📸', requirement: '50 photos' },
    { type: 'ambassador', name: 'Ambassador', icon: '🏆', requirement: '10 friends invited' }
  ];

  return (
    <div className="achievements-page">
      <h1>My Achievements</h1>

      <div className="current-level">
        <LevelBadge {...stats} />
        <p>Next level in {getNextLevelPoints(stats.level) - stats.totalPoints} points</p>
      </div>

      <div className="achievements-grid">
        {allAchievements.map(ach => {
          const unlocked = achievements.some(a => a.achievement_type === ach.type);

          return (
            <div key={ach.type} className={`achievement-card ${unlocked ? 'unlocked' : 'locked'}`}>
              <span className="achievement-icon">{ach.icon}</span>
              <h3>{ach.name}</h3>
              <p>{ach.requirement}</p>
              {unlocked && <span className="unlocked-badge">✓ Unlocked</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
};
```

---

## 8️⃣ Dark Mode - 2 jours

### Étape 1 : Theme Context (1h)

**Créer `src/contexts/ThemeContext.tsx`** :
```typescript
import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    // Check localStorage
    const stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') return stored;

    // Check system preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }

    return 'dark'; // Default to dark for nightlife app
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
```

### Étape 2 : CSS Variables (3h)

**Modifier `src/styles/nightlife-theme.css`** :
```css
:root {
  /* Dark theme (default) */
  --bg-primary: #0a0a2e;
  --bg-secondary: #16213e;
  --bg-tertiary: #240046;
  --text-primary: #ffffff;
  --text-secondary: #b8b8b8;
  --accent-primary: #ff00ff;
  --accent-secondary: #00ffff;
  --border-color: rgba(255, 255, 255, 0.1);
  --shadow: rgba(0, 0, 0, 0.5);
}

[data-theme="light"] {
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --bg-tertiary: #e8e8e8;
  --text-primary: #000000;
  --text-secondary: #666666;
  --accent-primary: #d946ef;
  --accent-secondary: #0891b2;
  --border-color: rgba(0, 0, 0, 0.1);
  --shadow: rgba(0, 0, 0, 0.15);
}

/* Apply variables to components */
body {
  background: var(--bg-primary);
  color: var(--text-primary);
}

.card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  box-shadow: 0 4px 6px var(--shadow);
}

button.primary {
  background: var(--accent-primary);
  color: white;
}

/* ... apply to all components ... */
```

### Étape 3 : Toggle Button (1h)

**Créer `src/components/Layout/ThemeToggle.tsx`** :
```typescript
import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import './ThemeToggle.css';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
};

export default ThemeToggle;
```

**CSS** :
```css
.theme-toggle {
  background: transparent;
  border: 2px solid var(--border-color);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.theme-toggle:hover {
  background: var(--bg-secondary);
  transform: rotate(20deg);
}
```

### Étape 4 : Intégrer dans Header (30min)

**Modifier `src/components/Layout/Header.tsx`** :
```typescript
import ThemeToggle from './ThemeToggle';

const Header: React.FC = () => {
  return (
    <header className="header">
      {/* Existing nav items */}

      <div className="header-actions">
        <ThemeToggle />
        {/* Other buttons */}
      </div>
    </header>
  );
};
```

### Étape 5 : Wrapper App (15min)

**Modifier `src/App.tsx`** :
```typescript
import { ThemeProvider } from './contexts/ThemeContext';

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CSRFProvider>
          <ModalProvider>
            <AppContent />
          </ModalProvider>
        </CSRFProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};
```

---

## 9️⃣ Reviews Améliorées - 3 jours

### A. Photos dans les avis (1j)

**Migration SQL** :
```sql
ALTER TABLE comments
ADD COLUMN photos TEXT[]; -- Array of Cloudinary URLs
```

**Backend - Upload photo avec avis** :
```typescript
// Modifier backend/src/controllers/commentController.ts
import { uploadToCloudinary } from '../utils/cloudinary';

export const createComment = async (req: AuthRequest, res: Response) => {
  try {
    const { employee_id, content, rating } = req.body;
    const files = req.files as Express.Multer.File[]; // Support multiple files

    let photoUrls: string[] = [];

    if (files && files.length > 0) {
      // Upload to Cloudinary (max 3 photos)
      const uploads = files.slice(0, 3).map(file =>
        uploadToCloudinary(file.buffer, 'review_photos')
      );

      const results = await Promise.all(uploads);
      photoUrls = results.map(r => r.secure_url);
    }

    const { data, error } = await supabase
      .from('comments')
      .insert({
        employee_id,
        user_id: req.user?.id,
        content,
        rating,
        photos: photoUrls,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;

    // Award points (with bonus for photos)
    await awardPoints(req.user!.id, 'review_created');
    if (photoUrls.length > 0) {
      await awardPoints(req.user!.id, 'photo_added');
    }

    res.json({ comment: data });
  } catch (error) {
    logger.error('Create comment error:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
};
```

**Frontend - Upload photos** :
```typescript
// Modifier src/components/Review/ReviewForm.tsx
const [photos, setPhotos] = useState<File[]>([]);

const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  if (e.target.files) {
    const filesArray = Array.from(e.target.files).slice(0, 3);
    setPhotos(filesArray);
  }
};

const handleSubmit = async () => {
  const formData = new FormData();
  formData.append('employee_id', employeeId);
  formData.append('content', content);
  formData.append('rating', String(rating));

  photos.forEach(photo => {
    formData.append('photos', photo);
  });

  await secureFetch(`${process.env.REACT_APP_API_URL}/api/comments`, {
    method: 'POST',
    body: formData,
    headers: {} // Don't set Content-Type, browser will set multipart/form-data
  });
};

return (
  <form onSubmit={handleSubmit}>
    {/* Existing fields */}

    <div className="photo-upload">
      <label>Add Photos (max 3)</label>
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={handlePhotoChange}
      />

      <div className="photo-previews">
        {photos.map((photo, i) => (
          <img key={i} src={URL.createObjectURL(photo)} alt={`Preview ${i + 1}`} />
        ))}
      </div>
    </div>
  </form>
);
```

### B. Vote utile/inutile (1j)

**Migration SQL** :
```sql
CREATE TABLE comment_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  vote_type VARCHAR(10) NOT NULL CHECK (vote_type IN ('helpful', 'not_helpful')),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

CREATE INDEX idx_comment_votes_comment ON comment_votes(comment_id);
CREATE INDEX idx_comment_votes_user ON comment_votes(user_id);

ALTER TABLE comments
ADD COLUMN helpful_count INTEGER DEFAULT 0,
ADD COLUMN not_helpful_count INTEGER DEFAULT 0;
```

**Backend - Routes** :
```typescript
// backend/src/routes/comments.ts
router.post('/:comment_id/vote', authenticateToken, voteComment);
```

**Backend - Controller** :
```typescript
export const voteComment = async (req: AuthRequest, res: Response) => {
  try {
    const { comment_id } = req.params;
    const { vote_type } = req.body; // 'helpful' or 'not_helpful'
    const user_id = req.user?.id;

    // Upsert vote
    const { error: voteError } = await supabase
      .from('comment_votes')
      .upsert({
        comment_id,
        user_id,
        vote_type
      }, { onConflict: 'comment_id,user_id' });

    if (voteError) throw voteError;

    // Recalculate counts
    const { data: votes } = await supabase
      .from('comment_votes')
      .select('vote_type')
      .eq('comment_id', comment_id);

    const helpfulCount = votes?.filter(v => v.vote_type === 'helpful').length || 0;
    const notHelpfulCount = votes?.filter(v => v.vote_type === 'not_helpful').length || 0;

    await supabase
      .from('comments')
      .update({
        helpful_count: helpfulCount,
        not_helpful_count: notHelpfulCount
      })
      .eq('id', comment_id);

    res.json({ helpful_count: helpfulCount, not_helpful_count: notHelpfulCount });
  } catch (error) {
    logger.error('Vote comment error:', error);
    res.status(500).json({ error: 'Failed to vote on comment' });
  }
};
```

**Frontend** :
```typescript
const CommentCard: React.FC<{ comment: Comment }> = ({ comment }) => {
  const [userVote, setUserVote] = useState<'helpful' | 'not_helpful' | null>(null);

  const handleVote = async (voteType: 'helpful' | 'not_helpful') => {
    await secureFetch(`${API_URL}/api/comments/${comment.id}/vote`, {
      method: 'POST',
      body: JSON.stringify({ vote_type: voteType })
    });

    setUserVote(voteType);
  };

  return (
    <div className="comment-card">
      <p>{comment.content}</p>

      <div className="comment-votes">
        <button
          className={userVote === 'helpful' ? 'active' : ''}
          onClick={() => handleVote('helpful')}
        >
          👍 Helpful ({comment.helpful_count})
        </button>

        <button
          className={userVote === 'not_helpful' ? 'active' : ''}
          onClick={() => handleVote('not_helpful')}
        >
          👎 Not Helpful ({comment.not_helpful_count})
        </button>
      </div>
    </div>
  );
};
```

### C. Réponses des établissements (1j)

**Migration SQL** :
```sql
ALTER TABLE comments
ADD COLUMN is_establishment_reply BOOLEAN DEFAULT FALSE,
ADD COLUMN replied_by_establishment_id UUID REFERENCES establishments(id);

-- Allow establishments to reply
ALTER TABLE users
ADD COLUMN associated_establishment_id UUID REFERENCES establishments(id);
```

**Backend - Controller** :
```typescript
export const replyToComment = async (req: AuthRequest, res: Response) => {
  try {
    const { parent_comment_id } = req.params;
    const { content } = req.body;
    const user = req.user;

    // Check if user is associated with an establishment
    const { data: userData } = await supabase
      .from('users')
      .select('associated_establishment_id')
      .eq('id', user?.id)
      .single();

    const { data: reply, error } = await supabase
      .from('comments')
      .insert({
        employee_id: parentComment.employee_id,
        user_id: user?.id,
        content,
        parent_comment_id,
        is_establishment_reply: !!userData?.associated_establishment_id,
        replied_by_establishment_id: userData?.associated_establishment_id,
        status: 'approved' // Auto-approve establishment replies
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ reply });
  } catch (error) {
    logger.error('Reply to comment error:', error);
    res.status(500).json({ error: 'Failed to reply to comment' });
  }
};
```

---

## 🔟 Freemium Model - 5 jours

### Base de données

**Migration SQL** :
```sql
ALTER TABLE users
ADD COLUMN subscription_tier VARCHAR(20) DEFAULT 'free', -- 'free', 'premium'
ADD COLUMN subscription_starts_at TIMESTAMP,
ADD COLUMN subscription_expires_at TIMESTAMP,
ADD COLUMN stripe_customer_id VARCHAR(255),
ADD COLUMN stripe_subscription_id VARCHAR(255);

-- Subscription payments table
CREATE TABLE subscription_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  stripe_payment_intent_id VARCHAR(255),
  amount INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'THB',
  status VARCHAR(20), -- 'pending', 'succeeded', 'failed'
  billing_period_start TIMESTAMP,
  billing_period_end TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_subscription_payments_user ON subscription_payments(user_id);
```

### Backend - Stripe Subscriptions

**Routes** :
```typescript
// backend/src/routes/subscription.ts
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  createSubscription,
  cancelSubscription,
  getSubscriptionStatus
} from '../controllers/subscriptionController';

const router = Router();

router.post('/create', authenticateToken, createSubscription);
router.post('/cancel', authenticateToken, cancelSubscription);
router.get('/status', authenticateToken, getSubscriptionStatus);

export default router;
```

**Controller** :
```typescript
// backend/src/controllers/subscriptionController.ts
import { stripe } from '../config/stripe';

const PREMIUM_PRICE_ID = process.env.STRIPE_PREMIUM_PRICE_ID!; // Monthly: 299 THB

export const createSubscription = async (req: AuthRequest, res: Response) => {
  try {
    const user_id = req.user?.id;
    const { payment_method_id } = req.body;

    // Get or create Stripe customer
    let { data: user } = await supabase
      .from('users')
      .select('stripe_customer_id, email')
      .eq('id', user_id)
      .single();

    let customerId = user?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user?.email,
        payment_method: payment_method_id,
        invoice_settings: {
          default_payment_method: payment_method_id
        }
      });

      customerId = customer.id;

      await supabase
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', user_id);
    }

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: PREMIUM_PRICE_ID }],
      expand: ['latest_invoice.payment_intent']
    });

    // Update user
    await supabase
      .from('users')
      .update({
        subscription_tier: 'premium',
        subscription_starts_at: new Date(subscription.current_period_start * 1000),
        subscription_expires_at: new Date(subscription.current_period_end * 1000),
        stripe_subscription_id: subscription.id
      })
      .eq('id', user_id);

    res.json({ subscription });
  } catch (error) {
    logger.error('Create subscription error:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
};
```

### Frontend - Paywall

**Créer `src/components/Premium/PremiumPaywall.tsx`** :
```typescript
import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './PremiumPaywall.css';

interface PremiumPaywallProps {
  feature: string;
  onUpgrade: () => void;
}

const PremiumPaywall: React.FC<PremiumPaywallProps> = ({ feature, onUpgrade }) => {
  return (
    <div className="premium-paywall">
      <h2>Premium Feature</h2>
      <p>Unlock {feature} with Premium</p>

      <div className="premium-benefits">
        <ul>
          <li>✓ Unlimited favorites</li>
          <li>✓ Advanced search filters</li>
          <li>✓ Unlimited messages</li>
          <li>✓ No ads</li>
          <li>✓ VIP badge</li>
          <li>✓ Priority notifications</li>
        </ul>
      </div>

      <div className="pricing">
        <div className="price-option">
          <h3>Monthly</h3>
          <p className="price">299฿</p>
          <button onClick={onUpgrade}>Upgrade Now</button>
        </div>

        <div className="price-option featured">
          <span className="badge">SAVE 17%</span>
          <h3>Yearly</h3>
          <p className="price">2,999฿</p>
          <p className="per-month">250฿/month</p>
          <button onClick={onUpgrade}>Upgrade Now</button>
        </div>
      </div>
    </div>
  );
};

export default PremiumPaywall;
```

### Hook pour vérifier premium

**Créer `src/hooks/usePremium.ts`** :
```typescript
import { useAuth } from '../contexts/AuthContext';

export const usePremium = () => {
  const { user } = useAuth();

  const isPremium = user?.subscription_tier === 'premium';
  const isExpired = user?.subscription_expires_at
    ? new Date(user.subscription_expires_at) < new Date()
    : false;

  return {
    isPremium: isPremium && !isExpired,
    canAccessFeature: (feature: string) => {
      if (isPremium && !isExpired) return true;

      // Free tier limits
      switch (feature) {
        case 'favorites':
          return user?.favorites_count < 5;
        case 'messages':
          return user?.daily_message_count < 3;
        default:
          return true;
      }
    }
  };
};
```

### Utilisation

```typescript
const SearchPage: React.FC = () => {
  const { isPremium, canAccessFeature } = usePremium();
  const [showPaywall, setShowPaywall] = useState(false);

  const handleAdvancedFilter = () => {
    if (!canAccessFeature('advanced_filters')) {
      setShowPaywall(true);
      return;
    }

    // Show advanced filters
  };

  return (
    <div>
      <button onClick={handleAdvancedFilter}>
        Advanced Filters {!isPremium && '👑'}
      </button>

      {showPaywall && (
        <PremiumPaywall
          feature="Advanced Filters"
          onUpgrade={() => navigate('/premium/upgrade')}
        />
      )}
    </div>
  );
};
```

---

## 1️⃣1️⃣ Publicité Ciblée - 4 jours

### Base de données

**Migration SQL** :
```sql
CREATE TABLE advertisements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  advertiser_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL, -- 'featured_listing', 'banner'
  establishment_id UUID REFERENCES establishments(id), -- For featured listings
  title TEXT,
  description TEXT,
  image_url TEXT,
  target_url TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'active', 'paused', 'expired'
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  budget_monthly INTEGER, -- In cents
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ads_status ON advertisements(status);
CREATE INDEX idx_ads_type ON advertisements(type);
CREATE INDEX idx_ads_dates ON advertisements(start_date, end_date);

-- Analytics events
CREATE TABLE ad_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  advertisement_id UUID REFERENCES advertisements(id) ON DELETE CASCADE,
  event_type VARCHAR(20) NOT NULL, -- 'impression', 'click'
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ad_events_ad ON ad_events(advertisement_id);
CREATE INDEX idx_ad_events_type ON ad_events(event_type);
```

### Backend - Routes

**Créer `backend/src/routes/ads.ts`** :
```typescript
import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import {
  createAdvertisement,
  getActiveAds,
  trackImpression,
  trackClick,
  getAdAnalytics
} from '../controllers/adsController';

const router = Router();

// Advertiser creates ad
router.post('/', authenticateToken, createAdvertisement);

// Get active ads (public)
router.get('/active', getActiveAds);

// Track events
router.post('/:ad_id/impression', trackImpression);
router.post('/:ad_id/click', trackClick);

// Analytics (advertiser only)
router.get('/:ad_id/analytics', authenticateToken, getAdAnalytics);

export default router;
```

### Backend - Controller

**Créer `backend/src/controllers/adsController.ts`** :
```typescript
export const getActiveAds = async (req: Request, res: Response) => {
  try {
    const { type = 'banner' } = req.query;
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('advertisements')
      .select(`
        *,
        establishment:establishments(id, name, logo_url, zone)
      `)
      .eq('status', 'active')
      .eq('type', type)
      .lte('start_date', now)
      .gte('end_date', now)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;

    res.json({ ads: data });
  } catch (error) {
    logger.error('Get active ads error:', error);
    res.status(500).json({ error: 'Failed to fetch ads' });
  }
};

export const trackImpression = async (req: Request, res: Response) => {
  try {
    const { ad_id } = req.params;
    const user_id = req.user?.id || null;

    // Log event
    await supabase.from('ad_events').insert({
      advertisement_id: ad_id,
      event_type: 'impression',
      user_id
    });

    // Increment counter
    await supabase.rpc('increment_ad_impressions', { ad_id });

    res.json({ success: true });
  } catch (error) {
    logger.error('Track impression error:', error);
    res.status(500).json({ error: 'Failed to track impression' });
  }
};

export const trackClick = async (req: Request, res: Response) => {
  try {
    const { ad_id } = req.params;
    const user_id = req.user?.id || null;

    // Log event
    await supabase.from('ad_events').insert({
      advertisement_id: ad_id,
      event_type: 'click',
      user_id
    });

    // Increment counter
    await supabase.rpc('increment_ad_clicks', { ad_id });

    res.json({ success: true });
  } catch (error) {
    logger.error('Track click error:', error);
    res.status(500).json({ error: 'Failed to track click' });
  }
};
```

**SQL Functions** :
```sql
CREATE OR REPLACE FUNCTION increment_ad_impressions(ad_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE advertisements
  SET impressions = impressions + 1
  WHERE id = ad_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_ad_clicks(ad_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE advertisements
  SET clicks = clicks + 1
  WHERE id = ad_id;
END;
$$ LANGUAGE plpgsql;
```

### Frontend - Featured Listings

**Créer `src/components/Ads/FeaturedListings.tsx`** :
```typescript
import React, { useEffect, useState } from 'react';
import { Establishment } from '../../types';

const FeaturedListings: React.FC = () => {
  const [featuredAds, setFeaturedAds] = useState<any[]>([]);

  useEffect(() => {
    fetchFeaturedAds();
  }, []);

  const fetchFeaturedAds = async () => {
    const response = await fetch(
      `${process.env.REACT_APP_API_URL}/api/ads/active?type=featured_listing`
    );
    const data = await response.json();
    setFeaturedAds(data.ads);

    // Track impressions
    data.ads.forEach((ad: any) => {
      trackImpression(ad.id);
    });
  };

  const trackImpression = async (adId: string) => {
    await fetch(`${process.env.REACT_APP_API_URL}/api/ads/${adId}/impression`, {
      method: 'POST'
    });
  };

  const handleClick = async (ad: any) => {
    // Track click
    await fetch(`${process.env.REACT_APP_API_URL}/api/ads/${ad.id}/click`, {
      method: 'POST'
    });

    // Navigate to establishment
    window.location.href = `/bar/${ad.establishment_id}`;
  };

  return (
    <div className="featured-listings">
      <h3>Sponsored</h3>

      {featuredAds.map(ad => (
        <div
          key={ad.id}
          className="featured-card"
          onClick={() => handleClick(ad)}
        >
          <img src={ad.establishment?.logo_url} alt={ad.title} />
          <div className="featured-content">
            <h4>{ad.title}</h4>
            <p>{ad.description}</p>
            <span className="sponsored-badge">Sponsored</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default FeaturedListings;
```

### Frontend - Banner Ads

**Créer `src/components/Ads/BannerAd.tsx`** :
```typescript
import React, { useEffect, useState } from 'react';
import { usePremium } from '../../hooks/usePremium';
import './BannerAd.css';

const BannerAd: React.FC = () => {
  const { isPremium } = usePremium();
  const [ad, setAd] = useState<any>(null);

  useEffect(() => {
    if (isPremium) return; // No ads for premium users

    fetchBannerAd();
  }, [isPremium]);

  const fetchBannerAd = async () => {
    const response = await fetch(
      `${process.env.REACT_APP_API_URL}/api/ads/active?type=banner`
    );
    const data = await response.json();

    if (data.ads && data.ads.length > 0) {
      const randomAd = data.ads[Math.floor(Math.random() * data.ads.length)];
      setAd(randomAd);

      // Track impression
      await fetch(`${process.env.REACT_APP_API_URL}/api/ads/${randomAd.id}/impression`, {
        method: 'POST'
      });
    }
  };

  const handleClick = async () => {
    if (!ad) return;

    // Track click
    await fetch(`${process.env.REACT_APP_API_URL}/api/ads/${ad.id}/click`, {
      method: 'POST'
    });

    // Open target URL
    window.open(ad.target_url, '_blank');
  };

  if (isPremium || !ad) return null;

  return (
    <div className="banner-ad" onClick={handleClick}>
      <img src={ad.image_url} alt={ad.title} />
      <button className="ad-close" onClick={(e) => {
        e.stopPropagation();
        setAd(null);
      }}>×</button>
    </div>
  );
};

export default BannerAd;
```

---

## ✅ Checklist de Déploiement

Avant de mettre en production une nouvelle feature :

- [ ] Tests unitaires écrits et passants
- [ ] Tests d'intégration sur environnement de staging
- [ ] Migration SQL testée sur copie de la base de données
- [ ] Variables d'environnement ajoutées à `.env.example`
- [ ] Documentation mise à jour
- [ ] Performance testée (Lighthouse score > 90)
- [ ] Sécurité auditée (pas de failles XSS/CSRF/SQL injection)
- [ ] Compatible mobile (responsive design)
- [ ] Logs et monitoring configurés
- [ ] Rollback plan documenté

---

**Dernière révision** : 5 octobre 2025
**Prochaine révision** : À chaque fin de sprint
**Maintenu par** : Équipe PattaMap
