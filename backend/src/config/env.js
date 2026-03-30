import dotenv from 'dotenv'

dotenv.config()

function required(name) {
  const value = process.env[name]
  if (!value || !String(value).trim()) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT || 4600),
  MONGODB_URI: required('MONGODB_URI'),
  FRONTEND_ORIGIN: required('FRONTEND_ORIGIN'),
  JWT_ACCESS_SECRET: required('JWT_ACCESS_SECRET'),
  JWT_REFRESH_SECRET: required('JWT_REFRESH_SECRET'),
  ACCESS_TOKEN_TTL: process.env.ACCESS_TOKEN_TTL || '15m',
  REFRESH_TOKEN_TTL_DAYS: Number(process.env.REFRESH_TOKEN_TTL_DAYS || 14),
  RATE_LIMIT_WINDOW_MS: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  RATE_LIMIT_MAX: Number(process.env.RATE_LIMIT_MAX || 300),
  MAX_FILE_SIZE_MB: Number(process.env.MAX_FILE_SIZE_MB || 5),
}

if (!Number.isFinite(env.PORT) || env.PORT <= 0) {
  throw new Error('PORT must be a positive number')
}
if (!Number.isFinite(env.REFRESH_TOKEN_TTL_DAYS) || env.REFRESH_TOKEN_TTL_DAYS <= 0) {
  throw new Error('REFRESH_TOKEN_TTL_DAYS must be a positive number')
}
if (!Number.isFinite(env.MAX_FILE_SIZE_MB) || env.MAX_FILE_SIZE_MB <= 0) {
  throw new Error('MAX_FILE_SIZE_MB must be a positive number')
}
