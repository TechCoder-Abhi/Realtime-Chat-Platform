import fs from 'node:fs/promises'
import path from 'node:path'
import mongoose from 'mongoose'
import { connectMongo } from '../src/db/mongoose.js'
import { Attachment } from '../src/models/Attachment.js'

const ORPHAN_HOURS = Number(process.env.ORPHAN_ATTACHMENT_HOURS || 24)

async function removeFileIfExists(filePath) {
  try {
    await fs.unlink(filePath)
    return true
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false
    }
    throw error
  }
}

async function cleanupOrphanAttachments() {
  const cutoff = new Date(Date.now() - ORPHAN_HOURS * 60 * 60 * 1000)

  const orphaned = await Attachment.find({
    message: null,
    deletedAt: null,
    createdAt: { $lt: cutoff },
  }).select('_id url')

  let removedFiles = 0
  for (const item of orphaned) {
    const filePath = path.resolve(process.cwd(), item.url.replace(/^\//, ''))
    const removed = await removeFileIfExists(filePath)
    if (removed) removedFiles += 1
  }

  const ids = orphaned.map((item) => item._id)
  if (ids.length > 0) {
    await Attachment.updateMany({ _id: { $in: ids } }, { $set: { deletedAt: new Date() } })
  }

  return {
    scanned: orphaned.length,
    removedFiles,
    markedDeleted: ids.length,
  }
}

async function runCleanup() {
  await connectMongo()
  const result = await cleanupOrphanAttachments()

  // eslint-disable-next-line no-console
  console.log(`Storage cleanup done. scanned=${result.scanned} removedFiles=${result.removedFiles} markedDeleted=${result.markedDeleted}`)

  await mongoose.disconnect()
}

runCleanup().catch(async (error) => {
  // eslint-disable-next-line no-console
  console.error('Storage cleanup failed', error)
  await mongoose.disconnect()
  process.exit(1)
})
