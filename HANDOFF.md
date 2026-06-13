# BusTracker — Handoff
> Read at the start of every session

## Stack
- **Backend:** Node.js + Express + Prisma + Socket.IO + PostgreSQL (Docker)
- **Mobile:** Expo SDK 56 + React Native 0.85.3 + Leaflet (WebView)
- **Web:** React + Vite + react-leaflet
- **Maps:** OpenStreetMap (CARTO tiles, no key) + OSRM road routing (free, no key)
- **Auth:** JWT 7d — payload: `{ id, name, email, role }`
- **Validation:** Zod on all backend mutating routes

---

## Live Deployment

| Service | URL |
|---------|-----|
| Backend API | https://bustracker-production-b1c6.up.railway.app |
| Web Admin | https://bustracker-xi.vercel.app |
| Database | Neon PostgreSQL `ap-southeast-1` |

**Railway env vars:**
```
DATABASE_URL   = <Neon connection string>
JWT_SECRET     = <strong secret>
NODE_ENV       = production
PORT           = 3000
CLIENT_URL     = https://bustracker-xi.vercel.app
ARDUINO_DEVICE_KEY = <key>
```

**Railway start command:** `npm start` (migrations managed via `db push` — do NOT use `prisma migrate deploy` as schema was bootstrapped with `db push --force-reset`)

**Vercel env vars:**
```
VITE_API_URL    = https://bustracker-production-b1c6.up.railway.app/api
VITE_SOCKET_URL = https://bustracker-production-b1c6.up.railway.app
```

> **DNS:** Some networks block Railway domains. Use 8.8.8.8 DNS or mobile data for testing.

---

## Start Everything (local dev)

```powershell
docker-compose up -d                          # PostgreSQL :5432
cd backend && npm run dev                     # API :3000
cd web && npm run dev                         # Web admin :5173
cd mobile && npx expo start --clear           # press 'a' for Android emulator
cd simulator && node gps-simulator.js         # mock GPS (set BUS_ID inside the file)
cd simulator && node nfc-simulator.js         # mock NFC attendance
```

Mobile `.env` — for local dev point to your machine's LAN/hotspot IP, or use the live backend:
```env
EXPO_PUBLIC_API_URL=https://bustracker-production-b1c6.up.railway.app/api
EXPO_PUBLIC_SOCKET_URL=https://bustracker-production-b1c6.up.railway.app
```

---

## Test Accounts

| Role   | Email               | Password  |
|--------|---------------------|-----------|
| ADMIN  | admin@school.com    | admin123  |
| DRIVER | driver@school.com   | driver123 |
| PARENT | parent@school.com   | parent123 |

Demo students: `STU-DEMO1` (Alex Kumar — linked) · `STU-DEMO2` (Priya Sharma — unlinked)

Re-seed: `cd backend && npx prisma db seed`

> After re-seeding, update `BUS_ID` in `simulator/gps-simulator.js` with the new bus cuid from the DB.

---

## Build Standalone APK

### EAS Build (recommended — no Android Studio needed)
```powershell
npm install -g eas-cli
eas login                                      # expo.dev account
cd mobile
eas build:configure                            # links project to Expo account
eas build --platform android --profile preview # outputs .apk (~10-15 min cloud build)
```
Download link appears in terminal and at expo.dev/builds.
`preview` profile in `eas.json` bakes in the Railway URLs automatically.

### Local build (Android Studio)
```bash
cd mobile

# Pre-bundle JS (run every time JS changes)
npx expo export:embed \
  --platform android --dev false \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res

# Package (only needed when native code / deps change)
cd android && ./gradlew assembleDebug
# APK: android/app/build/outputs/apk/debug/app-debug.apk
```

Notes:
- `expo-dev-client` is **not** in dependencies — APK opens directly into the app
- `bundleInDebug=true` does NOT work with Expo SDK 56 — use `export:embed` instead
- `android/local.properties` must contain `sdk.dir=C\:\\Users\\Samir\\AppData\\Local\\Android\\Sdk`

---

## Project Structure

