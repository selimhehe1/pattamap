# 🚀 Installation des Database Indexes

## Guide rapide

### Étape 1: Ouvrir Supabase Dashboard
1. Aller sur [app.supabase.com](https://app.supabase.com)
2. Sélectionner votre projet PattaMap
3. Cliquer sur **SQL Editor** dans le menu latéral

### Étape 2: Copier le script SQL
1. Ouvrir le fichier `create_indexes.sql` dans ce dossier
2. Copier tout le contenu (Ctrl+A, Ctrl+C)

### Étape 3: Exécuter le script
1. Dans Supabase SQL Editor, cliquer sur **New query**
2. Coller le script SQL (Ctrl+V)
3. Cliquer sur **Run** (ou appuyer sur Ctrl+Enter)

### Étape 4: Vérifier l'installation
Le script affiche automatiquement tous les indexes créés. Vous devriez voir ~30 indexes listés.

## ⏱️ Temps d'exécution
- **~30 secondes** pour créer tous les indexes
- Pas de downtime, la database reste accessible pendant la création

## 📊 Gains de performance attendus

| Opération | Avant | Après | Amélioration |
|-----------|-------|-------|--------------|
| Filtrer par status | 500ms | 50ms | **10x** |
| Filtrer par zone | 800ms | 40ms | **20x** |
| Recherche texte | 2000ms | 100ms | **20x** |
| Liste employées par établissement | 300ms | 30ms | **10x** |

## ✅ Indexes créés

**7 tables optimisées:**
- ✅ Establishments (7 indexes)
- ✅ Employees (6 indexes)
- ✅ Employment History (4 indexes)
- ✅ Comments (5 indexes)
- ✅ Users (2 indexes)
- ✅ Reports (4 indexes)
- ✅ Favorites (5 indexes)

**Total: 33 indexes**

## 🔍 Types d'indexes

- **B-tree indexes**: Pour les filtres et tris (status, zone, dates)
- **Composite indexes**: Pour les filtres combinés (status + zone)
- **Partial indexes**: Pour les conditions spécifiques (is_current = true)
- **GIN indexes**: Pour la recherche full-text (noms d'établissements/employées)

## ⚠️ Important

- Les indexes utilisent `IF NOT EXISTS` - pas de conflit si déjà créés
- Pas besoin de redémarrer le serveur backend
- Les indexes sont automatiquement utilisés par PostgreSQL
- Aucune modification de code nécessaire

## 📝 Documentation complète

Voir `docs/DATABASE_INDEXES.md` pour plus de détails sur chaque index.
