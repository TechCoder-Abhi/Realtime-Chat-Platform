import path from 'node:path'
import { Attachment } from '../models/Attachment.js'
import { roomService } from '../services/roomService.js'
import { sendSuccess } from '../utils/apiResponse.js'

export const attachmentController = {
  async upload(req, res) {
    await roomService.assertMembership(req.params.roomId, req.auth.userId)

    const file = req.file
    const relativeUrl = `/uploads/${path.basename(file.path)}`

    const attachment = await Attachment.create({
      uploader: req.auth.userId,
      room: req.params.roomId,
      fileName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: relativeUrl,
    })

    return sendSuccess(res, {
      attachment: {
        id: attachment.id,
        url: attachment.url,
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
        size: attachment.size,
      },
    }, undefined, 201)
  },
}
