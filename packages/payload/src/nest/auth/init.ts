import passport from 'passport'
import AnonymousStrategy from 'passport-anonymous'
import { Payload } from '../../payload'
import cookieStrategy from './strategies/cookies'

function initAuth(ctx: Payload): void {
  passport.use(new AnonymousStrategy.Strategy())
  passport.use('jwt', cookieStrategy(ctx))
}

export default initAuth
