import jwt from 'jsonwebtoken'
import { Server } from 'socket.io'
import { env } from '../config/env.js'
import { Room } from '../models/Room.js'
import { roomRepository } from '../repositories/roomRepository.js'
import { userRepository } from '../repositories/userRepository.js'
import { messageService } from '../services/messageService.js'
import { roomService } from '../services/roomService.js'

const onlineUsers = new Map()

function addPresence(userId, socketId) {
  const set = onlineUsers.get(userId) || new Set()
  set.add(socketId)
  onlineUsers.set(userId, set)
}

function removePresence(userId, socketId) {
  const set = onlineUsers.get(userId)
  if (!set) return
  set.delete(socketId)
  if (set.size === 0) {
    onlineUsers.delete(userId)
  }
}

export function createSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: env.FRONTEND_ORIGIN,
      credentials: true,
    },
  })

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token
    if (!token) {
      return next(new Error('Unauthorized'))
    }

    try {
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET)
      const user = await userRepository.findById(payload.sub)
      if (!user) {
        return next(new Error('Unauthorized'))
      }

      socket.data.user = {
        userId: user.id,
        name: user.name,
      }
      return next()
    } catch {
      return next(new Error('Unauthorized'))
    }
  })

  io.on('connection', (socket) => {
    const { userId, name } = socket.data.user
    addPresence(userId, socket.id)

    socket.on('joinRoom', async ({ roomId }, ack) => {
      try {
        await roomService.assertMembership(roomId, userId)

        socket.join(`room:${roomId}`)

        const members = await roomRepository.listMembers(roomId)
        io.to(`room:${roomId}`).emit('onlineUsers', {
          roomId,
          users: members
            .map((item) => item.user)
            .filter(Boolean)
            .filter((item) => onlineUsers.has(item.id))
            .map((item) => item.name),
        })

        ack?.({ ok: true })
      } catch (error) {
        ack?.({ ok: false, error: error.message })
      }
    })

    socket.on('chatMessage', async (payload, ack) => {
      try {
        const message = await messageService.sendMessage({
          roomId: payload.roomId,
          userId,
          text: payload.text,
          attachmentIds: payload.attachmentIds || [],
          replyToId: payload.replyToId || null,
        })

        // Update room's lastMessage
        await Room.findByIdAndUpdate(payload.roomId, {
          lastMessage: message.id,
          lastMessageAt: new Date(),
        })

        io.to(`room:${payload.roomId}`).emit('chatMessage', {
          ...message,
          clientId: payload.clientId,
        })

        // Emit lastMessageUpdated event for room list updates
        io.emit('lastMessageUpdated', {
          roomId: payload.roomId,
          lastMessage: {
            id: message.id,
            text: message.text,
            sender: message.sender,
            senderId: message.senderId,
            createdAt: message.createdAt,
          },
          lastMessageAt: new Date(),
        })

        ack?.({ ok: true, messageId: message.id, clientId: payload.clientId })
      } catch (error) {
        ack?.({ ok: false, error: error.message, clientId: payload.clientId })
      }
    })

    socket.on('typing', ({ roomId }) => {
      socket.to(`room:${roomId}`).emit('typing', { roomId, name })
    })

    socket.on('stopTyping', ({ roomId }) => {
      socket.to(`room:${roomId}`).emit('stopTyping', { roomId, name })
    })

    socket.on('syncMessages', async ({ roomId, since }, ack) => {
      try {
        const messages = await messageService.listSince({ roomId, userId, since, limit: 50 })
        ack?.({ ok: true, messages })
      } catch (error) {
        ack?.({ ok: false, error: error.message })
      }
    })

    socket.on('disconnect', () => {
      removePresence(userId, socket.id)
      userRepository.touchLastSeen(userId).catch(() => {})
      socket.broadcast.emit('presence', { userId, online: onlineUsers.has(userId) })
    })
  })

  return io
}
