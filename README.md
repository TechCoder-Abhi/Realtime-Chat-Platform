# Chat Platform

Full-stack real-time chat platform upgraded for resume-level quality.

## Stack

Backend:
- Node.js + Express
- Socket.IO
- MongoDB + Mongoose
- Zod validation
- JWT access/refresh tokens

Frontend:
- React + Vite
- React Router
- React Query
- Zustand
- Socket.IO client
- TailwindCSS

## Implemented Features

Core product:
- Register/login with hashed passwords
- Access + refresh token auth flow
- User profile fields: avatar URL, status, last seen
- Public/private rooms with invite codes
- Group chat with room permissions
- Message persistence with pagination and search
- Attachment upload endpoint
- Typing indicator and online presence
- Message delivery/read structures

Backend professionalization:
- Layered architecture: routes/controllers/services/repositories
- Centralized error handling
- Consistent API responses
- Request validation with Zod
- RBAC middleware scaffold
- Helmet, rate-limit, CORS hardening, mongo sanitization
- Strict environment variable validation

Realtime architecture:
- Authenticated socket handshake
- Per-room join permission checks
- Message ack contract with clientId
- Reconnect sync event for missed messages

Frontend upgrade:
- Protected routes
- Server-state management with React Query
- App-state management with Zustand
- Optimistic message UX in chat send flow
- Empty states and load-more pagination action

## Quick Start

1. Start MongoDB (local service) or provision Atlas and get connection URI.
2. Backend setup:

   - cd backend
   - copy .env.example to .env and fill secrets
   - npm install
   - npm run seed
   - npm run dev

3. Frontend setup:

   - cd frontend
   - npm install
   - npm run dev

4. Open frontend at http://localhost:3000

## Automated Tests

Backend tests:
- cd backend
- npm test

Current coverage includes request/schema validation checks.

## MongoDB Setup Summary

Local MongoDB URI:
- mongodb://127.0.0.1:27017/chat_platform


Detailed backend setup is documented in backend/README.md.

## Important Note

Backend startup requires a reachable MongoDB instance. If MongoDB is not running, backend fails fast by design with clear connection error logs.

## Security Posture Note

The current frontend stores access/refresh tokens in localStorage for simplicity in a portfolio context. For production deployment, prefer httpOnly secure cookies with CSRF protection and short-lived access tokens.
