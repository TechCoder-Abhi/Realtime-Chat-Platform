import mongoose from 'mongoose'
import { Attachment } from '../models/Attachment.js'
import { messageRepository } from '../repositories/messageRepository.js'
import { roomService } from './roomService.js'

function normalizeMessage(doc) {
  return {
    id: doc.id,
    roomId: doc.room?.toString?.() || doc.room,
    sender: doc.sender?.name || doc.sender,
    senderId: doc.sender?._id?.toString?.() || doc.sender,
    senderAvatarUrl: doc.sender?.avatarUrl || '',
    text: doc.text,
    attachments: (doc.attachments || []).map((item) => ({
      id: item.id,
      url: item.url,
      fileName: item.fileName,
      mimeType: item.mimeType,
      size: item.size,
    })),
    deliveredTo: doc.deliveredTo || [],
    readBy: doc.readBy || [],
    createdAt: doc.createdAt,
  }
}

export const messageService = {
  async listRoomMessages({ roomId, userId, limit, before, q }) {
    await roomService.assertMembership(roomId, userId)

    const docs = await messageRepository.listByRoom({
      roomId,
      limit,
      beforeTs: before,
      q,
    })

    return docs.map(normalizeMessage)
  },

  async sendMessage({ roomId, userId, text = '', attachmentIds = [] }) {
    await roomService.assertMembership(roomId, userId)

    let validAttachmentIds = []
    if (attachmentIds.length > 0) {
      validAttachmentIds = await Attachment.find({
        _id: { $in: attachmentIds.map((id) => new mongoose.Types.ObjectId(id)) },
        room: roomId,
        uploader: userId,
        deletedAt: null,
      }).select('_id')
    }

    const created = await messageRepository.createMessage({
      room: roomId,
      sender: userId,
      text,
      attachments: validAttachmentIds.map((item) => item._id),
      deliveredTo: [{ user: userId, at: new Date() }],
      readBy: [{ user: userId, at: new Date() }],
    })

    const hydrated = await created.populate('sender', 'name avatarUrl')
    await hydrated.populate('attachments')

    if (validAttachmentIds.length > 0) {
      await Attachment.updateMany(
        { _id: { $in: validAttachmentIds.map((item) => item._id) } },
        { $set: { message: created.id } }
      )
    }

    return normalizeMessage(hydrated)
  },

  async markRoomRead({ roomId, userId }) {
    await roomService.assertMembership(roomId, userId)
    await messageRepository.markRead(roomId, userId)
  },

  async listSince({ roomId, userId, since, limit = 50 }) {
    await roomService.assertMembership(roomId, userId)
    const docs = await messageRepository.listSince(roomId, since, limit)
    return docs.map(normalizeMessage)
  },
}
