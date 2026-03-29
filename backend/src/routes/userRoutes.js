import { Router } from 'express'
import { userController } from '../controllers/userController.js'
import { asyncHandler } from '../middlewares/asyncHandler.js'
import { requireAuth } from '../middlewares/authMiddleware.js'
import { validateBody } from '../middlewares/validate.js'
import { profileSchema } from '../utils/validators.js'

const router = Router()

router.patch('/me/profile', asyncHandler(requireAuth), validateBody(profileSchema), asyncHandler(userController.updateProfile))

export default router
