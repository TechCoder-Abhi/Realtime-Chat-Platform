import { roomRepository } from '../repositories/roomRepository.js'
import { roomService } from '../services/roomService.js'
import { sendSuccess } from '../utils/apiResponse.js'

export const roomController = {
  async list(req, res) {
    await roomService.ensureDefaultRoom(req.auth.userId)
    const rooms = await roomService.listRooms(req.auth.userId)
    return sendSuccess(res, { rooms })
  },

  async create(req, res) {
    const room = await roomService.createRoom({
      userId: req.auth.userId,
      name: req.body.name,
      type: req.body.type,
    })
    return sendSuccess(res, { room }, undefined, 201)
  },

  async joinByInvite(req, res) {
    const room = await roomService.joinByInvite({
      userId: req.auth.userId,
      inviteCode: req.params.inviteCode,
    })
    return sendSuccess(res, { room })
  },

  async createDirect(req, res) {
    const room = await roomService.createOrGetDirectRoom({
      userId: req.auth.userId,
      targetEmail: req.params.email,
    })
    return sendSuccess(res, { room }, undefined, 201)
  },

  async members(req, res) {
    await roomService.assertMembership(req.params.roomId, req.auth.userId)
    const members = await roomRepository.listMembers(req.params.roomId)
    return sendSuccess(res, {
      members: members.map((item) => ({
        id: item.user.id,
        name: item.user.name,
        email: item.user.email,
        avatarUrl: item.user.avatarUrl,
        status: item.user.status,
        lastSeen: item.user.lastSeen,
        role: item.role,
      })),
    })
  },
}
