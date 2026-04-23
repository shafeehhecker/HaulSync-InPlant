# 🏭 HaulSync — In-Plant Logistics Management

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-ready-blue.svg)](https://www.docker.com/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Part of HaulSync](https://img.shields.io/badge/HaulSync-TOS%20Module-6C47FF)](https://github.com/your-org/haulsync)

> **A self-hostable In-Plant Logistics Operating System — built on the HaulSync platform. Digitizes every touchpoint inside your facility: from gate entry and dock scheduling to bay-level loading management, detention tracking, and final dispatch.**

HaulSync In-Plant is a dedicated module in the HaulSync ecosystem, purpose-built for large manufacturing plants, distribution centers, and warehouses that need granular, real-time control over inbound and outbound vehicle movements within their premises. It ships as a standalone service and integrates seamlessly with the core HaulSync platform and enterprise ERP systems via a published, standards-based API — including support for materials management workflows through REST and webhook adapters.

---

## ✨ In-Plant Module Overview

| Module | Description |
|--------|-------------|
| 🚧 **Gate Entry Automation** | QR-based check-in, automatic vehicle verification, document scanning, and instant warehouse team notification |
| 🕐 **Dock Scheduling** | Smart slot allocation, priority-based scheduling, buffer time management, and real-time dock availability dashboard |
| 🏗️ **Loading Bay Management** | Bay assignment, loading progress tracking, material verification, and quality check integration |
| ⏱️ **Detention Time Tracking** | Auto-calculated detention charges, exception alerts, approval workflows, and historical detention analysis |
| 📱 **Driver Mobile App** | Real-time status updates, document upload, digital POD capture, and in-facility turn-by-turn navigation |
| 📊 **Analytics & Reporting** | TAT trend analysis, dock utilization heatmaps, detention cost dashboards, and carrier scorecards |

---

## 🏗️ Architecture

```
haulsync-inplant/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── gate.js                # Gate entry, exit, QR check-in
│   │   │   ├── docks.js               # Dock slot management & scheduling
│   │   │   ├── bays.js                # Bay assignment & loading progress
│   │   │   ├── detention.js           # Detention calculation & approvals
│   │   │   ├── vehicles.js            # Vehicle verification & master
│   │   │   ├── documents.js           # Document upload & OCR scan
│   │   │   ├── notifications.js       # Push alerts to warehouse & drivers
│   │   │   ├── analytics.js           # TAT, dock utilization, cost reports
│   │   │   ├── drivers.js             # Driver profiles & mobile sessions
│   │   │   ├── companies.js           # Vendor/shipper master
│   │   │   ├── users.js               # User management
│   │   │   └── auth.js                # Login, JWT
│   │   ├── integrations/
│   │   │   ├── erp/                   # ERP adapter layer (REST + webhook)
│   │   │   │   ├── IERPAdapter.js     # Adapter interface for GR/PO sync
│   │   │   │   ├── genericAdapter.js  # Configurable REST/webhook adapter
│   │   │   │   └── registry.js        # Active ERP adapter registry
│   │   │   ├── ocr/                   # Document scanning engine
│   │   │   └── qr/                    # QR generation & validation
│   │   ├── engines/
│   │   │   ├── detentionEngine.js     # Detention charge calculation logic
│   │   │   ├── slotAllocator.js       # Dock slot allocation & priority engine
│   │   │   └── notificationRouter.js  # Alert routing (ops, security, driver)
│   │   └── middleware/
│   │       ├── auth.js
│   │       └── errorHandler.js
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.js
│   ├── uploads/documents/             # Scanned gate documents
│   ├── uploads/pods/                  # Digital POD images
│   ├── server.js
│   ├── package.json
│   └── Dockerfile
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── Dashboard.jsx
│       │   ├── Login.jsx
│       │   ├── Gate/
│       │   │   ├── CheckIn.jsx
│       │   │   ├── CheckOut.jsx
│       │   │   └── VehicleQueue.jsx
│       │   ├── Docks/
│       │   │   ├── Schedule.jsx
│       │   │   └── Availability.jsx
│       │   ├── Bays/
│       │   │   ├── BayMap.jsx
│       │   │   └── LoadingProgress.jsx
│       │   ├── Detention/
│       │   │   ├── ActiveCases.jsx
│       │   │   └── Approvals.jsx
│       │   └── Analytics/
│       ├── components/
│       │   ├── Layout/
│       │   └── common/
│       ├── api/client.js
│       └── context/AuthContext.jsx
├── mobile/                            # Driver-facing React Native app
│   └── src/
│       ├── screens/
│       │   ├── QRScan.jsx
│       │   ├── StatusUpdate.jsx
│       │   ├── DocumentUpload.jsx
│       │   ├── PODCapture.jsx
│       │   └── FacilityNav.jsx
│       └── api/client.js
├── docs/
│   ├── API.md
│   ├── ARCHITECTURE.md
│   ├── DEPLOYMENT.md
│   ├── ERP_INTEGRATION.md
│   ├── DETENTION_ENGINE.md
│   ├── DOCK_SCHEDULING.md
│   └── DRIVER_APP.md
├── docker-compose.yml
├── .env.example
├── CONTRIBUTING.md
└── LICENSE
```

**Tech Stack** — identical to the core HaulSync platform:

| Layer | Technology |
|-------|------------|
| **Backend** | Node.js 18, Express.js, Prisma ORM, PostgreSQL 15, Socket.io |
| **Frontend** | React 18, Vite, Tailwind CSS, React Router v6, Recharts |
| **Mobile** | React Native (Driver App) |
| **Auth** | JWT + bcrypt (shared session with HaulSync core if co-deployed) |
| **Realtime** | Socket.io for live bay status, dock queue updates, and push alerts |
| **Infra** | Docker, Docker Compose, Nginx (reverse proxy) |

---

## 🔄 In-Plant Lifecycle — How It Works

```
Vehicle Arrives at Gate
      │
      ▼
QR / Vehicle Verification → Document Scan → Gate-In Logged
      │
      ▼
Dock Slot Allocated (priority-based, buffer-aware)
      │
      ▼
Bay Assigned → Loading / Unloading Begins
      │
      ├── Material verification triggered
      └── Quality check integration (if configured)
      │
      ▼
ERP Goods Receipt Sync (via adapter — REST or webhook)
      │
      ▼
Loading Complete → Driver POD Captured
      │
      ├── On-time: Gate-Out logged, detention = ₹0
      └── Overdue: Detention timer triggers alert → Approval workflow
      │
      ▼
Gate-Out → TAT Recorded → Analytics Updated → Carrier Scorecard Refreshed
```

---

## 🚀 Quick Start (Docker — Recommended)

### Prerequisites
- Docker 24+
- Docker Compose v2+
- *(Optional)* Running HaulSync core instance for shared master data
- *(Optional)* ERP system with REST API or webhook support for GR/PO sync

### 1. Clone the repository

```bash
git clone https://github.com/your-org/haulsync-inplant.git
cd haulsync-inplant
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env — set DB credentials, JWT secret, ERP integration keys
nano .env
```

Key environment variables:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/haulsync_inplant

# Auth (use same JWT_SECRET as HaulSync core for SSO)
JWT_SECRET=your-secret-key

# Gate & QR
QR_SECRET=your-qr-signing-secret
GATE_NOTIFICATION_WEBHOOK=https://your-wms/api/gate-event   # optional

# Detention Engine
FREE_TIME_MINUTES=120                  # Default free time before detention starts
DETENTION_RATE_PER_HOUR=500           # ₹ per hour (overridable per vendor)
DETENTION_ALERT_AT_MINUTES=90         # Alert N minutes before free time expires
DETENTION_ESCALATE_AT_MINUTES=30      # Escalate N minutes after free time breach

# ERP Integration (optional — for GR/PO sync)
ERP_ADAPTER=generic                    # or: custom (implement IERPAdapter)
ERP_BASE_URL=https://your-erp/api
ERP_API_KEY=your-erp-api-key
ERP_GR_ENDPOINT=/goods-receipt
ERP_PO_LOOKUP_ENDPOINT=/purchase-orders

# Notifications
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=alerts@yourdomain.com
SMTP_PASS=your-smtp-password
FCM_SERVER_KEY=your-fcm-key           # For driver mobile app push notifications

# HaulSync Core (optional — for shared master data)
HAULSYNC_CORE_URL=http://localhost:5000
HAULSYNC_CORE_API_KEY=your-core-api-key
```

### 3. Launch all services

```bash
docker compose up -d
```

The backend automatically runs migrations and seeds on first boot.

### 4. Access the app

- **Frontend (Ops Dashboard)**: http://localhost:3003
- **Backend API**: http://localhost:5003
- **Health check**: http://localhost:5003/health

### Default credentials

| Email | Password | Role |
|-------|----------|------|
| `admin@haulsync.local` | `Admin@1234` | SUPER_ADMIN |
| `gatemanager@haulsync.local` | `Gate@1234` | GATE_MANAGER |
| `dockops@haulsync.local` | `Dock@1234` | DOCK_OPERATOR |
| `warehouse@haulsync.local` | `WH@1234` | WAREHOUSE_MANAGER |
| `finance@haulsync.local` | `Finance@1234` | FINANCE |
| `security@haulsync.local` | `Sec@1234` | SECURITY |

---

## 🛠️ Manual Setup (Development)

### Backend

```bash
cd backend
cp .env.example .env
npm install
npx prisma migrate dev
node prisma/seed.js
npm run dev
# API runs on http://localhost:5003
```

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
# UI runs on http://localhost:5176
```

### Driver Mobile App

```bash
cd mobile
cp .env.example .env
npm install
npx expo start
```

---

## 🚧 Gate Entry Automation

The gate module is the entry point for every in-plant event. It supports multiple check-in flows:

**QR-based check-in**: Drivers scan a pre-issued QR code (generated at booking/indent creation) at the gate terminal. The system verifies vehicle registration, validates the QR signature, and logs gate-in with timestamp.

**Manual check-in**: Gate staff can search by vehicle number, LR number, or PO reference for walk-in vehicles.

**Document scanning**: Gate terminal OCR captures LR copies, delivery challans, e-way bills, and weighbridge slips. Scanned documents are automatically linked to the visit record.

**Instant notification**: On gate-in, a push notification is dispatched to the assigned dock operator and warehouse manager with vehicle details, expected material, and dock slot.

```json
// Gate-in event payload (webhook-out to connected systems)
{
  "eventType": "GATE_IN",
  "visitId": "VIS-20240523-00147",
  "vehicle": { "regNo": "MH12AB1234", "type": "TRUCK_32FT" },
  "vendor": { "id": "uuid", "name": "ABC Transport" },
  "poReference": "PO-2024-08912",
  "gateInAt": "2024-05-23T09:14:32Z",
  "assignedDock": "DOCK-04",
  "documents": ["lr_scan.pdf", "eway_bill.pdf"]
}
```

---

## 🕐 Dock Scheduling

The dock scheduler manages slot allocation across all docks, preventing bunching and minimizing vehicle wait time at the gate.

**Smart slot allocation**: The scheduler assigns dock slots based on material type, vehicle size, dock equipment availability, and configured priority tiers (JIT vs standard inbound).

**Buffer time management**: Configurable buffer between consecutive slots prevents overrun spillover. Buffer duration is adjustable per dock and per shift.

**Priority override**: Operations managers can manually bump high-priority vehicles (JIT, express inbound) ahead in the queue with a reason log.

**Real-time availability dashboard**: A live heatmap shows all docks, their current status (available / occupied / buffer / maintenance), expected clearance time, and queue depth.

```json
// Dock slot configuration example
{
  "dockId": "DOCK-04",
  "slotDurationMinutes": 90,
  "bufferMinutes": 15,
  "operatingHours": { "start": "06:00", "end": "22:00" },
  "priority": {
    "JIT": 1,
    "STANDARD": 2,
    "RETURN": 3
  },
  "vehicleTypes": ["TRUCK_32FT", "TRUCK_24FT", "MINI_TRUCK"]
}
```

---

## 🏗️ Loading Bay Management

Each loading bay operates as an independent work unit tracked in real time.

**Bay assignment**: Once a vehicle enters the scheduled dock, it is assigned to a specific bay within that dock. Bay assignment considers material type, bay equipment (forklift, conveyor, dock leveller), and crew availability.

**Loading progress tracking**: Operators update loading/unloading progress in percentage increments via the ops dashboard or mobile app. Live progress is pushed to the gate module for accurate ETA calculation.

**Material verification**: Item-level or pallet-level quantity verification is logged against the inbound PO or outbound order. Discrepancies raise an exception in-app and trigger a notification to the warehouse manager.

**Quality check integration**: A configurable quality checkpoint can be inserted into the bay workflow. The vehicle cannot be released for gate-out until the QC officer marks the check complete and uploads findings.

**ERP Goods Receipt sync**: On loading completion, the module posts a structured Goods Receipt payload to the configured ERP adapter endpoint — automatically updating inventory records in your materials management system without manual re-entry.

---

## ⏱️ Detention Time Tracking

Detention tracking is fully automated and operates from gate-in to gate-out.

**Auto-calculation**: The detention engine continuously monitors active visits. Free time is configurable globally and per-vendor. Detention charges begin accruing automatically once free time expires, at the configured rate (₹ per hour or part thereof).

**Exception alerts**: An alert is dispatched to the assigned operator and vendor contact at a configurable lead time before free time expires, giving the team a window to expedite clearance.

**Approval workflow**: Detention waiver or adjustment requests are routed through a structured approval chain (Operator → Warehouse Manager → Finance). All approvals and rejections are timestamped and reason-logged.

**Historical analysis**: The detention analytics dashboard surfaces root-cause patterns — which docks, vendors, shifts, or material categories generate the most detention — enabling targeted process improvement.

```json
// Detention engine configuration (per-vendor override example)
{
  "vendorId": "uuid",
  "freeTimeMinutes": 180,
  "ratePerHour": 750,
  "alertLeadMinutes": 60,
  "escalateAfterBreachMinutes": 45,
  "approvalRequired": true,
  "approvers": ["WAREHOUSE_MANAGER", "FINANCE"]
}
```

**Typical impact**: Plants running 100+ daily inbound movements see ₹10–20L annual detention penalties eliminated within 2–3 months of deployment through early alerting and process accountability.

---

## 📱 Driver Mobile App

The driver-facing React Native app keeps the driver informed and engaged throughout the in-plant process without requiring visits to the ops office.

| Feature | Description |
|---------|-------------|
| 🔍 **QR Scan check-in** | Scan gate QR at arrival — no paperwork at the booth |
| 📍 **In-facility navigation** | Turn-by-turn directions from gate to assigned bay using facility map |
| 🔔 **Real-time push alerts** | Dock slot assignment, loading start, QC hold, and gate-out clearance |
| 📄 **Document upload** | Capture and upload LR, delivery challan, or e-way bill from phone camera |
| ✍️ **Digital POD** | Capture photo + e-signature proof of delivery directly in the app |
| 📊 **Visit status tracker** | Live status timeline from gate-in through to gate-out |

The driver app communicates with the backend over a dedicated mobile API with JWT sessions scoped to the active visit.

---

## 🔌 ERP Integration

HaulSync In-Plant is designed to slot natively into existing enterprise materials management workflows. The ERP adapter layer (`backend/src/integrations/erp/`) exposes a simple interface that any system can integrate with via REST or webhook.

**What integrates automatically:**

| Trigger | Action |
|---------|--------|
| Gate check-in with PO reference | PO details fetched and displayed to operator |
| Material verification complete | Quantity-matched GR payload posted to ERP |
| Quality check passed | GR status updated to approved in ERP |
| Detention charge raised | Cost document reference returned to finance module |

**Adding a custom ERP adapter**: Implement `IERPAdapter` in `backend/src/integrations/erp/` and register it in `registry.js`. The interface requires four methods: `lookupPO`, `postGoodsReceipt`, `updateGRStatus`, and `postCostDocument`. See [ERP Integration Guide](docs/ERP_INTEGRATION.md) for the full contract.

The generic adapter handles systems that expose standard REST endpoints out of the box — no code required, only environment variable configuration.

---

## 📊 Analytics & Reporting

HaulSync In-Plant ships with an automated analytics suite covering all in-plant KPIs:

| Report | Description |
|--------|-------------|
| **Average Turnaround Time** | Gate-in to gate-out TAT trends by vendor, vehicle type, dock, shift, and material category |
| **Dock Utilization Heatmap** | Slot occupancy by dock and hour across any date range — identifies bottlenecks and idle time |
| **Detention Cost Dashboard** | Total detention accrued, waived, and collected; trend by vendor and root cause |
| **Bay Performance Report** | Average loading time per bay, idle time, QC hold frequency, and discrepancy rate |
| **Carrier Scorecard** | On-time arrival vs slot, document compliance rate, quality failure rate, and average TAT per carrier |
| **Automated MIS** | Scheduled PDF/Excel delivery via email — configurable as daily, weekly, or monthly |

---

## 🏭 Perfect For

### Large Manufacturing Plants
Facilities handling 100+ inbound trucks daily with multiple docks and strict JIT delivery windows. Gate congestion, dock bunching, and missed JIT slots are eliminated through automated slot allocation, priority queuing, and ERP Goods Receipt sync that removes manual touchpoints between the dock and the inventory system.

### Distribution Centers
High-velocity cross-docking operations running 24/7 with rapid vehicle turnaround requirements. The real-time bay map, driver mobile app, and live TAT dashboard give ops managers instant visibility across every active movement on the floor.

### Warehouses with Detention Penalties
Operations losing ₹10–20L annually to detention charges due to process delays and manual tracking. Automated free-time monitoring, early alerts, and structured approval workflows cut detention to near-zero within a billing cycle.

---

## 🔐 Default Roles

| Role | Permissions |
|------|-------------|
| `SUPER_ADMIN` | Full access to all in-plant modules and system configuration |
| `ADMIN` | All operations except user management and detention rate config |
| `WAREHOUSE_MANAGER` | Manage bay assignments, approve exceptions, view analytics |
| `GATE_MANAGER` | Gate check-in/out, vehicle verification, document management |
| `DOCK_OPERATOR` | Dock slot management, loading progress updates, material verification |
| `FINANCE` | Detention charge review, approval, cost report access |
| `SECURITY` | Gate check-in, vehicle number lookup, document scan only |
| `VIEWER` | Read-only access to assigned modules |

---

## 🔗 Integration with HaulSync Core

HaulSync In-Plant is designed to run standalone or as part of the broader HaulSync platform.

**Standalone mode**: Uses its own vendor, vehicle, and driver master. Fully self-contained. Connect any ERP or TMS via the REST/webhook adapter.

**Integrated mode**: Connects to a running HaulSync core instance to share transporter/vendor master data, vehicle and driver registry, user accounts with RBAC via shared JWT, and trip/shipment data from the FTL or PTL modules.

**Multi-module integration**: When co-deployed with HaulSync FTL or PTL, vehicle arrivals from active trips automatically pre-populate gate check-in details — no manual entry for expected inbound vehicles.

Set `HAULSYNC_CORE_URL` in `.env` to enable integrated mode.

---

## 📖 Documentation

- [API Reference](docs/API.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Architecture Overview](docs/ARCHITECTURE.md)
- [Dock Scheduling Guide](docs/DOCK_SCHEDULING.md)
- [Detention Engine Configuration](docs/DETENTION_ENGINE.md)
- [ERP Integration Guide](docs/ERP_INTEGRATION.md)
- [Driver App Setup](docs/DRIVER_APP.md)
- [Contributing Guide](CONTRIBUTING.md)

---

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

```bash
# Fork the repo, then:
git checkout -b feature/your-feature-name
git commit -m "feat: add your feature"
git push origin feature/your-feature-name
# Open a Pull Request
```

---

## 📜 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgements

Part of the HaulSync open-source logistics ecosystem. Built with ❤️ for the freight and manufacturing community.
