# BusTracker — Handoff
> Read at the start of every session

## Stack
Backend: Node.js + Express + Prisma + Socket.IO + PostgreSQL (Docker)
Mobile: Expo SDK 56 + React Native + Leaflet (WebView)
Web: React + Vite + react-leaflet | Maps: OpenStreetMap + CARTO (free, no key)
Auth: JWT 7d | Validation: Zod on all backend routes

## Start
```powershell
docker-compose up -d                          # DB :5432
cd backend && npm run dev                     # API :3000
cd web && npm run dev                         # Admin :5173
cd mobile && npx expo start --clear           # press 'a' for Android
cd simulator && node gps-simulator.js         # mock GPS
cd simulator && node nfc-simulator.js         # mock NFC
```

## Test accounts
| Role    | Email                | Password   |
|---------|----------------------|------------|
| ADMIN   | admin@school.com     | admin123   |
| DRIVER  | driver@school.com    | driver123  |
| PARENT  | parent@school.com    | parent123  |
| STUDENT | student@school.com   | student123 |

Bus ID: `cmpz44rar000bkmv7olehpymn` (BUS-001)

## Structure
```
backend/src/  controllers/ routes/ middleware/ services/
mobile/src/   screens/ components/ services/ navigation/ context/
web/src/      pages/ components/ context/
simulator/    gps-simulator.js  nfc-simulator.js
arduino/      gps_tracker/  nfc_attendance/
```

## What's done
- Full API + Socket.IO (GPS broadcast, NFC attendance, live map)
- All mobile screens: Home, BusTracking (ETA per stop), Driver, Attendance, Profile
- Web admin: Buses, Routes, Users, Attendance, Live Map
- Zod validation on all backend mutating endpoints
- ETA per stop — haversine + nearest-stop, updates live from socket speed
- Push notifications — Alert.alert fallback in Expo Go; eas.json + expo-dev-client ready for dev build
- Arduino sketches ready (ESP32 + NEO-6M GPS, ESP32 + RC522 NFC) — hardware pending

## Remaining
- Mobile input validation (Register: no email format/password length; link-child: silent fail)
- Web Buses form: capacity accepts 0/negative
- `eas init` + `eas build --profile development` for real push notifications
- Production deployment (VPS + HTTPS)
- Arduino: flash + wire when hardware arrives
