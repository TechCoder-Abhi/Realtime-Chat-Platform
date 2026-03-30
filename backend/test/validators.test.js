import test from 'node:test'
import assert from 'node:assert/strict'
import {
  roomParamsSchema,
  sendMessageSchema,
  messageQuerySchema,
} from '../src/utils/validators.js'

test('roomParamsSchema accepts valid ObjectId', () => {
  const parsed = roomParamsSchema.parse({ roomId: '507f1f77bcf86cd799439011' })
  assert.equal(parsed.roomId, '507f1f77bcf86cd799439011')
})

test('roomParamsSchema rejects malformed ObjectId', () => {
  assert.throws(() => roomParamsSchema.parse({ roomId: 'room-123' }))
})

test('sendMessageSchema requires text or attachments', () => {
  assert.throws(() => sendMessageSchema.parse({ text: '   ', attachmentIds: [] }))
})

test('messageQuerySchema coerces and bounds limit', () => {
  const parsed = messageQuerySchema.parse({ limit: '20' })
  assert.equal(parsed.limit, 20)
  assert.throws(() => messageQuerySchema.parse({ limit: '1000' }))
})
