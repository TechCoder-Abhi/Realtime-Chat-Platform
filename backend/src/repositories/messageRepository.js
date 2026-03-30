import { Message } from '../models/Message.js'

export const messageRepository = {
  createMessage(payload) {
    return Message.create(payload)
  },

  async listByRoom({ roomId, limit, beforeTs, q }) {
    const query = { room: roomId, deletedAt: null }

    if (beforeTs) {
      query.createdAt = { $lt: new Date(beforeTs) }
    }

    if (q?.trim()) {
      query.$text = { $search: q.trim() }
    }

    const docs = await Message.find(query)
      .populate('sender', 'name avatarUrl')
      .populate('attachments')
      .sort({ createdAt: -1 })
      .limit(limit)

    return docs.reverse()
  },

  markRead(roomId, userId) {
    return Message.updateMany(
      {
        room: roomId,
        deletedAt: null,
        'readBy.user': { $ne: userId },
      },
      {
        $push: { readBy: { user: userId, at: new Date() } },
      }
    )
  },

  markDelivered(messageId, userId) {
    return Message.findOneAndUpdate(
      { _id: messageId, 'deliveredTo.user': { $ne: userId } },
      { $push: { deliveredTo: { user: userId, at: new Date() } } },
      { new: true }
    )
  },

  listSince(roomId, sinceTs, limit) {
    return Message.find({
      room: roomId,
      deletedAt: null,
      createdAt: { $gt: new Date(sinceTs) },
    })
      .populate('sender', 'name avatarUrl')
      .populate('attachments')
      .sort({ createdAt: 1 })
      .limit(limit)
  },
}
