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
  messageParamsSchema,
  messageQuerySchema,
  roomParamsSchema,
  sendMessageSchema,
  updateMessageSchema,
} from '../utils/validators.js'

// Determine storage method based on configuration
let multerStorage
if (env.UPLOAD_STORAGE === 'cloudinary' && env.CLOUDINARY_CLOUD_NAME) {
  // Use memory storage for Cloudinary uploads
  multerStorage = multer.memoryStorage()
} else {
  // Use disk storage for local uploads
  const uploadsDir = path.resolve(process.cwd(), 'uploads')
  fs.mkdirSync(uploadsDir, { recursive: true })
  multerStorage = multer.diskStorage({
    destination: uploadsDir,
    filename(req, file, cb) {
      cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`)
    },
  })
}

const upload = multer({
  storage: multerStorage,
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
router.patch('/:roomId/messages/:messageId', validateParams(messageParamsSchema), validateBody(updateMessageSchema), asyncHandler(messageController.edit))
router.delete('/:roomId/messages/:messageId', validateParams(messageParamsSchema), asyncHandler(messageController.delete))
router.delete('/:roomId/messages', validateParams(roomParamsSchema), asyncHandler(messageController.clearRoomMessages))
router.post('/:roomId/read', validateParams(roomParamsSchema), validateBody(markReadSchema), asyncHandler(messageController.markRead))
router.post('/:roomId/attachments', validateParams(roomParamsSchema), upload.single('file'), asyncHandler(attachmentController.upload))

export default router