```
backend/src/
  controllers/    auth (login/register/me)
  routes/         buses, routes, users, students, stops, attendance, auditLogs, arduino
  middleware/     auth.js (JWT), validate.js (Zod)
  services/       socketService.js, auditService.js
  jobs/           cleanupGpsData.js (cron — deletes GPS > 90 days, runs daily 2 AM)
  schemas.js      Zod schemas for all inputs

mobile/src/
  screens/        Login, Register (consent checkbox), Home, BusTrackingScreen,
                  DriverScreen, AttendanceScreen, ProfileScreen (delete account)
  components/     LeafletMap.js (WebView — Leaflet + OSRM routing inside browser JS)
  navigation/     role-based tabs
  services/       api.js, socket.js
  context/        AuthContext

web/src/
  pages/          Dashboard, Buses, Routes, Users, Students, Attendance,
                  LiveMap (OSRM routing + FitBounds), AuditLog
  components/     Sidebar.jsx (sticky, scrollable, sign-out always visible)
  context/        AuthContext

simulator/        gps-simulator.js · nfc-simulator.js
arduino/          gps_tracker/ · nfc_attendance/
```

---

## Data Model

```
User (ADMIN | DRIVER | PARENT)
  Driver → Bus (1:1)
  Parent → Student[] (linked via studentCode)

School → Bus[], Route[], Student[]
Route  → Stop[], Bus (1:1)
Student → Route, Stop, Parent (all optional in Phase 1)

BusLocation  busId, lat, lng, speed, source, timestamp  ← auto-purged >90d
Attendance   studentId, busId, status (BOARDED|EXITED), timestamp
AuditLog     userId, userName, action, targetType, targetId, detail (JSON), ip, createdAt
             !! No FK to User — logs survive user deletion !!
```

**Students are records, not logins.** Admin creates them in the web portal. Parent enters `studentCode` in the app to link.

---

## Key Implementation Notes

### OSRM Routing
- URL: `https://router.project-osrm.org/route/v1/driving/{lng,lat};{lng,lat}?overview=full&geometries=geojson`
- Response coords are `[lng, lat]` — must flip to `[lat, lng]` for Leaflet
- Web: fetched in `LiveMap.jsx` after buses load; mobile: fetched inside WebView JS in `LeafletMap.js`

### Map (Mobile)
- Leaflet runs inside a WebView (`<WebView source={{ html: ... }} />`)
- Bus marker: 🚌 emoji, 40×40px orange circle background
- `updateBus()` calls `map.setView()` only on first placement — subsequent updates only move the marker (prevents zoom jitter)

### Audit Logging
- `auditService.js` — `audit(req, action, targetType, targetId?, detail?)` — never throws
- Wired in: `students.js` (CREATED/UPDATED/DELETED), `users.js` (CHILD_LINKED, ACCOUNT_DELETED, USER_DELETED)
- AuditLog has no FK to User — intentional, logs persist after user deletion

### JWT Payload
`{ id, name, email, role }` — `name` was added; users on old tokens need to re-login once to get the `name` field. `auditService` falls back to `email` if `name` missing.

### Windows: Prisma DB Push
Kill all Node processes before `npx prisma db push` to release the DLL lock:
```powershell
Stop-Process -Name "node" -Force
```

---

## Security

**Implemented:** JWT + bcrypt, RBAC per route, object-level IDOR checks
(parents see only their own children; bus rosters admin-only), Zod validation,
Socket.IO events scoped to private rooms (`parent:<id>`, `admins`, `bus:<id>`)
never global, password-confirmed account deletion, `JWT_SECRET` startup guard
(throws in prod if missing/default), `.env` gitignored, audit logging,
`helmet` security headers, `express-rate-limit` on `/api/auth/*` (20 req / 15 min),
CORS locked down to `CLIENT_URL` allowlist.

**Before production (remaining checklist):**
- Per-device Arduino keys (currently one shared `ARDUINO_DEVICE_KEY`)
- Rotate the GitHub token embedded in the git remote URL; use SSH instead
- Disable Neon compute auto-suspend (Neon dashboard → Compute → Edit) to eliminate cold-start delays

**CORS note for dev:** set `CLIENT_URL` to a comma-separated list when using a hotspot IP:
```env
CLIENT_URL="http://localhost:5173,http://172.20.197.199:5173"
```
React Native sends no `Origin` header so the mobile app is always allowed regardless.

> Realtime gotcha: parents auto-join `parent:<userId>` and admins join `admins`
> on socket connect (see socketService). Attendance events use `attendance:update`
> (to the parent room) and `attendance:new` (to admins) — NOT a global emit.

## What's Left

| Item | Notes |
|------|-------|
| Push notifications (background) | Needs `eas build --profile development` + FCM |
| Phase 2: multi-tenant | Per-school isolation, SCHOOL_ADMIN role, billing |
| Arduino: flash + wire | Sketches done; waiting on hardware |
| Neon auto-suspend off | Dashboard → Compute → Edit → disable suspend |
