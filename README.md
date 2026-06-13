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

# Comma-separated list of allowed web origins.
# The React Native app sends no Origin header so it is always allowed.
# For hotspot dev add your machine IP: "http://localhost:5173,http://172.20.x.x:5173"
CLIENT_URL="http://localhost:5173"

# Shared Arduino authentication key
ARDUINO_DEVICE_KEY="change-this-arduino-key"
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
- **Audit log:** All admin/user actions (student CRUD, account deletion, child linking, broadcasts) are logged with timestamp, user, IP, and action detail. View at `/audit` in the web admin.

---

## Security

### Implemented
- **Authentication:** JWT (7-day expiry), bcrypt password hashing (10 rounds).
- **Authorization (RBAC):** ADMIN / DRIVER / PARENT roles enforced per route. Object-level checks prevent IDOR — a parent can only read their own children's data; bus rosters are admin-only.
- **Input validation:** Zod schemas on every mutating endpoint.
- **Scoped realtime events:** Socket.IO events are emitted to private rooms (`parent:<id>`, `admins`, `bus:<id>`) — never broadcast globally. Parents only receive alerts for their own children.
- **Secret hygiene:** Server refuses to start in production with a missing/default `JWT_SECRET`. `.env` files are gitignored.
- **Account deletion:** Requires password re-confirmation before wiping data.
- **Device auth:** Arduino endpoints require a shared `ARDUINO_DEVICE_KEY` (not a user JWT).
- **Security headers:** `helmet` sets `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, HSTS, and more on every response.
- **Rate limiting:** `express-rate-limit` on `/api/auth/*` — 20 attempts per IP per 15-minute window; responds with `429` and a `RateLimit-*` header.
- **CORS allowlist:** `origin: '*'` replaced with an env-driven allowlist (`CLIENT_URL`). React Native app (no `Origin` header) is always allowed; unrecognised browser origins receive a CORS error.

### Before production
- [ ] **HTTPS/TLS** — terminate at a reverse proxy (see deployment guide below). All tokens travel in plaintext over HTTP without this.
- [ ] **Per-device Arduino keys** — replace the single shared key with one key per device, revocable.
- [ ] **Rotate the GitHub token** currently embedded in the git remote URL; use SSH or a credential helper instead.
- [ ] **Move web socket URL off `http://localhost:3000`** — the web client hardcodes it; make it env-driven for deployment.

---

## HTTPS / TLS Deployment (Caddy — recommended)

> Use this on any VPS (Hetzner, DigitalOcean, etc.) running Ubuntu/Debian.
> Caddy auto-obtains and renews Let's Encrypt certificates with zero config.

### 1. Install Caddy
```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy
```

### 2. Point your domain DNS → server IP
Create an `A` record for `api.yourschool.com` and `app.yourschool.com` before proceeding.

### 3. /etc/caddy/Caddyfile
```caddy
api.yourschool.com {
    reverse_proxy localhost:3000
}

app.yourschool.com {
    reverse_proxy localhost:5173
}
```
```bash
sudo systemctl reload caddy
```
Caddy fetches the TLS certificate automatically on first request.

### 4. Update environment variables
```env
# backend/.env
NODE_ENV=production
CLIENT_URL="https://app.yourschool.com"

# mobile/.env
EXPO_PUBLIC_API_URL=https://api.yourschool.com/api
EXPO_PUBLIC_SOCKET_URL=https://api.yourschool.com
```

### Nginx alternative
```nginx
server {
    listen 443 ssl;
    server_name api.yourschool.com;
    ssl_certificate     /etc/letsencrypt/live/api.yourschool.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourschool.com/privkey.pem;
    location / { proxy_pass http://localhost:3000; }
}
```
```bash
sudo certbot --nginx -d api.yourschool.com
```

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
