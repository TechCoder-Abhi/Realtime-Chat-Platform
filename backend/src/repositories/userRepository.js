import { User } from '../models/User.js'

export const userRepository = {
  create(payload) {
    return User.create(payload)
  },

  findByEmail(email) {
    return User.findOne({ email, deletedAt: null })
  },

  findById(userId) {
    return User.findOne({ _id: userId, deletedAt: null })
  },

  updateProfile(userId, payload) {
    return User.findOneAndUpdate(
      { _id: userId, deletedAt: null },
      { $set: payload },
      { new: true }
    )
  },

  touchLastSeen(userId) {
    return User.findOneAndUpdate(
      { _id: userId, deletedAt: null },
      { $set: { lastSeen: new Date() } },
      { new: true }
    )
  },
}
