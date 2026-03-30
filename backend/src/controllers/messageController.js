import { messageService } from '../services/messageService.js'
import { sendSuccess } from '../utils/apiResponse.js'

export const messageController = {
  async list(req, res) {
    const messages = await messageService.listRoomMessages({
      roomId: req.params.roomId,
      userId: req.auth.userId,
      limit: req.query.limit,
      before: req.query.before,
      q: req.query.q,
    })

    const nextCursor = messages.length > 0 ? messages[0].createdAt : null
    return sendSuccess(res, { messages }, { nextCursor })
  },

  async create(req, res) {
    const message = await messageService.sendMessage({
      roomId: req.params.roomId,
      userId: req.auth.userId,
      text: req.body.text,
      attachmentIds: req.body.attachmentIds || [],
    })

    return sendSuccess(res, { message }, undefined, 201)
  },

  async markRead(req, res) {
    await messageService.markRoomRead({ roomId: req.params.roomId, userId: req.auth.userId })
    return sendSuccess(res, { ok: true })
  },
}
