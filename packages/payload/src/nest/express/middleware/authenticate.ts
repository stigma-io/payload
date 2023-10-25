import passport from 'passport'
import { NextFunction, Request, Response } from 'express'
import { SanitizedConfig } from 'payload/config'

export type PayloadAuthenticate = (req: Request, res: Response, next: NextFunction) => NextFunction
export default (config: SanitizedConfig): PayloadAuthenticate => {
  const methods = ['jwt', 'anonymous']
  const authenticate = passport.authenticate(methods, { session: false })
  return authenticate
}
