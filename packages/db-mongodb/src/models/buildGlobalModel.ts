import type { SanitizedConfig } from '@stigma-io/payload/config'

import mongoose from 'mongoose'

import type { GlobalModel } from '../types'

import getBuildQueryPlugin from '../queries/buildQuery'
import buildSchema from './buildSchema'

export const buildGlobalModel = (config: SanitizedConfig): GlobalModel | null => {
  if (config.globals && config.globals.length > 0) {
    const globalsSchema = new mongoose.Schema(
      {},
      { discriminatorKey: 'globalType', minimize: false, timestamps: true },
    )

    globalsSchema.plugin(getBuildQueryPlugin())

    const Globals = mongoose.model('globals', globalsSchema, 'globals') as unknown as GlobalModel

    Object.values(config.globals).forEach((globalConfig) => {
      const globalSchema = buildSchema(config, globalConfig.fields, {
        options: {
          minimize: false,
        },
      })
      Globals.discriminator(globalConfig.slug, globalSchema)
    })

    return Globals
  }

  return null
}
