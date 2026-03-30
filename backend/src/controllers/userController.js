import { userRepository } from '../repositories/userRepository.js'
import { sendSuccess } from '../utils/apiResponse.js'

export const userController = {
  async updateProfile(req, res) {
    const user = await userRepository.updateProfile(req.auth.userId, req.body)
    return sendSuccess(res, {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        status: user.status,
        role: user.role,
        lastSeen: user.lastSeen,
      },
    })
  },
}
