import type pino from 'pino'

import path from 'path'
import module from 'node:module'

import type { SanitizedConfig } from 'payload/config'

import Logger from '../../utilities/logger'
import { clientFiles } from '../../config/clientFiles'
import findConfig from '../../config/find'
import validate from '../../config/validate'

const loadConfig = async (logger?: pino.Logger): Promise<SanitizedConfig> => {
  const localLogger = logger ?? Logger()

  const configPath = findConfig()

  clientFiles.forEach((ext) => {
    ;(module as any)._extensions[ext] = () => null
  })

  const configPromise = import(configPath /* @vite-ignore */)

  let config = await configPromise

  if (config.default) config = await config.default

  if (process.env.NODE_ENV !== 'production') {
    config = await validate(config, localLogger)
  }

  return {
    ...config,
    paths: {
      config: configPath,
      configDir: path.dirname(configPath),
      rawConfig: configPath,
    },
  }
}

export default loadConfig
