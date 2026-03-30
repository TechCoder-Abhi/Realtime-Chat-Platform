import { Router } from 'express'
import { authController } from '../controllers/authController.js'
import { asyncHandler } from '../middlewares/asyncHandler.js'
import { requireAuth } from '../middlewares/authMiddleware.js'
import { validateBody } from '../middlewares/validate.js'
import { loginSchema, refreshSchema, registerSchema } from '../utils/validators.js'

const router = Router()

router.post('/register', validateBody(registerSchema), asyncHandler(authController.register))
router.post('/login', validateBody(loginSchema), asyncHandler(authController.login))
router.post('/refresh', validateBody(refreshSchema), asyncHandler(authController.refresh))
router.post('/logout', validateBody(refreshSchema), asyncHandler(authController.logout))
router.get('/me', asyncHandler(requireAuth), asyncHandler(authController.me))

export default router
