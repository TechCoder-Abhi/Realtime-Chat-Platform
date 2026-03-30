import { Room } from '../models/Room.js'
import { RoomMember } from '../models/RoomMember.js'

export const roomRepository = {
  createRoom(payload) {
    return Room.create(payload)
  },

  addMember(roomId, userId, role = 'member') {
    return RoomMember.findOneAndUpdate(
      { room: roomId, user: userId },
      { $set: { deletedAt: null, role }, $setOnInsert: { joinedAt: new Date() } },
      { upsert: true, new: true }
    )
  },

  findRoomById(roomId) {
    return Room.findOne({ _id: roomId, deletedAt: null })
  },

  findByInviteCode(inviteCode) {
    return Room.findOne({ inviteCode, deletedAt: null, isArchived: false })
  },

  listRoomsForUser(userId) {
    return RoomMember.find({ user: userId, deletedAt: null })
      .populate({ path: 'room', match: { deletedAt: null, isArchived: false } })
      .sort({ updatedAt: -1 })
  },

  isMember(roomId, userId) {
    return RoomMember.exists({ room: roomId, user: userId, deletedAt: null })
  },

  listMembers(roomId) {
    return RoomMember.find({ room: roomId, deletedAt: null }).populate('user', 'name email avatarUrl status lastSeen')
  },
}
