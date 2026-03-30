import bcrypt from 'bcryptjs'
import { userRepository } from '../repositories/userRepository.js'
import { AppError } from '../utils/AppError.js'
import { createAccessToken, createRefreshToken, revokeRefreshToken, rotateRefreshToken } from './tokenService.js'

function safeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    status: user.status,
    role: user.role,
    lastSeen: user.lastSeen,
    createdAt: user.createdAt,
  }
}

export const authService = {
  async register(payload, context) {
    const email = payload.email.trim().toLowerCase()
    const exists = await userRepository.findByEmail(email)
    if (exists) {
      throw new AppError('Email already registered', 409, 'EMAIL_EXISTS')
    }

    const passwordHash = await bcrypt.hash(payload.password, 12)
    const user = await userRepository.create({
      name: payload.name.trim(),
      email,
      passwordHash,
    })

    const accessToken = createAccessToken(user)
    const refreshToken = await createRefreshToken(user, context)

    return { accessToken, refreshToken, user: safeUser(user) }
  },

  async login(payload, context) {
    const email = payload.email.trim().toLowerCase()
    const user = await userRepository.findByEmail(email)
    if (!user) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS')
    }

    const isValid = await bcrypt.compare(payload.password, user.passwordHash)
    if (!isValid) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS')
    }

    const accessToken = createAccessToken(user)
    const refreshToken = await createRefreshToken(user, context)

    return { accessToken, refreshToken, user: safeUser(user) }
  },

  async refresh(refreshToken, context) {
    const result = await rotateRefreshToken(refreshToken, context)
    if (!result?.user) {
      throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN')
    }

    const accessToken = createAccessToken(result.user)
    return { accessToken, refreshToken: result.refreshToken, user: safeUser(result.user) }
  },

  async logout(refreshToken) {
    await revokeRefreshToken(refreshToken)
  },

  me(user) {
    return safeUser(user)
  },
}
