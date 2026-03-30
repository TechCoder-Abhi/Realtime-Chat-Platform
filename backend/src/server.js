import { createServer } from 'node:http'
import { env } from './config/env.js'
import { connectMongo } from './db/mongoose.js'
import { createApp } from './app.js'
import { createSocketServer } from './sockets/socketServer.js'

async function bootstrap() {
  await connectMongo()

  const app = createApp()
  const httpServer = createServer(app)
  createSocketServer(httpServer)

  httpServer.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`API running on http://localhost:${env.PORT}`)
  })
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server', error)
  process.exit(1)
})
