# Chat Platform Frontend

React frontend for the upgraded chat platform.

## Frontend Architecture

- Routing: React Router with protected chat route
- Server data: React Query (rooms, paginated messages)
- App state: Zustand (auth tokens + user session)
- Realtime: Socket.IO client with room join and message ack flow

## Implemented UX Features

- Auth page for register/login
- Protected chat page
- Room list and room switching
- Message persistence rendering with load older action
- Search filter for room messages
- Optimistic message sending
- Connection state indicator
- Typing indicators and online users
- Empty states

## Run

Install:
- npm install

Dev server:
- npm run dev

Production build:
- npm run build

Preview build:
- npm run preview

## Environment

Optional frontend environment variable in .env:
- VITE_API_BASE=http://localhost:4600

If omitted, frontend defaults to http://localhost:4600
