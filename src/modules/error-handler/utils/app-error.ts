class AppError extends Error {
  statusCode: number
  status: string
  missing?: boolean
  isOperational: boolean
  code?: string
  meta?: Record<string, any>

  constructor(
    message: string,
    statusCode: number,
    meta?: Record<string, any>,
    code?: string
  ) {
    super(message)

    this.message = message
    this.statusCode = statusCode
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error'
    this.isOperational = true
    this.code = code
    this.meta = meta
    this.missing = false

    Error.captureStackTrace(this, this.constructor)
  }
}

export default AppError
