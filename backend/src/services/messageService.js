import mongoose from 'mongoose'
import { Attachment } from '../models/Attachment.js'
import { messageRepository } from '../repositories/messageRepository.js'
import { roomService } from './roomService.js'
import { AppError } from '../utils/AppError.js'

function normalizeMessage(doc) {
  return {
    id: doc.id,
    roomId: doc.room?.toString?.() || doc.room,
    sender: doc.sender?.name || doc.sender,
    senderId: doc.sender?._id?.toString?.() || doc.sender,
    senderAvatarUrl: doc.sender?.avatarUrl || '',
    text: doc.text,
    replyTo: doc.replyTo
      ? {
          id: doc.replyTo?._id?.toString?.() || doc.replyTo?.id || '',
          text: doc.replyTo?.text || '',
          sender: doc.replyTo?.sender?.name || 'Unknown',
          senderId: doc.replyTo?.sender?._id?.toString?.() || '',
        }
      : null,
    attachments: (doc.attachments || []).map((item) => ({
      id: item.id,
      url: item.url,
      fileName: item.fileName,
      mimeType: item.mimeType,
      size: item.size,
    })),
    deliveredTo: doc.deliveredTo || [],
    readBy: doc.readBy || [],
    editedAt: doc.editedAt || null,
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

  async sendMessage({ roomId, userId, text = '', attachmentIds = [], replyToId = null }) {
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

    let replyTarget = null
    if (replyToId) {
      replyTarget = await messageRepository.findByIdInRoom(replyToId, roomId)
      if (!replyTarget) {
        throw new AppError('Reply target not found in this room', 404, 'REPLY_TARGET_NOT_FOUND')
      }
    }

    const created = await messageRepository.createMessage({
      room: roomId,
      sender: userId,
      text,
      replyTo: replyToId || null,
      attachments: validAttachmentIds.map((item) => item._id),
      deliveredTo: [{ user: userId, at: new Date() }],
      readBy: [{ user: userId, at: new Date() }],
    })

    const hydrated = await created.populate('sender', 'name avatarUrl')
    await hydrated.populate('attachments')
    await hydrated.populate({
      path: 'replyTo',
      select: 'text sender',
      populate: { path: 'sender', select: 'name avatarUrl' },
    })

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

  async clearRoomMessages({ roomId, userId }) {
    await roomService.assertMembership(roomId, userId)

    // Soft delete all messages in the room
    await messageRepository.softDeleteByRoom(roomId)
  },

  async editMessage({ roomId, messageId, userId, text }) {
    await roomService.assertMembership(roomId, userId)

    const existing = await messageRepository.findByIdInRoom(messageId, roomId)
    if (!existing) throw new AppError('Message not found', 404, 'MESSAGE_NOT_FOUND')
    if (existing.sender?._id?.toString() !== userId.toString()) {
      throw new AppError('You can only edit your own messages', 403, 'MESSAGE_EDIT_FORBIDDEN')
    }

    const updated = await messageRepository.updateMessageText(messageId, text)
    return normalizeMessage(updated)
  },

  async deleteMessage({ roomId, messageId, userId }) {
    await roomService.assertMembership(roomId, userId)

    const existing = await messageRepository.findByIdInRoom(messageId, roomId)
    if (!existing) throw new AppError('Message not found', 404, 'MESSAGE_NOT_FOUND')
    if (existing.sender?._id?.toString() !== userId.toString()) {
      throw new AppError('You can only delete your own messages', 403, 'MESSAGE_DELETE_FORBIDDEN')
    }

    await messageRepository.softDeleteMessage(messageId)
  },
}
