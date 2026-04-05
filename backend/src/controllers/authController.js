import { authService } from '../services/authService.js'
import { sendSuccess } from '../utils/apiResponse.js'

function buildContext(req) {
  return {
    ip: req.ip,
    userAgent: req.get('user-agent') || '',
  }
}

function setAuthCookies(res, accessToken, refreshToken) {
  const isProd = process.env.NODE_ENV === 'production'
  const cookieOptions = {
    httpOnly: true,
    secure: isProd, // HTTPS only in production
    sameSite: 'Lax',
    path: '/',
  }

  res.cookie('accessToken', accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000, // 15 minutes
  })

  res.cookie('refreshToken', refreshToken, {
    ...cookieOptions,
    maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
  })
}

export const authController = {
  async register(req, res) {
    const data = await authService.register(req.body, buildContext(req))
    setAuthCookies(res, data.accessToken, data.refreshToken)
    return sendSuccess(res, data, undefined, 201)
  },

  async login(req, res) {
    const data = await authService.login(req.body, buildContext(req))
    setAuthCookies(res, data.accessToken, data.refreshToken)
    return sendSuccess(res, data)
  },

  async refresh(req, res) {
    // Get refresh token from cookie or request body (for backward compatibility)
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken
    const data = await authService.refresh(refreshToken, buildContext(req))
    setAuthCookies(res, data.accessToken, data.refreshToken)
    return sendSuccess(res, data)
  },

  async logout(req, res) {
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken
    await authService.logout(refreshToken)
    
    // Clear cookies
    res.clearCookie('accessToken', { path: '/' })
    res.clearCookie('refreshToken', { path: '/' })
    
    return sendSuccess(res, { loggedOut: true })
  },

  async me(req, res) {
    return sendSuccess(res, { user: authService.me(req.user) })
  },
}
