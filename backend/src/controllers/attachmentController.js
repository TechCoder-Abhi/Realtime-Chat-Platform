import path from 'node:path'
import { Attachment } from '../models/Attachment.js'
import { roomService } from '../services/roomService.js'
import { uploadService } from '../services/uploadService.js'
import { env } from '../config/env.js'
import { sendSuccess } from '../utils/apiResponse.js'

export const attachmentController = {
  async upload(req, res) {
    await roomService.assertMembership(req.params.roomId, req.auth.userId)

    const file = req.file
    let url = ''
    let cloudinaryPublicId = ''

    // Determine upload method
    if (env.UPLOAD_STORAGE === 'cloudinary' && env.CLOUDINARY_CLOUD_NAME) {
      // Upload to Cloudinary
      try {
        const result = await uploadService.uploadToCloudinary(
          file.buffer,
          file.originalname,
          file.mimetype
        )
        url = result.url
        cloudinaryPublicId = result.publicId
      } catch (error) {
        return res.status(400).json({ error: error.message })
      }
    } else {
      // Local file storage
      url = `/uploads/${path.basename(file.path)}`
    }

    const attachment = await Attachment.create({
      uploader: req.auth.userId,
      room: req.params.roomId,
      fileName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url,
      cloudinaryPublicId: cloudinaryPublicId || null,
    })

    return sendSuccess(
      res,
      {
        attachment: {
          id: attachment.id,
          url: attachment.url,
          fileName: attachment.fileName,
          mimeType: attachment.mimeType,
          size: attachment.size,
        },
      },
      undefined,
      201
    )
  },
}
