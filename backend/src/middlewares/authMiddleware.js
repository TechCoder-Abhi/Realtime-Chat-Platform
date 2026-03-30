import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { API_MESSAGES } from '../constants/api.js'
import { userRepository } from '../repositories/userRepository.js'
import { AppError } from '../utils/AppError.js'

export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || ''
  const [scheme, token] = authHeader.split(' ')

  if (scheme !== 'Bearer' || !token) {
    throw new AppError(API_MESSAGES.UNAUTHORIZED, 401, 'UNAUTHORIZED')
  }

  let payload
  try {
    payload = jwt.verify(token, env.JWT_ACCESS_SECRET)
  } catch {
    throw new AppError(API_MESSAGES.UNAUTHORIZED, 401, 'UNAUTHORIZED')
  }

  const user = await userRepository.findById(payload.sub)
  if (!user) {
    throw new AppError(API_MESSAGES.UNAUTHORIZED, 401, 'UNAUTHORIZED')
  }

  req.auth = {
    userId: user.id,
    role: user.role,
  }

  req.user = user
  next()
}
