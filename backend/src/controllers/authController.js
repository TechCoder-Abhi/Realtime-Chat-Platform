import { authService } from '../services/authService.js'
import { sendSuccess } from '../utils/apiResponse.js'

function buildContext(req) {
  return {
    ip: req.ip,
    userAgent: req.get('user-agent') || '',
  }
}

export const authController = {
  async register(req, res) {
    const data = await authService.register(req.body, buildContext(req))
    return sendSuccess(res, data, undefined, 201)
  },

  async login(req, res) {
    const data = await authService.login(req.body, buildContext(req))
    return sendSuccess(res, data)
  },

  async refresh(req, res) {
    const data = await authService.refresh(req.body.refreshToken, buildContext(req))
    return sendSuccess(res, data)
  },

  async logout(req, res) {
    await authService.logout(req.body.refreshToken)
    return sendSuccess(res, { loggedOut: true })
  },

  async me(req, res) {
    return sendSuccess(res, { user: authService.me(req.user) })
  },
}
