# 🔧 Instructions de Correction - Système de Notifications

> **Date**: 2025-01-20
> **Version**: v10.3
> **Problème**: Les notifications n'apparaissent pas du tout

---

## 📋 Problèmes Identifiés

Votre système de notifications présente **2 problèmes critiques** dans Supabase :

### 1. ⚠️ Colonne `metadata` Manquante (CRITIQUE)
- **Cause**: Migration `add_notifications_metadata.sql` (v10.3) non exécutée
- **Impact**: Toutes les insertions de notifications échouent silencieusement
- **Symptôme**: Aucune notification n'apparaît dans le frontend

### 2. ⚠️ Contrainte CHECK Obsolète (CRITIQUE)
- **Cause**: Contrainte supporte seulement 21 types, frontend v10.3 utilise 36 types
- **Impact**: 15 nouveaux types de notifications sont rejetés par la base de données
- **Types manquants**:
  - Verification (4): `verification_submitted`, `verification_approved`, `verification_rejected`, `verification_revoked`
  - VIP (4): `vip_purchase_confirmed`, `vip_payment_verified`, `vip_payment_rejected`, `vip_subscription_cancelled`
  - Edit Proposals (3): `edit_proposal_submitted`, `edit_proposal_approved`, `edit_proposal_rejected`
  - Establishment Owners (3): `establishment_owner_assigned`, `establishment_owner_removed`, `establishment_owner_permissions_updated`
  - Moderation (1): `comment_removed`

---

## 🚀 Solution Rapide (5 minutes)

### Étape 1 : Diagnostic (1 minute)

**Ouvrez Supabase SQL Editor** et exécutez le script de vérification :

📂 Fichier: `backend/database/verification/check_notifications_schema.sql`

**Points à vérifier** :
- ✅ **Section 2**: La colonne `metadata` doit apparaître avec type `jsonb`
- ✅ **Section 3/4**: La contrainte CHECK doit lister **36 types** (pas 21)
- ✅ **Section 5**: L'index `idx_notifications_metadata` doit exister
- ✅ **Section 6**: Les **5 fonctions RPC** doivent exister

---

### Étape 2 : Ajouter la Colonne `metadata` (1 minute)

Si la colonne `metadata` **n'apparaît pas** en Section 2 :

📂 **Fichier**: `backend/database/migrations/add_notifications_metadata.sql`

**Dans Supabase SQL Editor** :
1. Copiez tout le contenu du fichier
2. Collez dans SQL Editor
3. Cliquez **"RUN"**

✅ **Vérification** :
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'notifications'
  AND column_name = 'metadata';
