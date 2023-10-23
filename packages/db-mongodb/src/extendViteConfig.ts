import type { SanitizedConfig } from '@stigma-io/payload/config'

export const vite = (config) => {
  return {
    ...config,
    optimizeDeps: {
      ...config.optimizeDeps,
      exclude: [...config.optimizeDeps.exclude, '@stigma-io/payload-db-mongodb'],
    },
  }
}

export const extendViteConfig = (config: SanitizedConfig) => {
  const existingViteConfig = config.admin.vite ? config.admin.vite : (viteConfig) => viteConfig

  config.admin.vite = (webpackConfig) => {
    return vite(existingViteConfig(webpackConfig))
  }
}
