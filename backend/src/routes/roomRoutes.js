import { Router } from 'express'
import multer from 'multer'
import fs from 'node:fs'
import path from 'node:path'
import { attachmentController } from '../controllers/attachmentController.js'
import { messageController } from '../controllers/messageController.js'
import { roomController } from '../controllers/roomController.js'
import { env } from '../config/env.js'
import { asyncHandler } from '../middlewares/asyncHandler.js'
import { requireAuth } from '../middlewares/authMiddleware.js'
import { validateBody, validateParams, validateQuery } from '../middlewares/validate.js'
import {
  createRoomSchema,
  directRoomParamsSchema,
  inviteParamsSchema,
  markReadSchema,
  messageQuerySchema,
  roomParamsSchema,
  sendMessageSchema,
} from '../utils/validators.js'

const uploadsDir = path.resolve(process.cwd(), 'uploads')
fs.mkdirSync(uploadsDir, { recursive: true })

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename(req, file, cb) {
      cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`)
    },
  }),
  limits: {
    fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024,
  },
})

const router = Router()
router.use(asyncHandler(requireAuth))

router.get('/', asyncHandler(roomController.list))
router.post('/', validateBody(createRoomSchema), asyncHandler(roomController.create))
router.post('/join/:inviteCode', validateParams(inviteParamsSchema), asyncHandler(roomController.joinByInvite))
router.post('/direct/:email', validateParams(directRoomParamsSchema), asyncHandler(roomController.createDirect))

router.get('/:roomId/members', validateParams(roomParamsSchema), asyncHandler(roomController.members))
router.get('/:roomId/messages', validateParams(roomParamsSchema), validateQuery(messageQuerySchema), asyncHandler(messageController.list))
router.post('/:roomId/messages', validateParams(roomParamsSchema), validateBody(sendMessageSchema), asyncHandler(messageController.create))
router.post('/:roomId/read', validateParams(roomParamsSchema), validateBody(markReadSchema), asyncHandler(messageController.markRead))
router.post('/:roomId/attachments', validateParams(roomParamsSchema), upload.single('file'), asyncHandler(attachmentController.upload))

export default router
