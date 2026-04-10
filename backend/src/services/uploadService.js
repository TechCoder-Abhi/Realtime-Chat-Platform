import { v2 as cloudinary } from 'cloudinary'
import { env } from '../config/env.js'

if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  })
}

export const uploadService = {
  /**
   * Upload file to configured storage (local or Cloudinary)
   * @param {Buffer} fileBuffer - File content
   * @param {string} fileName - Original file name
   * @param {string} mimeType - File MIME type
   * @returns {Promise<{url: string, publicId?: string}>}
   */
  async uploadFile(fileBuffer, fileName, mimeType) {
    if (env.UPLOAD_STORAGE === 'cloudinary' && env.CLOUDINARY_CLOUD_NAME) {
      return this.uploadToCloudinary(fileBuffer, fileName, mimeType)
    }
    // Local upload is handled by multer middleware
    throw new Error('Local upload must be handled by multer middleware')
  },

  async uploadToCloudinary(fileBuffer, fileName, mimeType) {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'auto',
          public_id: `chat_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          folder: 'chat_platform',
        },
        (error, result) => {
          if (error) {
            reject(new Error(`Cloudinary upload failed: ${error.message}`))
          } else {
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
            })
          }
        }
      )

      uploadStream.end(fileBuffer)
    })
  },

  /**
   * Delete file from storage
   * @param {string} publicId - Cloudinary public ID or local file path
   */
  async deleteFile(publicId) {
    if (env.UPLOAD_STORAGE === 'cloudinary' && env.CLOUDINARY_CLOUD_NAME) {
      return new Promise((resolve, reject) => {
        cloudinary.uploader.destroy(publicId, (error, result) => {
          if (error) reject(error)
          else resolve(result)
        })
      })
    }
    // Local deletion would be handled separately
  },

  /**
   * Get storage type (for API responses)
   */
  getStorageType() {
    return env.UPLOAD_STORAGE
  },
}
