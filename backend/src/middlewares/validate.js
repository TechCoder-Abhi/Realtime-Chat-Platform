import { ZodError } from 'zod'
import { API_MESSAGES } from '../constants/api.js'
import { AppError } from '../utils/AppError.js'

function parse(schema, value) {
  try {
    return schema.parse(value)
  } catch (error) {
    if (error instanceof ZodError) {
      throw new AppError(API_MESSAGES.VALIDATION_ERROR, 400, 'VALIDATION_ERROR', error.flatten())
    }
    throw error
  }
}

export function validateBody(schema) {
  return (req, res, next) => {
    req.body = parse(schema, req.body)
    next()
  }
}

export function validateParams(schema) {
  return (req, res, next) => {
    req.params = parse(schema, req.params)
    next()
  }
}

export function validateQuery(schema) {
  return (req, res, next) => {
    req.query = parse(schema, req.query)
    next()
  }
}
