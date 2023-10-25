import type { TypeWithID } from './collections/config/types'
import { InitOptions } from 'payload/config'
import type { RequestContext } from './express/types'
import { initHTTP } from './payload.initHTTP'
import { BasePayload, Payload as LocalPayload } from './payload'
import type { TypeWithID as GlobalTypeWithID } from './globals/config/types'

export { getPayload } from './payload'

import 'isomorphic-fetch'
import { BaseDatabaseAdapter } from './database/types'

export class Payload extends BasePayload<GeneratedTypes> {
  async init(options: InitOptions): Promise<LocalPayload> {
    const payload = await initHTTP(options)
    Object.assign(this, payload)

    return payload
  }
}

const payload = new Payload()

type GeneratedTypes = {
  collections: {
    [slug: number | string | symbol]: TypeWithID & Record<string, unknown>
  }
  globals: {
    [slug: number | string | symbol]: GlobalTypeWithID & Record<string, unknown>
  }
}

export default payload

type DatabaseAdapter = BaseDatabaseAdapter

export type { DatabaseAdapter, GeneratedTypes, RequestContext }
