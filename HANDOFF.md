# BusTracker — Handoff Note
> Read this at the start of every new chat session

## What is this project?
A school bus tracking system with:
- **Mobile app** (Expo/React Native) — parents, students, drivers
- **Web admin** (React + Vite) — manage buses, routes, users
- **Backend** (Node.js + Express + Socket.IO + Prisma)
- **Database** (PostgreSQL via Docker)
- **Simulators** — mock GPS + NFC for testing without hardware
- **Arduino sketches** — GPS tracker + NFC attendance (hardware pending)

## How to start everything
```powershell
# Terminal 1 — Database
docker-compose up -d

# Terminal 2 — Backend
cd backend && npm run dev         # → http://localhost:3000

# Terminal 3 — Web Admin
cd web && npm run dev             # → http://localhost:5173

# Terminal 4 — Mobile
cd mobile && npx expo start --clear   # press 'a' for Android emulator
```

## Test accounts
| Role    | Email                | Password  |
|---------|----------------------|-----------|
| ADMIN   | admin@school.com     | admin123  |
| DRIVER  | driver@school.com    | driver123 |
| PARENT  | parent@school.com    | parent123 |
| STUDENT | student@school.com   | student123|

## Key IDs (from DB)
- Bus ID: `cmpz44rar000bkmv7olehpymn` (BUS-001)

## Run simulators (test without hardware)
```powershell
# GPS — moves bus along route on map
cd simulator && node gps-simulator.js

# NFC — type card UIDs to simulate student tap
cd simulator && node nfc-simulator.js
```

## Tech stack
- Backend: Node.js + Express + Prisma + Socket.IO + PostgreSQL
- Mobile: Expo SDK 56 + React Native + react-native-webview (Leaflet maps)
- Web: React + Vite + Leaflet (react-leaflet)
- Maps: OpenStreetMap + CARTO tiles (FREE, no API key)
- Auth: JWT (7 day expiry, auto-logout on 401)

## Known issues / next steps
- Push notifications disabled in Expo Go (SDK 53+) — need dev build for real notifications
- Arduino hardware not yet connected — sketches ready in /arduino folder
- ETA per stop not built yet
- Production deployment not done

## Project structure
```
bustracker/
├── backend/         Node.js API + Socket.IO
├── mobile/          Expo React Native app
├── web/             React admin dashboard
├── simulator/       GPS + NFC mock scripts
├── arduino/         Hardware sketches (pending)
├── docker-compose.yml
├── PROJECT_STATUS.md   ← full detailed status
└── HANDOFF.md          ← this file
```

## What was last worked on
- Complete web UI redesign (light theme, Inter font, CARTO maps)
- Fixed push notifications crash in Expo Go
- All 6 major bugs fixed (driver assignment, attendance, parent linking etc.)
- Simulators working and tested
