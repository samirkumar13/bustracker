# BusTracker — Project Status
Last updated: 2026-06-08

## ✅ Done

**Infrastructure** — Docker/PostgreSQL, backend :3000, web :5173, monorepo

**Backend** — Full Prisma schema (User/Bus/Driver/Route/Stop/Student/Parent/BusLocation/Attendance), JWT auth + RBAC (ADMIN/DRIVER/PARENT/STUDENT), REST API, Socket.IO (GPS broadcast + attendance events), Arduino endpoints (device-key auth), Zod validation on all mutating routes (`src/schemas.js` + `src/middleware/validate.js`), seed script

**Mobile** — Login/Register, HomeScreen (bus list + live badge), BusTrackingScreen (OSM map + ETA stop timeline), DriverScreen (GPS broadcast), AttendanceScreen (live NFC feed), ProfileScreen (parent links child, student picks stop), role-based tabs, push notifications (Alert.alert fallback in Expo Go; dev build config via eas.json + expo-dev-client)

**Web admin** — Login, Dashboard, Buses (create/assign driver+route), Routes (map-based stop picker), Users (NFC card assignment), Attendance (today's log), Live Map

**ETA per stop** — `computeEtas()` in BusTrackingScreen: haversine distance, nearest-stop heuristic, speed from socket (20 km/h fallback). Stop timeline shows Passed / Next·N min / Arriving now / ~N min. Leaflet dot colours update live.

**Simulators** — GPS moves bus along route; NFC triggers attendance + parent alert
```
cd simulator && node gps-simulator.js   # BUS_ID set in script
cd simulator && node nfc-simulator.js
```

**Arduino sketches** — ESP32+NEO-6M (GPS, posts every 5s), ESP32+RC522 (NFC, buzzer+LED). Hardware pending.

---

## 🔲 Remaining

| Item | Priority |
|------|----------|
| Mobile input validation — Register (email format, password ≥6), Login (email format), link-child (email format + error message) | High |
| Web Buses form — capacity field accepts 0/negative | Low |
| `eas init` → `eas build --profile development` (real push notifications) | Medium |
| Production deployment — VPS, Docker, reverse proxy, HTTPS, env vars | Medium |
| Arduino — flash sketches, wire modules, configure WiFi/SERVER_URL/BUS_ID | When hardware arrives |

---

## Hardware (per bus)
2× ESP32 DevKit v1 · NEO-6M GPS · RC522 RFID · Mifare cards · 4G router or hotspot
Server: Hetzner CX22 ($6/mo, 2 vCPU 4GB) handles most school sizes
