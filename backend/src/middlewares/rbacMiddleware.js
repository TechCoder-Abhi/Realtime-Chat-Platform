import { API_MESSAGES } from '../constants/api.js'
import { AppError } from '../utils/AppError.js'

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.auth?.role || !allowedRoles.includes(req.auth.role)) {
      throw new AppError(API_MESSAGES.FORBIDDEN, 403, 'FORBIDDEN')
    }
    next()
  }
}
