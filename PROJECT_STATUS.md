# BusTracker — Project Status

Last updated: 2026-06-04

---

## ✅ DONE

### Infrastructure
- [x] Monorepo structure (`backend/`, `mobile/`, `web/`, `arduino/`)
- [x] Docker Compose — PostgreSQL on `localhost:5432`
- [x] Backend running on `http://localhost:3000`
- [x] Web Admin running on `http://localhost:5173`

### Backend (Node.js + Express + Prisma + Socket.IO)
- [x] Full DB schema — User, Bus, Driver, Route, Stop, Student, Parent, BusLocation, Attendance
- [x] JWT Auth + role-based middleware (ADMIN, DRIVER, PARENT, STUDENT)
- [x] REST API — auth, buses, routes, stops, users, attendance
- [x] Real-time Socket.IO — GPS broadcast + attendance events
- [x] Arduino endpoints (device key auth, no JWT)
  - POST `/api/attendance/gps` — receives GPS from Arduino
  - POST `/api/attendance/scan` — receives NFC tap from Arduino
- [x] Student self-assignment endpoint (route + stop)
- [x] Seed script — school, bus, route, 4 stops, 4 test users

### Mobile App (Expo / React Native)
- [x] Login & Register screens (PARENT / STUDENT roles)
- [x] HomeScreen — lists all buses with live/offline badge
- [x] BusTrackingScreen — OSM map, live bus marker, stops, polyline
- [x] DriverScreen — OSM map with GPS broadcasting + trail
- [x] ProfileScreen — user info, student picks route & stop
- [x] AttendanceScreen — NFC scan history, live alerts via socket
- [x] Bottom tab navigation (Buses / Attendance / Profile)
- [x] Push notifications — parent alerted on child NFC scan
- [x] OpenStreetMap (free, no API key)
- [x] Role-based routing (Driver gets different tabs)

### Web Admin Dashboard (React + Vite)
- [x] Login (admin only, pre-filled with seed credentials)
- [x] Dashboard — stats + Arduino endpoint reference
- [x] Buses page — add bus, assign driver & route
- [x] Routes page — create routes with ordered stops
- [x] Users page — view all users by role, assign NFC card UIDs
- [x] Attendance page — today's scan log, boarded/exited counts
- [x] Map-based stop picker — click map to place stops (no lat/lng typing)
- [x] Token expiry — auto logout on 401, web redirects to /login
- [x] Error screens with Retry button on all mobile screens
- [x] Parent-child linking — parent links by student email in Profile screen
- [x] App name "BusTracker", blue splash, android package ID set
- [x] Simulator auto-logins (no hardcoded expiring token)
- [x] Attendance screen shows parent's children's records (not parent's own)
- [x] NFC card status visible per student in admin Users table
- [x] Live Map — real-time OSM map of all active buses

### Arduino / Hardware (Code ready, hardware pending)
- [x] GPS Tracker sketch — ESP32 + NEO-6M, posts every 5s
- [x] NFC Attendance sketch — ESP32 + RC522, buzzer + LED feedback
- [x] Both sketches send to backend with device key auth

---

## ✅ SIMULATORS (test without hardware)

```bash
# GPS Simulator — moves bus along route on the map
cd simulator
BUS_ID=cmpz44rar000bkmv7olehpymn ADMIN_TOKEN=<token> node gps-simulator.js

# NFC Simulator — type card UIDs to simulate student tap
BUS_ID=cmpz44rar000bkmv7olehpymn node nfc-simulator.js
```

## 🔲 WHEN HARDWARE ARRIVES

- [ ] Flash GPS sketch to ESP32, wire NEO-6M module
- [ ] Flash NFC sketch to second ESP32, wire RC522 reader
- [ ] Update `WIFI_SSID`, `WIFI_PASSWORD`, `SERVER_URL`, `BUS_ID` in sketches
- [ ] Assign NFC card UIDs to students via Admin Dashboard → Users
- [ ] Test full flow: student taps → parent gets notification
- [ ] Mount GPS unit on bus, test live tracking

## 🔲 FUTURE IMPROVEMENTS
- [x] ETA calculation per stop (client-side, haversine + nearest-stop heuristic)
- [ ] Production deployment (backend on VPS, mobile build via EAS)
- [ ] Input validation (Zod) on all backend routes

---

## 🚀 HOW TO RUN

```bash
# 1. Start database
docker-compose up -d

# 2. Start backend  (in /backend)
npm run dev

# 3. Start web admin  (in /web)
npm run dev        → http://localhost:5173
                     login: admin@school.com / admin123

# 4. Start mobile app  (in /mobile)
npx expo start --clear   # press 'a' for Android
```

## 🧪 TEST ACCOUNTS
| Role    | Email                | Password  |
|---------|----------------------|-----------|
| ADMIN   | admin@school.com     | admin123  |
| DRIVER  | driver@school.com    | driver123 |
| PARENT  | parent@school.com    | parent123 |
| STUDENT | student@school.com   | student123|

---

## 📁 PROJECT STRUCTURE

```
bustracker/
├── backend/
│   ├── prisma/schema.prisma + seed.js
│   └── src/
│       ├── controllers/   auth, bus, route
│       ├── routes/        auth, buses, routes, stops, users, attendance
│       ├── middleware/    auth.js
│       └── services/      socketService.js
├── mobile/
│   └── src/
│       ├── screens/       Login, Register, Home, BusTracking, Driver, Profile, Attendance
│       ├── navigation/    AppNavigator (role-based tabs)
│       ├── context/       AuthContext
│       ├── components/    LeafletMap, DriverMap
│       └── services/      api.js, socket.js, notifications.js
├── web/
│   └── src/
│       ├── pages/         Login, Dashboard, Buses, Routes, Users, Attendance, LiveMap
│       ├── components/    Sidebar
│       └── context/       AuthContext
├── arduino/
│   ├── gps_tracker/       gps_tracker.ino
│   └── nfc_attendance/    nfc_attendance.ino
├── docker-compose.yml
└── PROJECT_STATUS.md
```
