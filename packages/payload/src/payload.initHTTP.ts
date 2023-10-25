import express, { NextFunction, Response } from 'express'
import { InitOptions } from 'payload/config'

import authenticate from './nest/express/middleware/authenticate'
import expressMiddleware from './nest/express/middleware'
import initAdmin from './express/admin'
import initAuth from './nest/auth/init'
import access from './auth/requestHandlers/access'
import initCollectionsHTTP from './collections/initHTTP'
import initGlobalsHTTP from './globals/initHTTP'
import initStatic from './express/static'
import errorHandler from './express/middleware/errorHandler'
import { PayloadRequest } from './express/types'
import { getDataLoader } from './collections/dataloader'
import mountEndpoints from './express/mountEndpoints'
import { getPayload, Payload } from './payload'

export const initHTTP = async (incomingOptions: InitOptions): Promise<Payload> => {
  const options = { ...incomingOptions }

  const payload = await getPayload(options)

  payload.router = express.Router()
  payload.router.use(...expressMiddleware(payload))
  initAuth(payload)

  payload.router.get(`/${payload.config.admin.user}/init`, (req, res) => {
    return res.json({
      initialized: true,
    })
  })
  payload.router.get(`/${payload.config.admin.user}/me`, (req: PayloadRequest, res) => {
    return res.redirect(301, '/api/rest/profile')
  })

  payload.router.post(`/${payload.config.admin.user}/refresh-token`, (req: PayloadRequest, res) => {
    return res.redirect(301, '/api/rest/profile')
  })

  initCollectionsHTTP(payload)
  initGlobalsHTTP(payload)

  options.express.use((req: PayloadRequest, res, next) => {
    req.payload = payload
    next()
  })

  options.express.use((req: PayloadRequest, res: Response, next: NextFunction): void => {
    req.payloadDataLoader = getDataLoader(req)
    return next()
  })

  payload.express = options.express

  if (payload.config.rateLimit.trustProxy) {
    payload.express.set('trust proxy', 1)
  }

  const { NODE_ENV } = process.env
  // process.env.NODE_ENV='production';
  await initAdmin(payload)
  process.env.NODE_ENV = NODE_ENV

  payload.router.get('/access', access)

  mountEndpoints(options.express, payload.router, payload.config.endpoints)

  // Bind router to API
  payload.express.use(payload.config.routes.api, payload.router)

  // Enable static routes for all collections permitting upload
  initStatic(payload)

  payload.errorHandler = errorHandler(payload.config, payload.logger)
  payload.router.use(payload.errorHandler)

  payload.authenticate = authenticate(payload.config)

  return payload
}
