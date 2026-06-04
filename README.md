# BusTracker

School bus tracking system — mobile (Expo/React Native) + web admin + Node.js backend.

## Quick Start

### 1. Start the database
```bash
docker-compose up -d
```

### 2. Start the backend
```bash
cd backend
cp .env.example .env
# .env is pre-configured for Docker Compose defaults
npm run db:generate
npm run db:migrate    # name the migration: init
npm run dev
```

### 3. Start the mobile app
```bash
cd mobile
npx expo start
# Press 'a' to open Android emulator
```

## Project Structure
```
bustracker/
├── backend/          # Node.js + Express + Socket.IO + Prisma
├── mobile/           # Expo React Native (Android/iOS)
├── web/              # React admin dashboard (coming soon)
└── docker-compose.yml
```

## Default .env (matches Docker Compose)
```
DATABASE_URL="postgresql://bustracker:bustracker123@localhost:5432/bustracker"
JWT_SECRET="change-this-in-production"
PORT=3000
```
