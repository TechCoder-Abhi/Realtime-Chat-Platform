import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { connectMongo } from '../src/db/mongoose.js'
import { User } from '../src/models/User.js'
import { Room } from '../src/models/Room.js'
import { RoomMember } from '../src/models/RoomMember.js'

async function runSeed() {
  await connectMongo()

  const email = 'admin@chat.local'
  let admin = await User.findOne({ email })

  if (!admin) {
    admin = await User.create({
      name: 'Admin',
      email,
      role: 'admin',
      passwordHash: await bcrypt.hash('Admin123!', 12),
    })
  }

  let general = await Room.findOne({ name: 'General', deletedAt: null })
  if (!general) {
    general = await Room.create({
      name: 'General',
      type: 'public',
      inviteCode: 'general01',
      createdBy: admin.id,
    })
  }

  await RoomMember.findOneAndUpdate(
    { room: general.id, user: admin.id },
    { $set: { role: 'moderator', deletedAt: null } },
    { upsert: true, new: true }
  )

  // eslint-disable-next-line no-console
  console.log('Seed complete')
  await mongoose.disconnect()
}

runSeed().catch(async (error) => {
  // eslint-disable-next-line no-console
  console.error(error)
  await mongoose.disconnect()
  process.exit(1)
})
