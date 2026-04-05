import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { API_MESSAGES } from '../constants/api.js'
import { userRepository } from '../repositories/userRepository.js'
import { AppError } from '../utils/AppError.js'

export async function requireAuth(req, res, next) {
  let token = ''

  // Try to get token from Authorization header
  const authHeader = req.headers.authorization || ''
  const [scheme, headerToken] = authHeader.split(' ')

  if (scheme === 'Bearer' && headerToken) {
    token = headerToken
  } else if (req.cookies?.accessToken) {
    // Fall back to cookie-based token
    token = req.cookies.accessToken
  }

  if (!token) {
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
