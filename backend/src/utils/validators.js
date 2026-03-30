import { z } from 'zod'

const objectIdSchema = z.string().trim().regex(/^[a-fA-F0-9]{24}$/, 'Invalid ObjectId')

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(40),
  email: z.string().trim().email(),
  password: z.string().min(6).max(100),
})

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1).max(100),
})

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
})

export const profileSchema = z.object({
  avatarUrl: z.string().url().optional(),
  status: z.string().trim().min(1).max(120).optional(),
})

export const createRoomSchema = z.object({
  name: z.string().trim().min(2).max(80),
  type: z.enum(['public', 'private']).default('public'),
})

export const inviteParamsSchema = z.object({
  inviteCode: z.string().trim().min(6).max(24),
})

export const directRoomParamsSchema = z.object({
  email: z.string().trim().email(),
})

export const roomParamsSchema = z.object({
  roomId: objectIdSchema,
})

export const sendMessageSchema = z.object({
  text: z.string().trim().max(4000).optional(),
  attachmentIds: z.array(z.string().trim()).max(5).optional(),
}).refine((data) => Boolean(data.text) || (data.attachmentIds && data.attachmentIds.length > 0), {
  message: 'Either text or attachmentIds is required',
})

export const messageQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(50).default(20),
  before: z.string().datetime().optional(),
  q: z.string().trim().max(120).optional(),
})

export const markReadSchema = z.object({
  lastMessageId: z.string().trim().min(12).optional(),
})
