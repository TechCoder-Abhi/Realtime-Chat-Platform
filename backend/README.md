# Chat Platform Backend

Real-time group chat backend using Socket.IO and Express.

## Installation

```bash
npm install
```

## Running the Server

```bash
npm start
```

Or with auto-reload during development:

```bash
npm run dev
```

The server will run on `http://localhost:4600`

## Socket.IO Events

### Client -> Server
- `joinRoom` - User joins the chat room
- `chatMessage` - Send a message to the group
- `typing` - Notify others user is typing
- `stopTyping` - Notify others user stopped typing

### Server -> Client
- `roomNotice` - Someone joined the room
- `chatMessage` - Receive a message from another user
- `typing` - Someone is typing
- `stopTyping` - Someone stopped typing
