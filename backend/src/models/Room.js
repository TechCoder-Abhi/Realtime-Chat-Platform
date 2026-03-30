import mongoose from 'mongoose'
import { ROOM_TYPES } from '../constants/api.js'

const roomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    type: { type: String, enum: Object.values(ROOM_TYPES), required: true, default: ROOM_TYPES.PUBLIC },
    inviteCode: { type: String, unique: true, sparse: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isArchived: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

roomSchema.index({ type: 1, deletedAt: 1 })
export const Room = mongoose.model('Room', roomSchema)
