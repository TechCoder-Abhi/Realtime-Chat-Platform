import mongoose from 'mongoose'
import { USER_ROLES } from '../constants/api.js'

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 40 },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    passwordHash: { type: String, required: true },
    avatarUrl: { type: String, default: '' },
    status: { type: String, default: 'Available' },
    role: { type: String, enum: Object.values(USER_ROLES), default: USER_ROLES.USER },
    lastSeen: { type: Date, default: Date.now },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

userSchema.index({ deletedAt: 1 })

export const User = mongoose.model('User', userSchema)
