import mongoose from 'mongoose'

const statusEntry = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
)

const messageSchema = new mongoose.Schema(
  {
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, default: '', maxlength: 4000 },
    attachments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Attachment' }],
    deliveredTo: [statusEntry],
    readBy: [statusEntry],
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

messageSchema.index({ room: 1, createdAt: -1 })
messageSchema.index({ text: 'text' })

export const Message = mongoose.model('Message', messageSchema)
