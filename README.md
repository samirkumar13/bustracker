# BusTracker

School bus tracking system — parents track their child's bus in real time, drivers broadcast GPS, and school admins manage everything from a web dashboard.

**Stack:** Node.js + Express + Prisma + Socket.IO + PostgreSQL · Expo SDK 56 / React Native · React + Vite · OpenStreetMap + OSRM routing

---

## Quick Start

### 1. Start the database
```bash
docker-compose up -d
```

### 2. Start the backend
```bash
cd backend
cp .env.example .env        # already pre-configured for Docker defaults
npm install
npm run db:generate
npm run db:migrate          # name it: init
npm run db:seed             # creates demo accounts + bus + route
npm run dev                 # runs on http://localhost:3000
```

### 3. Start the web admin
```bash
cd web
npm install
npm run dev                 # runs on http://localhost:5173
```

### 4. Start the mobile app (Expo Go / Android)
```bash
cd mobile
npm install
# Edit mobile/.env — set your machine's local IP (hotspot or LAN):
#   EXPO_PUBLIC_API_URL=http://192.168.x.x:3000/api
#   EXPO_PUBLIC_SOCKET_URL=http://192.168.x.x:3000
npx expo start --clear
# Press 'a' for Android emulator, or scan QR with Expo Go
```

### 5. Run the GPS simulator (optional)
```bash
cd simulator
node gps-simulator.js       # moves a bus along its route every 2s
node nfc-simulator.js       # fires NFC attendance events
```

---

## Building a Standalone Android APK

The JS bundle must be pre-built before Gradle packages it:

```bash
cd mobile

# 1. Bundle JavaScript
npx expo export:embed \
  --platform android \
  --dev false \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res

# 2. Package into APK
cd android
./gradlew assembleDebug

# Output: android/app/build/outputs/apk/debug/app-debug.apk
```

> Repeat step 1 every time you change JS code. Gradle only needs re-run if native code / dependencies change.

---

## Project Structure

```
bustracker/
├── backend/                  # API server
│   ├── prisma/               # schema.prisma + seed + migrations
│   └── src/
│       ├── controllers/      # auth logic
│       ├── routes/           # REST endpoints
│       ├── middleware/       # JWT auth, Zod validation
│       ├── services/         # socketService, auditService
│       └── jobs/             # cleanupGpsData (cron)
├── mobile/                   # React Native (Expo SDK 56)
│   └── src/
│       ├── screens/          # Home, BusTracking, Driver, Attendance, Profile, Register
│       ├── components/       # LeafletMap (WebView + OSRM routing)
│       ├── navigation/       # role-based tab navigator
│       ├── services/         # api.js, socket.js
│       └── context/          # AuthContext
├── web/                      # React admin dashboard (Vite)
│   └── src/
│       ├── pages/            # Dashboard, Buses, Routes, Users, Students,
│       │                     #   Attendance, LiveMap, AuditLog
│       ├── components/       # Sidebar
│       ├── services/         # api.js
│       └── context/          # AuthContext
├── simulator/
│   ├── gps-simulator.js
│   └── nfc-simulator.js
├── arduino/
│   ├── gps_tracker/          # ESP32 + NEO-6M — posts GPS every 5s
│   └── nfc_attendance/       # ESP32 + RC522 — scans NFC cards
└── docker-compose.yml
```

---

## Environment Variables

### backend/.env
```env
DATABASE_URL="postgresql://bustracker:bustracker123@localhost:5432/bustracker"
JWT_SECRET="change-this-in-production"
PORT=3000
```

### mobile/.env
```env
EXPO_PUBLIC_API_URL=http://<YOUR_LAN_IP>:3000/api
EXPO_PUBLIC_SOCKET_URL=http://<YOUR_LAN_IP>:3000
```

> Use your machine's IP on the same network as the phone (hotspot or WiFi). `localhost` does not work from a physical device.

---

## Test Accounts

| Role   | Email               | Password  |
|--------|---------------------|-----------|
| ADMIN  | admin@school.com    | admin123  |
| DRIVER | driver@school.com   | driver123 |
| PARENT | parent@school.com   | parent123 |

**Students are records, not login accounts** (Phase 1). Admin creates them in the web portal; each gets a code that parents enter in the app to link their child.

| Code       | Student       | Status                         |
|------------|---------------|--------------------------------|
| STU-DEMO1  | Alex Kumar    | Linked to parent@school.com    |
| STU-DEMO2  | Priya Sharma  | Unlinked — use to test linking |

---

## API Overview

| Method | Endpoint                     | Auth          | Description                        |
|--------|------------------------------|---------------|------------------------------------|
| POST   | /api/auth/register           | Public        | Register (PARENT only from app)    |
| POST   | /api/auth/login              | Public        | Login → JWT                        |
| GET    | /api/auth/me                 | Any           | Current user profile               |
| POST   | /api/users/link-child        | PARENT        | Link student by code               |
| DELETE | /api/users/me                | PARENT        | Delete own account (password req.) |
| GET    | /api/buses                   | Any           | List buses                         |
| POST   | /api/buses                   | ADMIN         | Create bus                         |
| GET    | /api/routes                  | Any           | List routes with stops             |
| GET    | /api/students                | ADMIN         | List all students                  |
| POST   | /api/students                | ADMIN         | Create student                     |
| PATCH  | /api/students/:id            | ADMIN         | Update student                     |
| DELETE | /api/students/:id            | ADMIN         | Delete student                     |
| GET    | /api/attendance              | Any           | Attendance records                 |
| GET    | /api/audit-logs              | ADMIN         | Last N audit log entries (max 500) |
| POST   | /api/arduino/gps             | Device-key    | Arduino GPS upload                 |
| POST   | /api/arduino/nfc             | Device-key    | Arduino NFC scan                   |

### Socket.IO Events

| Event              | Direction       | Payload                                   |
|--------------------|-----------------|-------------------------------------------|
| `subscribe_bus`    | Client → Server | `{ busId }`                               |
| `bus_location`     | Server → Client | `{ busId, lat, lng, speed, timestamp }`   |
| `subscribe_parent` | Client → Server | `{ parentId }`                            |
| `attendance_event` | Server → Client | `{ studentId, studentName, status, ... }` |
| `driver_location`  | Client → Server | `{ busId, lat, lng, speed }`              |

---

## Data Privacy

- **GPS retention:** Location records older than 90 days are deleted automatically by a cron job (runs daily at 2 AM).
- **Consent:** Parent registration requires explicit data collection consent before account creation.
- **Account deletion:** Parents can delete their own account (and unlink their children) from the Profile screen.
- **Audit log:** All admin/user actions (student CRUD, account deletion, child linking) are logged with timestamp, user, IP, and action detail. View at `/audit` in the web admin.

---

## Hardware (per bus)

| Component         | Purpose                        |
|-------------------|--------------------------------|
| ESP32 DevKit v1   | Microcontroller (×2)          |
| NEO-6M GPS module | Real-time location             |
| RC522 RFID reader | Student NFC card scanning      |
| Mifare Classic 1K | Student ID cards               |
| 4G router/hotspot | Connectivity on the road       |

Recommended server: Hetzner CX22 (~$6/mo, 2 vCPU 4 GB) handles most school sizes.
