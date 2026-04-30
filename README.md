# HaulSync — In-Plant Logistics Module

![HaulSync](https://img.shields.io/badge/HaulSync-In--Plant-14B8A6?style=flat-square&logo=lightning&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square)
![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=flat-square)
![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?style=flat-square)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?style=flat-square)

> In-plant logistics operating system — gate entry, dock scheduling, bay management, and automated detention tracking.

---

## Architecture

```
haulsync-inplant/
├── frontend/          React 18 + Vite + Tailwind CSS (teal accent)
│   └── src/
│       ├── pages/
│       │   ├── Dashboard.jsx       Live KPI dashboard
│       │   ├── Gate/               Gate check-in / check-out
│       │   ├── Docks/              Dock slot scheduling
│       │   ├── Bays/               Bay map + loading progress
│       │   ├── Detention/          Detention tracking + approvals
│       │   └── Analytics/          Charts & reports
│       ├── components/
│       │   ├── Layout/             Sidebar + Layout shell
│       │   └── common/             Shared UI components
│       ├── api/client.js           Axios instance
│       └── context/AuthContext.jsx Auth state
│
└── backend/           Express + Prisma + Socket.io
    ├── src/
    │   ├── server.js               Main entry point
    │   ├── routes/
    │   │   ├── auth.js             Login, me, change-password
    │   │   ├── gate.js             Check-in, check-out, status
    │   │   ├── docks.js            Slot CRUD, availability
    │   │   ├── bays.js             Bay assign, release, progress
    │   │   ├── detention.js        Cases, approvals, escalation
    │   │   ├── analytics.js        Dashboard KPIs, reports
    │   │   ├── vendors.js          Vendor CRUD
    │   │   └── users.js            User management (admin)
    │   ├── engines/
    │   │   ├── detentionEngine.js  Auto-calculates detention charges
    │   │   └── slotAllocator.js    Priority-based dock slot allocation
    │   └── middleware/
    │       ├── auth.js             JWT verification + RBAC
    │       └── errorHandler.js     Global error handler
    └── prisma/
        ├── schema.prisma           Full data model
        └── seed.js                 Demo data seed
```

---

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- npm or yarn

### 1. Clone & install

```bash
git clone <your-repo-url>
cd haulsync-inplant

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Configure environment

```bash
# Backend
cd backend
cp .env.example .env
# Edit DATABASE_URL and JWT_SECRET

# Frontend
cd ../frontend
cp .env.example .env
```

### 3. Database setup

```bash
cd backend

# Run migrations
npx prisma migrate dev --name init

# Seed demo data
npm run db:seed
```

### 4. Start servers

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

Open: **http://localhost:3001**

---

## Demo Credentials

| Role             | Email                      | Password      |
|------------------|----------------------------|---------------|
| Super Admin      | admin@inplant.local        | Admin@1234    |
| Gate Manager     | gate@inplant.local         | Gate@1234     |
| Dock Operator    | dock@inplant.local         | Dock@1234     |
| Warehouse Manager| warehouse@inplant.local    | WH@1234       |
| Finance          | finance@inplant.local      | Finance@1234  |

---

## API Reference

### Auth
| Method | Endpoint                  | Description            |
|--------|---------------------------|------------------------|
| POST   | /api/auth/login           | Login, returns JWT     |
| GET    | /api/auth/me              | Current user profile   |
| POST   | /api/auth/change-password | Change password        |

### Gate
| Method | Endpoint                  | Description            |
|--------|---------------------------|------------------------|
| GET    | /api/gate                 | List visits (today)    |
| GET    | /api/gate/:id             | Visit detail           |
| POST   | /api/gate/checkin         | Gate check-in          |
| PATCH  | /api/gate/:id/status      | Update visit status    |
| POST   | /api/gate/:id/checkout    | Gate check-out         |
| DELETE | /api/gate/:id             | Cancel visit           |

### Docks
| Method | Endpoint                  | Description            |
|--------|---------------------------|------------------------|
| GET    | /api/docks                | List docks + stats     |
| GET    | /api/docks/slots          | Today's slots          |
| GET    | /api/docks/availability   | Find free slot         |
| POST   | /api/docks/slots          | Book a slot            |
| PATCH  | /api/docks/slots/:id      | Update slot            |
| DELETE | /api/docks/slots/:id      | Cancel slot            |

### Bays
| Method | Endpoint                  | Description            |
|--------|---------------------------|------------------------|
| GET    | /api/bays                 | All bays with status   |
| PATCH  | /api/bays/:id             | Update bay / progress  |
| POST   | /api/bays/:id/assign      | Assign vehicle to bay  |
| POST   | /api/bays/:id/release     | Release bay            |

### Detention
| Method | Endpoint                    | Description            |
|--------|-----------------------------|------------------------|
| GET    | /api/detention              | List cases             |
| GET    | /api/detention/summary      | Dashboard totals       |
| GET    | /api/detention/:id          | Case detail            |
| POST   | /api/detention/:id/approve  | Waive / collect        |
| POST   | /api/detention/:id/escalate | Manual escalation      |

### Analytics
| Method | Endpoint                    | Description            |
|--------|-----------------------------|------------------------|
| GET    | /api/analytics/dashboard    | Live dashboard KPIs    |
| GET    | /api/analytics/inplant      | Historical analytics   |
| GET    | /api/analytics/tat-report   | TAT breakdown          |

---

## Real-time Events (Socket.io)

| Event               | Payload                                   |
|---------------------|-------------------------------------------|
| gate:checkin        | { id, vehicleNumber, status, gateInAt }   |
| gate:checkout       | { id, vehicleNumber, gateOutAt }          |
| gate:status         | { id, vehicleNumber, status }             |
| bay:progress        | { bayId, bay, loadingProgress, visitId }  |
| bay:assigned        | { bayId, visitId }                        |
| bay:released        | { bayId, bayLabel }                       |
| dock:slotBooked     | { id, dock, startTime, endTime }          |
| detention:update    | { visitId, overdueMins, chargesAccrued }  |
| detention:resolved  | { caseId, status, waived, collected }     |
| detention:escalated | { caseId }                                |

---

## Roles & Permissions

| Role              | Gate | Docks | Bays | Detention Approval | Admin |
|-------------------|------|-------|------|--------------------|-------|
| SUPER_ADMIN       | ✅   | ✅    | ✅   | ✅                 | ✅    |
| ADMIN             | ✅   | ✅    | ✅   | ✅                 | ✅    |
| WAREHOUSE_MANAGER | ✅   | ✅    | ✅   | ✅                 | ❌    |
| GATE_MANAGER      | ✅   | ❌    | ❌   | ❌                 | ❌    |
| DOCK_OPERATOR     | ❌   | ✅    | ✅   | ❌                 | ❌    |
| FINANCE           | ❌   | ❌    | ❌   | ✅                 | ❌    |
| SECURITY          | ✅   | ❌    | ❌   | ❌                 | ❌    |
| VIEWER            | 👁️   | 👁️    | 👁️   | ❌                 | ❌    |

---

## Design System

This module uses **teal** (`#14B8A6`) as its accent color to distinguish it from:
- **HaulSync Core** — Amber / Yellow (`#F59E0B`)
- **HaulSync TMS** — Purple (`#8B5CF6`)
- **HaulSync WMS** — Blue (`#3B82F6`)
- **HaulSync In-Plant** — **Teal** (`#14B8A6`) ✅

All modules share the same dark base (`zinc-950`), Syne + DM Sans typography, and the ⚡ Zap lightning logo — just colored differently per module.

---

## License
MIT — Part of the HaulSync open-source ecosystem.
