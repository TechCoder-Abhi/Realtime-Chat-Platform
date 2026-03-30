# Chat Platform Backend

Production-style chat backend using Express, Socket.IO, MongoDB, and Mongoose.

## What Is Implemented

- Layered architecture: routes/controllers/services/repositories/models
- JWT auth with access + refresh token rotation
- Password hashing with bcrypt
- Profile updates (avatar URL and status)
- Rooms with invite codes (public/private)
- Message persistence with pagination + search
- Typing indicator + online presence with room scoping
- Delivery/read structures on messages
- Attachment upload endpoint (local uploads folder)
- Validation using Zod for all request payloads
- Centralized error handling + consistent API response envelope
- RBAC middleware scaffold (user/admin)
- Security hardening: helmet, CORS restrictions, rate limiting, mongo input sanitization
- Strict environment config checks at startup

## Project Structure

src/
- app.js
- server.js
- config/
- constants/
- controllers/
- db/
- middlewares/
- models/
- repositories/
- routes/
- services/
- sockets/
- utils/

## MongoDB Setup

### Option A: Local MongoDB (Windows)

1. Install MongoDB Community Server from MongoDB official downloads.
2. Keep default port 27017.
3. Start MongoDB service:
   - Open Services and ensure MongoDB Server is Running, or
   - Run in terminal:

   powershell
   net start MongoDB

4. Use this in backend .env:

   MONGODB_URI=mongodb://127.0.0.1:27017/chat_platform



## Environment Variables

Copy .env.example to .env and set values:

PORT=4600
FRONTEND_ORIGIN=http://localhost:3000
MONGODB_URI=mongodb://127.0.0.1:27017/chat_platform
JWT_ACCESS_SECRET=replace-with-a-long-random-access-secret
JWT_REFRESH_SECRET=replace-with-a-long-random-refresh-secret
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL_DAYS=14
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=300
MAX_FILE_SIZE_MB=5

## Install and Run

1. Install dependencies:

   npm install

2. Seed sample data:

   npm run seed

3. Start backend:

   npm run dev

Server runs at http://localhost:4600

## Seed Data

Seed script creates:
- Admin user: admin@chat.local
- Default public room: General

Default password in seed script:
- Admin123!

Change this immediately for real usage.

## API Response Shape

Success:

{
  "success": true,
  "data": { ... },
  "meta": { ... }
}

Error:

{
  "success": false,
  "error": {
    "code": "SOME_CODE",
    "message": "Human readable error",
    "details": { ...optional }
  }
}

## Core REST Endpoints

Auth:
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/refresh
- POST /api/auth/logout
- GET /api/auth/me

Users:
- PATCH /api/users/me/profile

Rooms:
- GET /api/rooms
- POST /api/rooms
- POST /api/rooms/join/:inviteCode
- GET /api/rooms/:roomId/members

Messages:
- GET /api/rooms/:roomId/messages?limit=20&before=<ISO>&q=<search>
- POST /api/rooms/:roomId/messages
- POST /api/rooms/:roomId/read

Attachments:
- POST /api/rooms/:roomId/attachments (multipart form-data, field name: file)

## Socket.IO Events

Client to server:
- joinRoom { roomId }
- chatMessage { roomId, text, attachmentIds, clientId }
- typing { roomId }
- stopTyping { roomId }
- syncMessages { roomId, since }

Server to client:
- chatMessage message
- typing { roomId, name }
- stopTyping { roomId, name }
- onlineUsers { roomId, users }
- presence { userId, online }

## Resume Notes

This backend now demonstrates:
- Real architecture separation
- Secure auth session lifecycle
- Data modeling for chat products
- Real-time + persistent sync patterns
- API quality and validation discipline
