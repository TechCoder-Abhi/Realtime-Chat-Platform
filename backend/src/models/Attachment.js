import mongoose from 'mongoose'

const attachmentSchema = new mongoose.Schema(
  {
    uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    message: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    url: { type: String, required: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

attachmentSchema.index({ room: 1, createdAt: -1 })

export const Attachment = mongoose.model('Attachment', attachmentSchema)
