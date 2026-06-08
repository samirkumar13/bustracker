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

## Start Everything

```powershell
docker-compose up -d                          # PostgreSQL :5432
cd backend && npm run dev                     # API :3000
cd web && npm run dev                         # Web admin :5173
cd mobile && npx expo start --clear           # press 'a' for Android emulator
cd simulator && node gps-simulator.js         # mock GPS (set BUS_ID inside the file)
cd simulator && node nfc-simulator.js         # mock NFC attendance
```

Mobile `.env` must point to your machine's LAN/hotspot IP:
```env
EXPO_PUBLIC_API_URL=http://172.20.x.x:3000/api
EXPO_PUBLIC_SOCKET_URL=http://172.20.x.x:3000
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

## What's Left

| Item | Notes |
|------|-------|
| Push notifications (background) | Needs `eas build --profile development` + FCM |
| Production deployment | VPS + HTTPS + env vars |
| Phase 2: multi-tenant | Per-school isolation, SCHOOL_ADMIN role, billing |
| Arduino: flash + wire | Sketches done; waiting on hardware |
