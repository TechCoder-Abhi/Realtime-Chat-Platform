import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { RefreshToken } from '../models/RefreshToken.js'

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function createAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.ACCESS_TOKEN_TTL }
  )
}

export async function createRefreshToken(user, context = {}) {
  const rawToken = crypto.randomBytes(48).toString('hex')
  const tokenHash = hashToken(rawToken)
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000)

  await RefreshToken.create({
    user: user.id,
    tokenHash,
    expiresAt,
    createdByIp: context.ip || '',
    userAgent: context.userAgent || '',
  })

  return rawToken
}

export async function rotateRefreshToken(rawToken, context = {}) {
  const tokenHash = hashToken(rawToken)
  const existing = await RefreshToken.findOne({ tokenHash, revokedAt: null }).populate('user')

  if (!existing || existing.expiresAt < new Date()) {
    return null
  }

  existing.revokedAt = new Date()
  await existing.save()

  const newToken = await createRefreshToken(existing.user, context)
  return { user: existing.user, refreshToken: newToken }
}

export async function revokeRefreshToken(rawToken) {
  const tokenHash = hashToken(rawToken)
  await RefreshToken.findOneAndUpdate(
    { tokenHash, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  )
}
