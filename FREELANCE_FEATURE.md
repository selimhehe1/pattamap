# 💃 Système Freelance - Documentation

## Vue d'ensemble

Le système freelance permet aux employés d'avoir leur propre position indépendante sur la carte, en plus de pouvoir travailler dans des établissements.

### Cas d'usage

Un freelance peut :
- ✅ Avoir sa propre position sur la carte (visible comme un marqueur distinct)
- ✅ En même temps travailler dans un ou plusieurs établissements
- ✅ Changer de position indépendante
- ✅ Désactiver son mode freelance

## Architecture

### Base de données

Table: `independent_positions`
```sql
- id (UUID)
- employee_id (FK → employees)
- zone (string) - 'soi6', 'walkingstreet', 'beachroad', etc.
- grid_row (integer 1-2)
- grid_col (integer 1-40)
- is_active (boolean) - un seul actif par employé
- created_by (FK → users)
- created_at, updated_at (timestamps)
```

**Contraintes** :
- Un employé ne peut avoir qu'une seule position active à la fois
- Une position grid ne peut être occupée que par un seul freelance actif
- Les positions sont gérées par zone

### API Endpoints

#### GET `/api/independent-positions/map`
Récupère tous les freelances actifs pour affichage sur la carte
- **Public** (pas d'auth requise)
- **Query params**: `?zone=soi6` (optionnel - filtre par zone)
- **Response**:
```json
{
  "data": [
    {
      "id": "uuid",
      "employee_id": "uuid",
      "zone": "soi6",
      "grid_row": 1,
      "grid_col": 5,
      "is_active": true,
      "employee": {
        "id": "uuid",
        "name": "Anna",
        "nickname": "Nana",
        "photos": ["url1", "url2"],
        "age": 25,
        "nationality": "Thailand"
      }
    }
  ]
}
```

#### GET `/api/independent-positions/:employeeId`
Récupère la position indépendante d'un employé spécifique
- **Public**
- **Response**: Position ou `null` si aucune

#### POST `/api/independent-positions`
Crée une nouvelle position indépendante
- **Auth required**
- **Body**:
```json
{
  "employee_id": "uuid",
  "zone": "soi6",
  "grid_row": 1,
  "grid_col": 10
}
```
- **Validation**: Vérifie que la position n'est pas déjà occupée

#### PUT `/api/independent-positions/:employeeId`
Met à jour la position d'un freelance
- **Auth required**
- **Body**:
```json
{
  "zone": "walkingstreet",
  "grid_row": 2,
  "grid_col": 15,
  "is_active": true
}
```

#### DELETE `/api/independent-positions/:employeeId`
Désactive la position indépendante (soft delete)
- **Auth required**
- **Effect**: Met `is_active = false`

## Frontend

### Flux de données

```
App.tsx
  ├─> fetchFreelances() → API
  ├─> state: freelances[]
  └─> PattayaMap
       ├─> props: freelances
       └─> ZoneMapRenderer
            ├─> props: freelances
            └─> CustomSoi6Map (etc.)
                 └─> Affiche freelances avec style distinct
```

### Types TypeScript

```typescript
interface IndependentPosition {
  id: string;
  employee_id: string;
  zone: string;
  grid_row: number;
  grid_col: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface Employee {
  // ... champs existants
  independent_position?: IndependentPosition; // Ajouté
}
```

## Installation

### 1. Exécuter la migration SQL

Connectez-vous à Supabase et exécutez:
```bash
backend/src/database/migration_independent_positions.sql
```

Cette migration crée:
- La table `independent_positions`
- Les contraintes uniques
- Les indexes pour performance

### 2. Redémarrer les serveurs

```bash
# Backend
cd pattaya-directory/backend
npm run dev

# Frontend
cd pattaya-directory
npm start
```

## Utilisation

### Pour créer un freelance (exemple avec curl)

```bash
curl -X POST http://localhost:8080/api/independent-positions \
  -H "Content-Type: application/json" \
  -H "Cookie: token=YOUR_AUTH_TOKEN" \
  -H "X-CSRF-Token: YOUR_CSRF_TOKEN" \
  -d '{
    "employee_id": "employee-uuid-here",
    "zone": "soi6",
    "grid_row": 1,
    "grid_col": 5
  }'
```

### Pour récupérer tous les freelances

```bash
curl http://localhost:8080/api/independent-positions/map
```

### Pour filtrer par zone

```bash
curl http://localhost:8080/api/independent-positions/map?zone=soi6
```

## Prochaines étapes (TODO)

### UI de gestion
- [ ] Ajouter un toggle "Mode Freelance" dans le formulaire d'employé
- [ ] Créer un sélecteur de position visuel sur la carte
- [ ] Permettre le drag & drop pour changer de position
- [ ] Ajouter un panneau de gestion des freelances dans l'admin

### Affichage visuel
- [ ] Modifier CustomSoi6Map pour afficher les freelances
- [ ] Utiliser une icône/couleur distincte (ex: 👯 ou 💃)
- [ ] Ajouter un tooltip au survol montrant les infos du freelance
- [ ] Permettre le clic pour voir le profil complet

### Fonctionnalités avancées
- [ ] Historique des positions (quand un freelance change de place)
- [ ] Notifications quand un freelance change de zone
- [ ] Statistiques: zones les plus populaires pour freelances
- [ ] Système de réservation/disponibilité

## Notes techniques

### Performance
- Les requêtes sont optimisées avec des indexes sur (zone, grid_row, grid_col)
- Seulement les positions actives sont récupérées par défaut
- Le frontend met en cache les freelances (pas de reload constant)

### Sécurité
- Seuls les utilisateurs authentifiés peuvent créer/modifier des positions
- CSRF protection sur toutes les routes POST/PUT/DELETE
- Validation côté serveur des coordonnées grid

### Compatibilité
- Le système est rétrocompatible : les employés existants continuent de fonctionner
- Un employé peut avoir à la fois une position indépendante ET un emploi dans un bar
- Les deux systèmes coexistent sans conflit

## Support

Pour toute question ou problème:
1. Vérifiez que la migration SQL a bien été exécutée
2. Consultez les logs backend pour les erreurs
3. Vérifiez que les serveurs backend (8080) et frontend (3000) tournent

## Changelog

### v1.0.0 (2025-10-04)
- ✅ Création de la table `independent_positions`
- ✅ API CRUD complète
- ✅ Types TypeScript (backend + frontend)
- ✅ Intégration du flux de données frontend
- ⏳ UI de gestion (en cours)
- ⏳ Affichage visuel sur la carte (en cours)
