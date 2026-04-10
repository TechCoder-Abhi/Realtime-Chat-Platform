# Chat Platform

A production-style, full-stack real-time chat platform built with modern web tooling and a layered backend architecture.

This project demonstrates practical engineering patterns for scalable chat systems, including authenticated WebSocket communication, robust API design, optimistic UI updates, role-based room access, and secure file handling.


## Project Overview

Chat Platform is a real-time messaging application that supports public, private, and direct conversations. It combines REST APIs and Socket.IO events for a responsive user experience while preserving server-side authority for permissions and data integrity.

Primary goals:

- Real-time messaging that remains reliable under reconnect scenarios
- Clear separation of concerns in backend code
- Modern frontend state management with predictable cache behavior
- Security-first defaults for authentication and request handling

## Feature Highlights

### Core Messaging

- Real-time room messaging via Socket.IO
- Public, private, and direct rooms
- Message replies, edits, and soft-delete behavior
- Message persistence with pagination and server-side search
- Read and delivery tracking structures
- Typing indicators and online presence signals
- Room list last-message preview updates

### Authentication And User Management

- Registration and login with password hashing
- Access token and refresh token flow
- Secure cookie support (httpOnly) with bearer fallback for compatibility
- Protected frontend routes
- Profile updates (avatar and status)

### File Handling

- Attachment upload per room with membership checks
- Local storage mode
- Optional Cloudinary storage mode

### Frontend Experience

- Optimistic message sending UX
- Server state with React Query
- App state with Zustand
- Light and dark theme support
- Responsive interface with reusable UI components

## Technology Stack

### Backend

- Node.js
- Express
- Socket.IO
- MongoDB + Mongoose
- Zod validation
- JWT authentication
- Helmet, CORS, rate limiting, Mongo sanitize

### Frontend

- React + Vite
- React Router
- React Query
- Zustand
- Socket.IO Client
- Tailwind CSS

## Architecture

### Backend Layering

- Routes: HTTP contract and middleware composition
- Controllers: request-to-service orchestration
- Services: business logic and rule enforcement
- Repositories: database query abstraction
- Models: Mongoose schemas and indexes

### Realtime Flow

- Authenticated socket handshake
- Membership checks before room join and message operations
- Message emit and acknowledgement contract
- Reconnect-safe sync patterns

### Frontend State Strategy

- React Query for API-backed cache and invalidation
- Zustand for auth and UI-level persistent state
- Local optimistic queue merged with persisted message pages

## Repository Structure

Top-level folders:

- backend: Express API, Socket.IO server, domain logic
- frontend: React client application

Backend key modules:

- src/controllers
- src/services
- src/repositories
- src/models
- src/routes
- src/sockets
- src/middlewares

Frontend key modules:

- src/components
- src/components/ui
- src/store
- src/lib

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- MongoDB (local or Atlas)

### 1) Clone And Install

From workspace root:

```bash
npm install
npm install --prefix backend
npm install --prefix frontend
```

### 2) Configure Environment

Backend only:

```bash
cd backend
copy .env.example .env
```

Populate required values in backend .env.

### 3) Seed Data (Optional But Recommended)

```bash
npm run seed --prefix backend
```

### 4) Start Development Servers

Run both apps together:

```bash
npm run dev
```

Or run separately:

```bash
npm run dev --prefix backend
npm run dev --prefix frontend
```

### 5) Open Application

- Frontend: http://localhost:3000
- Backend: http://localhost:4600

## Environment Configuration

Important backend environment variables:

- PORT
- FRONTEND_ORIGIN
- MONGODB_URI
- JWT_ACCESS_SECRET
- JWT_REFRESH_SECRET
- ACCESS_TOKEN_TTL
- REFRESH_TOKEN_TTL_DAYS
- RATE_LIMIT_WINDOW_MS
- RATE_LIMIT_MAX
- MAX_FILE_SIZE_MB

Upload mode controls:

- UPLOAD_STORAGE=local
- UPLOAD_STORAGE=cloudinary

Cloudinary settings (required only for cloud mode):

- CLOUDINARY_CLOUD_NAME
- CLOUDINARY_API_KEY
- CLOUDINARY_API_SECRET

## Available Scripts

Workspace:

- npm run dev
- npm run dev:backend
- npm run dev:frontend
- npm run build
- npm run lint
- npm run test

Backend:

- npm run dev --prefix backend
- npm run start --prefix backend
- npm run seed --prefix backend
- npm run test --prefix backend
- npm run storage:cleanup --prefix backend

Frontend:

- npm run dev --prefix frontend
- npm run build --prefix frontend
- npm run preview --prefix frontend
- npm run lint --prefix frontend

## API Overview

Representative endpoint groups:

- Authentication
   - POST /api/auth/register
   - POST /api/auth/login
   - POST /api/auth/refresh
   - POST /api/auth/logout
   - GET /api/auth/me

- Rooms
   - GET /api/rooms
   - POST /api/rooms
   - POST /api/rooms/join/:inviteCode
   - POST /api/rooms/direct/:email
   - GET /api/rooms/:roomId/members

- Messages
   - GET /api/rooms/:roomId/messages
   - POST /api/rooms/:roomId/messages
   - PATCH /api/rooms/:roomId/messages/:messageId
   - DELETE /api/rooms/:roomId/messages/:messageId
   - DELETE /api/rooms/:roomId/messages
   - POST /api/rooms/:roomId/read

- Attachments
   - POST /api/rooms/:roomId/attachments

## Data Model Overview

Primary entities:

- User
- Room
- RoomMember
- Message
- Attachment
- Notification
- RefreshToken

Selected model capabilities:

- Message reply reference and edit timestamp
- Soft deletion support on messages and attachments
- Room-level lastMessage and lastMessageAt fields for list previews


## Security Posture

Implemented protections:

- Helmet headers
- CORS origin restriction
- Request rate limiting
- MongoDB sanitize middleware
- Input validation with Zod
- Secure cookie support for auth tokens


