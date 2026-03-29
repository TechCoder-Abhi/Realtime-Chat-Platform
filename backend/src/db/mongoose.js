import mongoose from 'mongoose'
import { env } from '../config/env.js'

export async function connectMongo() {
  await mongoose.connect(env.MONGODB_URI, {
    autoIndex: env.NODE_ENV !== 'production',
  })
  // eslint-disable-next-line no-console
  console.log('MongoDB connected')
}
