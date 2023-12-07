import dirname from 'es-dirname'

const ___dirname = dirname()
import type { Config } from './types'

export const defaults: Omit<Config, 'db' | 'editor'> = {
  admin: {
    avatar: 'default',
    buildPath: `${process.cwd()}/build`,
    components: {},
    css: `${___dirname}/../admin/scss/custom.css`,
    dateFormat: 'MMMM do yyyy, h:mm a',
    disable: false,
    inactivityRoute: '/logout-inactivity',
    indexHTML: `${___dirname}/../admin/index.html`,
    logoutRoute: '/logout',
    meta: {
      titleSuffix: '- Payload',
    },
  },
  collections: [],
  cookiePrefix: 'payload',
  cors: [],
  csrf: [],
  custom: {},
  defaultDepth: 2,
  defaultMaxTextLength: 40000,
  endpoints: [],
  express: {
    compression: {},
    json: {},
    middleware: [],
    postMiddleware: [],
    preMiddleware: [],
  },
  globals: [],
  graphQL: {
    disablePlaygroundInProduction: true,
    maxComplexity: 1000,
    schemaOutputFile: `${typeof process?.cwd === 'function' ? process.cwd() : ''}/schema.graphql`,
  },
  hooks: {},
  localization: false,
  maxDepth: 10,
  rateLimit: {
    max: 500,
    window: 15 * 60 * 1000, // 15min default,
  },
  routes: {
    admin: '/admin',
    api: '/api',
    graphQL: '/graphql',
    graphQLPlayground: '/graphql-playground',
  },
  serverURL: '',
  telemetry: true,
  typescript: {
    outputFile: `${typeof process?.cwd === 'function' ? process.cwd() : ''}/payload-types.ts`,
  },
  upload: {},
}
