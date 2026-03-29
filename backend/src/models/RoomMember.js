import mongoose from 'mongoose'

const roomMemberSchema = new mongoose.Schema(
  {
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['member', 'moderator'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

roomMemberSchema.index({ room: 1, user: 1 }, { unique: true })
roomMemberSchema.index({ room: 1, deletedAt: 1 })
roomMemberSchema.index({ user: 1, deletedAt: 1 })

export const RoomMember = mongoose.model('RoomMember', roomMemberSchema)
