import { Strategy as PassportStrategy } from 'passport-strategy'
import { Request } from 'express'

export class CookieStrategy extends PassportStrategy {
  name: string = 'jwt'
  _verify: (req: Request, verified: (err, user, info) => void) => {}

  constructor(_, verify) {
    super()
    this._verify = verify
    if (!this._verify) {
      throw new TypeError('CookieStrategy requires a verify callback')
    }
  }

  authenticate(req) {
    const { session } = req
    if (!session) {
      return this.fail(401)
    }
    const verified = (err, user, info) => {
      if (err) {
        return this.error(err)
      } else if (!user) {
        return this.fail(info)
      } else {
        return this.success(user, info)
      }
    }
    try {
      return this._verify(req, verified)
    } catch (ex) {
      return this.error(ex)
    }
  }
}

export default ({ secret }): PassportStrategy => {
  const opts = {
    secretOrKey: secret,
  }
  return new CookieStrategy(opts, async (req, done) => {
    try {
      const { session } = req
      if (!session || !session.user) return done(null, false)
      if (session.user) {
        req.user = session.user
        return done(null, {
          ...session.user,
          collection: 'user',
          _strategy: 'jwt',
        })
      } else {
        return done(null, false)
      }
    } catch (e) {
      console.error('e', e)
      return done(null, false)
    }
  })
}
