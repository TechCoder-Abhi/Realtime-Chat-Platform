import crypto from 'node:crypto'
import { Room } from '../models/Room.js'
import { RoomMember } from '../models/RoomMember.js'
import { roomRepository } from '../repositories/roomRepository.js'
import { userRepository } from '../repositories/userRepository.js'
import { ROOM_TYPES } from '../constants/api.js'
import { AppError } from '../utils/AppError.js'

function mapRoom(room) {
  return {
    id: room.id,
    name: room.name,
    type: room.type,
    inviteCode: room.inviteCode,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
  }
}

export const roomService = {
  async ensureDefaultRoom(userId) {
    const rooms = await roomRepository.listRoomsForUser(userId)
    if (rooms.some((item) => item.room)) {
      return
    }

    const room = await roomRepository.createRoom({
      name: 'General',
      type: ROOM_TYPES.PUBLIC,
      inviteCode: crypto.randomBytes(4).toString('hex'),
      createdBy: userId,
    })

    await roomRepository.addMember(room.id, userId)
  },

  async listRooms(userId) {
    const memberships = await roomRepository.listRoomsForUser(userId)
    return memberships
      .filter((item) => item.room)
      .map((item) => ({
        ...mapRoom(item.room),
        myRole: item.role,
      }))
  },

  async createRoom({ userId, name, type }) {
    const inviteCode = crypto.randomBytes(4).toString('hex')
    const room = await roomRepository.createRoom({
      name,
      type,
      inviteCode,
      createdBy: userId,
    })

    await roomRepository.addMember(room.id, userId, 'moderator')
    return mapRoom(room)
  },

  async createOrGetDirectRoom({ userId, targetEmail }) {
    const me = await userRepository.findById(userId)
    const target = await userRepository.findByEmail(targetEmail.trim().toLowerCase())

    if (!me || !target) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND')
    }

    if (String(me.id) === String(target.id)) {
      throw new AppError('Cannot create direct room with yourself', 400, 'INVALID_DIRECT_ROOM')
    }

    const myDirectMemberships = await RoomMember.find({ user: me.id, deletedAt: null })
      .populate({ path: 'room', match: { type: ROOM_TYPES.DIRECT, deletedAt: null, isArchived: false } })

    const directRoomIds = myDirectMemberships
      .map((membership) => membership.room?._id)
      .filter(Boolean)

    if (directRoomIds.length > 0) {
      const existingForTarget = await RoomMember.findOne({
        room: { $in: directRoomIds },
        user: target.id,
        deletedAt: null,
      }).populate('room')

      if (existingForTarget?.room) {
        return mapRoom(existingForTarget.room)
      }
    }

    const room = await Room.create({
      name: `${me.name} & ${target.name}`,
      type: ROOM_TYPES.DIRECT,
      createdBy: me.id,
    })

    await roomRepository.addMember(room.id, me.id, 'moderator')
    await roomRepository.addMember(room.id, target.id, 'member')

    return mapRoom(room)
  },

  async joinByInvite({ userId, inviteCode }) {
    const room = await roomRepository.findByInviteCode(inviteCode)
    if (!room) {
      throw new AppError('Invite link is invalid', 404, 'INVITE_NOT_FOUND')
    }

    await roomRepository.addMember(room.id, userId)
    return mapRoom(room)
  },

  async assertMembership(roomId, userId) {
    const room = await roomRepository.findRoomById(roomId)
    if (!room) {
      throw new AppError('Room not found', 404, 'ROOM_NOT_FOUND')
    }

    const member = await roomRepository.isMember(roomId, userId)
    if (!member) {
      if (room.type === ROOM_TYPES.PUBLIC) {
        await roomRepository.addMember(roomId, userId)
      } else {
        throw new AppError('You are not a member of this room', 403, 'ROOM_ACCESS_DENIED')
      }
    }

    return room
  },
}
