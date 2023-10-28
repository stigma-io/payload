import type { SanitizedConfig } from '@stigma-io/payload/config'

import path from 'path'

import dirname from 'es-dirname'

const __dirname = dirname()

export const webpack = (config) => {
  const aliasPath = path.resolve(`${__dirname}/../mock.js`)

  return {
    ...config,
    resolve: {
      ...(config.resolve || {}),
      alias: {
        ...(config.resolve?.alias || {}),
        '@stigma-io/payload-db-mongodb': aliasPath,
      },
    },
  }
}

export const extendWebpackConfig = (config: SanitizedConfig) => {
  const existingWebpackConfig = config.admin.webpack
    ? config.admin.webpack
    : (webpackConfig) => webpackConfig

  config.admin.webpack = (webpackConfig) => {
    return webpack(existingWebpackConfig(webpackConfig))
  }
}