```
**Attendu** : 1 ligne avec `metadata | jsonb`

---

### Étape 3 : Mettre à Jour la Contrainte CHECK (1 minute)

Si vous voyez seulement **21 types** en Section 3/4 :

📂 **Fichier**: `backend/database/migrations/update_notification_types_v10_3.sql`

**Dans Supabase SQL Editor** :
1. Copiez tout le contenu du fichier
2. Collez dans SQL Editor
3. Cliquez **"RUN"**

✅ **Vérification** :
```sql
SELECT COUNT(*) AS total_types
FROM (
  SELECT unnest(
    regexp_split_to_array(
      regexp_replace(
        pg_get_constraintdef(oid),
        '^CHECK \(\(type\)::text = ANY \(ARRAY\[(.*)\]\)\)$',
        '\1'
      ),
      ', '
    )
  ) AS type
  FROM pg_constraint
  WHERE conrelid = 'notifications'::regclass
    AND conname = 'notifications_type_check'
) AS types;
```
**Attendu** : `total_types = 36`

---

### Étape 4 : Vérifier les Fonctions RPC (2 minutes)

Si **moins de 5 fonctions** apparaissent en Section 6, créez-les manuellement :

#### 4.1. `get_user_notifications`
```sql
CREATE OR REPLACE FUNCTION get_user_notifications(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_unread_only BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  type VARCHAR(50),
  title VARCHAR(200),
  message TEXT,
  link VARCHAR(500),
  is_read BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  related_entity_type VARCHAR(50),
  related_entity_id UUID,
  metadata JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    n.id,
    n.user_id,
    n.type,
    n.title,
    n.message,
    n.link,
    n.is_read,
    n.created_at,
    n.related_entity_type,
    n.related_entity_id,
    n.metadata
  FROM notifications n
  WHERE n.user_id = p_user_id
    AND (NOT p_unread_only OR n.is_read = FALSE)
  ORDER BY n.created_at DESC
  LIMIT p_limit;
END;
$$;
```

#### 4.2. `mark_notification_read`
```sql
CREATE OR REPLACE FUNCTION mark_notification_read(
  p_notification_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE notifications
  SET is_read = TRUE
  WHERE id = p_notification_id
    AND user_id = p_user_id;

  RETURN FOUND;
END;
$$;
```

#### 4.3. `mark_all_notifications_read`
```sql
CREATE OR REPLACE FUNCTION mark_all_notifications_read(
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE notifications
  SET is_read = TRUE
  WHERE user_id = p_user_id
    AND is_read = FALSE;

  RETURN TRUE; -- Idempotent - always returns TRUE
END;
$$;
```

#### 4.4. `delete_notification`
```sql
CREATE OR REPLACE FUNCTION delete_notification(
  p_notification_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM notifications
  WHERE id = p_notification_id
    AND user_id = p_user_id;

  RETURN FOUND;
END;
$$;
```

#### 4.5. `get_unread_count`
```sql
CREATE OR REPLACE FUNCTION get_unread_count(
  p_user_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO v_count
  FROM notifications
  WHERE user_id = p_user_id
    AND is_read = FALSE;

  RETURN v_count;
END;
$$;
```

✅ **Vérification** :
```sql
SELECT proname AS function_name
FROM pg_proc
WHERE proname IN (
  'get_user_notifications',
  'mark_notification_read',
  'mark_all_notifications_read',
  'delete_notification',
  'get_unread_count'
);
```
**Attendu** : 5 fonctions

---

## 🧪 Test du Système (Backend)

Après avoir appliqué les corrections, testez le système :

### Test 1 : Créer une Notification Test

**Fichier**: `backend/test-notification.js` existe déjà

**Exécutez** :
```bash
cd backend
node test-notification.js
```

**Attendu** :
```
✅ Notification created successfully
📊 Notification ID: xxx-xxx-xxx
📝 Type: ownership_request_submitted
```

### Test 2 : Vérifier dans Supabase

```sql
-- Voir les dernières notifications créées
SELECT
  id,
  type,
  title,
  message,
  metadata,
  created_at
FROM notifications
ORDER BY created_at DESC
LIMIT 5;
```

### Test 3 : Tester dans le Frontend

1. **Démarrez le frontend** : `npm start`
2. **Connectez-vous** avec votre compte
3. **Vérifiez la cloche de notification** (🔔 en haut à droite)
4. **Cliquez dessus** - Les notifications doivent apparaître !

---

## 📊 Résultat Attendu

Après correction complète :

✅ **Colonne `metadata`** existe avec type JSONB
✅ **Contrainte CHECK** supporte 36 types de notifications
✅ **Index GIN** sur `metadata` existe
✅ **5 fonctions RPC** existent et fonctionnent
✅ **Notifications apparaissent** dans la cloche du frontend
✅ **Tous les 36 types** peuvent être créés sans erreur

---

## 🆘 Troubleshooting

### Erreur : "column metadata does not exist"
**Solution** : Exécutez `add_notifications_metadata.sql` (Étape 2)

### Erreur : "new row for relation violates check constraint"
**Solution** : Exécutez `update_notification_types_v10_3.sql` (Étape 3)

### Erreur : "function does not exist"
**Solution** : Créez les fonctions RPC manuellement (Étape 4)

### Les notifications n'apparaissent toujours pas
1. **Vérifiez les logs backend** : `npm run dev` (dans `backend/`)
2. **Vérifiez la console browser** : F12 → Console (erreurs JavaScript ?)
3. **Vérifiez les routes** : `backend/src/server.ts` ligne 756 (routes montées ?)
4. **Vérifiez l'authentification** : Token JWT valide ?

---

## 📞 Support

Si le problème persiste après ces corrections :

1. **Relancez le script de diagnostic** (Étape 1)
2. **Vérifiez les logs Supabase** (SQL errors?)
3. **Partagez les résultats** du script de vérification

---

**🎯 Temps total estimé : 5-10 minutes**
