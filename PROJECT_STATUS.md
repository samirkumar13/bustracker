# BusTracker — Project Status
Last updated: 2026-06-13

---

## 🚀 Live Deployment

| Service | URL | Platform |
|---------|-----|----------|
| Backend API | https://bustracker-production-b1c6.up.railway.app | Railway (Hobby) |
| Web Admin | https://bustracker-xi.vercel.app | Vercel |
| Database | Neon `ap-southeast-1` (Singapore) | Neon free tier |
| Android APK | Built via EAS — `eas build --platform android --profile preview` | EAS Build |

**Demo accounts:** `admin@school.com` / `admin123` · `driver@school.com` / `driver123` · `parent@school.com` / `parent123`

> **DNS note:** Some networks (corporate/filtered) block Railway domains. Use 8.8.8.8 DNS or mobile data (Jio works fine).

---

## ✅ Done

### Infrastructure
- Docker/PostgreSQL · Backend `:3000` · Web admin `:5173` · Monorepo structure
- Full Prisma schema with migrations + seed script
- **Live on Railway + Neon + Vercel** (see above)

### Backend
- Models: User, Bus, Driver, Route, Stop, Student, Parent, BusLocation, Attendance, **AuditLog**
- JWT auth (7d) + RBAC (ADMIN / DRIVER / PARENT)
- Full REST API — buses, routes, users, students, stops, attendance, audit-logs
- Socket.IO — GPS broadcast, NFC attendance events
- Arduino endpoints (device-key auth) — GPS + NFC
- Zod input validation on all mutating routes (`schemas.js` + `validate.js` middleware)
- Seed script with demo data

### Web Admin (React + Vite + react-leaflet)
- Login page
- Dashboard — summary cards
- Buses — CRUD, assign driver + route
- Routes — map-based stop picker (click map to place stops)
- Users — list, delete
- Students — CRUD, NFC card assignment, route/stop assignment, copy student code
- Attendance — live socket feed, auto-updating table
- Live Map — all active buses with real-time positions, OSRM road routing per route, FitBounds on load
- **Audit Log** — colour-coded table of all admin actions (last 200), timestamp / user / action / resource / detail / IP

### Mobile (Expo SDK 56 / React Native)
- Login screen (validation)
- Register screen — PARENT only, **consent checkbox required** before account creation
- Home screen — bus list with live tracking badge
- BusTrackingScreen — Leaflet WebView map, OSRM road-following route lines, ETA per stop timeline, live bus position (🚌 emoji marker, no zoom jitter)
- DriverScreen — broadcasts GPS position every 2s via Socket.IO
- AttendanceScreen — live NFC feed, aggregates all linked children
- ProfileScreen — parent links child by code, **account deletion** (password confirmation)
- Role-based tab navigation (PARENT tabs / DRIVER tabs)

### Maps & Routing
- OpenStreetMap tiles (CARTO Positron, no API key required)
- **OSRM** real-road routing (`router.project-osrm.org`) — both web Live Map and mobile BusTrackingScreen draw routes that follow actual roads, not straight lines

### Data Privacy
- **GPS cleanup cron** — `BusLocation` records older than 90 days deleted daily at 2 AM (`node-cron`)
- **Consent on registration** — mobile Register screen has mandatory consent checkbox; button disabled until checked
- **Account deletion** — `DELETE /api/users/me` (PARENT only): verifies password, unlinks children, deletes user in a transaction
- **Audit logging** — every student CRUD, account deletion, and child-link action is written to `AuditLog` table (survives user deletion — no FK to User intentionally). View in web admin at `/audit`

### Standalone Android APK
- **EAS Build** — `eas build --platform android --profile preview` outputs a direct-install `.apk`
- `eas.json` `preview` profile bakes in Railway URLs at build time via `EXPO_PUBLIC_*` env vars
- `expo-dev-client` removed — APK opens directly into the app, not Expo launcher

### Simulators
- `gps-simulator.js` — moves bus along route waypoints every 2s
- `nfc-simulator.js` — fires attendance events (BOARDED/EXITED)

### Arduino (code ready, hardware pending)
- `gps_tracker/` — ESP32 + NEO-6M, posts GPS every 5s to `/api/arduino/gps`
- `nfc_attendance/` — ESP32 + RC522, scans Mifare cards, buzzer + LED feedback

### Security
- JWT auth (7d) + bcrypt password hashing
- RBAC per route + **object-level IDOR checks** (parents see only their own children; bus rosters admin-only)
- Zod validation on all mutating endpoints
- **Socket.IO events scoped to private rooms** (`parent:<id>`, `admins`, `bus:<id>`) — never broadcast globally
- `JWT_SECRET` startup guard (throws in production if missing/default)
- Password-confirmed account deletion; `.env` gitignored; Arduino device-key auth
- **`helmet`** — sets `X-Frame-Options`, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, etc.
- **`express-rate-limit`** on `/api/auth/*` — 20 attempts / IP / 15 min, `429` + `RateLimit-*` headers
- **CORS locked down** — `origin:'*'` replaced with `CLIENT_URL` allowlist (comma-sep for multiple origins)

---

## 🔲 Remaining

| Item | Priority | Notes |
|------|----------|-------|
| Mobile Login — add email-format validation | Low | |
| Web Buses form — capacity field accepts 0 / negative | Low | |
| Push notifications (background) | Medium | Requires `eas build --profile development` + FCM config |
| **Security hardening for prod** | Medium | HTTPS already handled by Railway/Vercel; remaining: per-device Arduino keys, rotate GitHub token in git remote |
| Neon auto-suspend | Low | Disable in Neon dashboard → Compute → Edit to eliminate cold-start delay |
| **Phase 2: Multi-tenant** | Next big feature | Per-school data isolation, SCHOOL_ADMIN role, subscription billing, super-admin portal |
| Arduino — flash + wire | When hardware arrives | Sketches ready; needs WiFi/SERVER_URL/BUS_ID config |

---

## Data Model Summary (Phase 1)

```
User (ADMIN / DRIVER / PARENT)
  └─ Driver → Bus (one-to-one)
  └─ Parent → Student[] (linked by studentCode)

School → Bus[] · Route[] · Student[]
Route → Stop[] · Bus (one-to-one)
Student → Route · Stop · Parent (optional)

BusLocation  (GPS history — auto-purged after 90 days)
Attendance   (NFC scan events)
AuditLog     (admin action log — no FK to User, survives deletion)
```

Students are **school-managed records, not login accounts**. Each has a `studentCode` (e.g. `STU-AB12C`) that parents enter in the app to link their child.
