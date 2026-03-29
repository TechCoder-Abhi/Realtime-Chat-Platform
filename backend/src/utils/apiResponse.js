export function sendSuccess(res, data = {}, meta = undefined, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
    ...(meta ? { meta } : {}),
  })
}

export function sendError(res, message, code, statusCode = 400, details = undefined) {
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  })
}
