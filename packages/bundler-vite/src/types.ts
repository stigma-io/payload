import type { Payload } from '@stigma-io/payload'
import type { PayloadHandler, SanitizedConfig } from '@stigma-io/payload/config'

export interface PayloadBundler {
  build: (payloadConfig: SanitizedConfig) => Promise<void> // used in `payload build`
  dev: (payload: Payload) => Promise<PayloadHandler> // this would be a typical Express middleware handler
  serve: (payload: Payload) => Promise<PayloadHandler> // serve built files in production
}
