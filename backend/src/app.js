import path from 'node:path'
import express from 'express'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import mongoSanitize from 'express-mongo-sanitize'
import { env } from './config/env.js'
import apiRoutes from './routes/index.js'
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js'
import { sendSuccess } from './utils/apiResponse.js'

export function createApp() {
  const app = express()

  app.use(helmet())
  app.use(
    cors({
      origin: env.FRONTEND_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  )

  app.use(
    rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      max: env.RATE_LIMIT_MAX,
      standardHeaders: true,
      legacyHeaders: false,
    })
  )

  app.use(express.json({ limit: '1mb' }))
  app.use(cookieParser())
  app.use(mongoSanitize())
  app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')))

  app.get('/health', (req, res) => sendSuccess(res, { status: 'ok' }))
  app.use('/api', apiRoutes)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
