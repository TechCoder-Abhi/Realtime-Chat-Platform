import { createServer } from 'node:http'
import express from 'express'
import { Server } from 'socket.io'

const app = express()
const server = createServer(app)

const io = new Server(server, {
  cors: { origin: '*' },
})

const ROOM = 'group'

// Track connected users: socketId -> userName
const users = new Map()

function getOnlineUsers() {
  return Array.from(users.values())
}

io.on('connection', (socket) => {
  console.log('connected:', socket.id)

  socket.on('joinRoom', async (userName) => {
    users.set(socket.id, userName)
    await socket.join(ROOM)

    console.log(`${userName} joined.`)

    // Notify others someone joined
    socket.to(ROOM).emit('userJoined', userName)

    // Send updated online users list to everyone in room
    io.to(ROOM).emit('onlineUsers', getOnlineUsers())
  })

  socket.on('chatMessage', (msg) => {
    socket.to(ROOM).emit('chatMessage', msg)
  })

  socket.on('typing', (userName) => {
    socket.to(ROOM).emit('typing', userName)
  })

  socket.on('stopTyping', (userName) => {
    socket.to(ROOM).emit('stopTyping', userName)
  })

  socket.on('disconnect', () => {
    const userName = users.get(socket.id)
    if (userName) {
      users.delete(socket.id)
      console.log(`${userName} disconnected.`)

      // Notify room someone left
      socket.to(ROOM).emit('userLeft', userName)

      // Send updated online users list to remaining users
      io.to(ROOM).emit('onlineUsers', getOnlineUsers())
    }
  })
})

app.get('/', (req, res) => {
  res.json({ status: 'ok', onlineUsers: getOnlineUsers() })
})

server.listen(4600, () => {
  console.log('server running at http://localhost:4600')
})
