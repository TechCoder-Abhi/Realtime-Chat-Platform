import { API_MESSAGES } from '../constants/api.js'
import { sendError } from '../utils/apiResponse.js'

export function notFoundHandler(req, res) {
  return sendError(res, API_MESSAGES.NOT_FOUND, 'NOT_FOUND', 404)
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err)
  }

  const statusCode = err.statusCode || 500
  const message = err.message || API_MESSAGES.SERVER_ERROR
  const code = err.code || 'INTERNAL_ERROR'

  // eslint-disable-next-line no-console
  console.error(err)

  return sendError(res, message, code, statusCode, err.details)
}
