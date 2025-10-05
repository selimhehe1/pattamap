# 🏮 PattaMap - Pattaya Directory Platform

**Version**: 10.0.0 (Cleaned & Optimized)
**Status**: Production-Ready
**Last Updated**: October 2025

## 📋 Overview

PattaMap is a collaborative platform for referencing entertainment employees in Pattaya, Thailand, with custom ergonomic maps and community contributions.

### ✨ Key Features

- 🗺️ **9 Custom Zone Maps** - Soi 6, Walking Street, LK Metro, Treetown, etc.
- 👥 **Employee Directory** - 76 profiles with photos, social media, work history
- 🏢 **Establishment Listings** - 41 venues with detailed information
- ⭐ **Review System** - Community ratings and comments
- 🔐 **Enterprise Security** - CSRF, httpOnly cookies, audit logs
- 📱 **Responsive Design** - Mobile-first with nightlife theme

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm 8+
- Supabase account (database)
- Cloudinary account (images)

### Installation

```bash
# 1. Clone the repository
git clone <repository-url>
cd pattaya-directory

# 2. Install dependencies
npm install
cd backend && npm install

# 3. Configure environment variables
# Create .env in backend/ with:
# - SUPABASE_URL
# - SUPABASE_KEY
# - JWT_SECRET
# - CLOUDINARY_*

# 4. Start development servers
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
npm start
```

The app will open at `http://localhost:3000`
Backend API runs at `http://localhost:8080`

---

## 🏗️ Architecture

### Tech Stack
| Component | Technology | Version |
|-----------|------------|---------|
| Frontend | React + TypeScript | 19.1.1 |
| Backend | Node.js + Express | 5.9.2 |
| Database | Supabase (PostgreSQL) | Latest |
| Storage | Cloudinary | 2.7.0 |
| Auth | JWT + Refresh Tokens | 9.0.2 |

### Project Structure
```
pattaya-directory/
├── src/                    # Frontend React app
│   ├── components/
│   │   ├── Map/           # 9 custom zone maps
│   │   ├── Admin/         # Admin dashboard
│   │   ├── Bar/           # Establishment pages
│   │   ├── Forms/         # Data entry forms
│   │   └── Search/        # Search engine
│   ├── contexts/          # React contexts (Auth, Modal, CSRF)
│   ├── hooks/             # Custom React hooks
│   └── styles/            # nightlife-theme.css
│
├── backend/
│   ├── src/
│   │   ├── routes/        # API endpoints
│   │   ├── controllers/   # Business logic
│   │   ├── middleware/    # Auth, CSRF, rate limiting
│   │   └── config/        # Database & services
│   └── database/          # SQL migrations
│
└── docs/
    └── archive/           # Historical documentation
```

---

## 🔐 Security Features

- ✅ **httpOnly Cookies** - Tokens inaccessible to JavaScript (XSS protection)
- ✅ **CSRF Protection** - Custom middleware with session tokens
- ✅ **Refresh Token Rotation** - 15min access tokens, 7-day refresh
- ✅ **Rate Limiting** - Granular limits per operation type
- ✅ **Audit Logging** - Complete trail of sensitive actions
- ✅ **Helmet Security** - HTTP headers hardening

---

## 🗺️ Map System

### 9 Custom Zones

1. **Soi 6** (2×20 grid) - North Pattaya nightlife
2. **Walking Street** (12×5 topographic) - Main entertainment strip
3. **LK Metro** (L-shaped 33 positions) - Gay-friendly area
4. **Treetown** (U-shaped 42 positions) - Lesbian bars
5. **Soi Buakhao** (3×18) - Commercial district
6. **Jomtien Complex** (2×15) - Beach area LGBT+
7. **BoyzTown** (2×12) - Gay district
8. **Soi 7 & 8** (3×16) - Traditional open-air bars
9. **Beach Road Central** (2×22) - Seafront

### Innovative UX
- **Ergonomic Grids** - Custom layouts > Google Maps for dense zones
- **Drag & Drop Admin** - Topographic position management
- **HTML5 Canvas Roads** - Professional visual rendering
- **Responsive Positioning** - useContainerSize hook for sidebar toggle

---

## 📊 API Endpoints

### Public
- `GET /api/establishments` - List all venues
- `GET /api/employees` - List all profiles
- `GET /api/employees/search` - Advanced search

### Authenticated
- `POST /api/comments` - Submit review (with CSRF)
- `POST /api/favorites` - Save favorite employee
- `PUT /api/employees/:id` - Edit proposals

### Admin Only
- `PUT /api/establishments/:id/position` - Update map position
- `POST /api/admin/approve-proposal` - Approve edits
- `GET /api/admin/audit-logs` - View security logs

---

## 🧪 Testing

```bash
# Frontend build test
npm run build

# Backend TypeScript compile
cd backend && npm run build

# Health check
curl http://localhost:8080/api/health
```

---

## 📚 Documentation

- **Full Technical Docs**: `docs/archive/CLAUDE-v9.1.0.md` (374 lines)
- **Architecture Decisions**: See "Innovation UX - Cartes Ergonomiques" section
- **Security Implementation**: Version 8.0.0+ changelog for enterprise security

---

## 🎯 Key Metrics (October 2025)

- **76 Employee Profiles** with complete information
- **41 Establishments** across 9 zones
- **322 Total Grid Positions** available
- **52 Community Reviews** submitted
- **14 Active Users** (user/moderator/admin roles)

---

## 🔧 Maintenance

### Common Tasks

**Start Development**
```bash
# Kill all existing processes first
# Terminal 1: cd backend && npm run dev
# Terminal 2: npm start
```

**Create Backup**
```bash
# Automated PowerShell script available
powershell -ExecutionPolicy Bypass -File create-backup.ps1
```

**Database Migrations**
- SQL files in `backend/database/migrations/`
- Run manually via Supabase SQL Editor

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`feature/amazing-feature`)
3. Commit changes with clear messages
4. Push to branch
5. Open Pull Request

---

## 📝 License

Private project - All rights reserved

---

## 📞 Support

For issues or questions:
- Create GitHub issue
- Contact: [Your contact info]

---

**Built with ❤️ for the Pattaya nightlife community**
