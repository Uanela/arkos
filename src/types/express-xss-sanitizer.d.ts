declare module 'express-xss-sanitizer' {
  import { RequestHandler } from 'express'
  const xss: () => RequestHandler
  export = xss
}
