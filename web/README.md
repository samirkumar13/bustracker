# BusTracker — Web Admin

React + Vite admin dashboard for the BusTracker school bus tracking system.

## Start

```bash
npm install
npm run dev     # http://localhost:5173
```

Requires backend running at `http://localhost:3000`.

## Pages

| Route       | Description                                              |
|-------------|----------------------------------------------------------|
| `/`         | Dashboard — summary cards                                |
| `/buses`    | Bus management — create, assign driver + route           |
| `/routes`   | Route builder — click map to place stops                 |
| `/users`    | User list — view and delete accounts                     |
| `/students` | Student CRUD — NFC card, route/stop, copy student code   |
| `/attendance` | Live attendance feed (Socket.IO)                       |
| `/live`     | Live map — all buses with real-road OSRM routing         |
| `/audit`    | Audit log — colour-coded table of all admin actions      |

## Login

Default admin: `admin@school.com` / `admin123`
