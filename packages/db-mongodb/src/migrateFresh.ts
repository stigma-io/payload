import type { PayloadRequest } from '@stigma-io/payload/types'

import { readMigrationFiles } from '@stigma-io/payload/database'
import prompts from 'prompts'

import type { MongooseAdapter } from '.'

/**
 * Drop the current database and run all migrate up functions
 */
export async function migrateFresh(this: MongooseAdapter): Promise<void> {
  const { payload } = this

  const { confirm: acceptWarning } = await prompts(
    {
      name: 'confirm',
      initial: false,
      message: `WARNING: This will drop your database and run all migrations. Are you sure you want to proceed?`,
      type: 'confirm',
    },
    {
      onCancel: () => {
        process.exit(0)
      },
    },
  )

  if (!acceptWarning) {
    process.exit(0)
  }

  payload.logger.info({
    msg: `Dropping database.`,
  })

  await this.connection.dropDatabase()

  const migrationFiles = await readMigrationFiles({ payload })
  payload.logger.debug({
    msg: `Found ${migrationFiles.length} migration files.`,
  })

  let transactionID
  // Run all migrate up
  for (const migration of migrationFiles) {
    payload.logger.info({ msg: `Migrating: ${migration.name}` })
    try {
      const start = Date.now()
      transactionID = await this.beginTransaction()
      await migration.up({ payload })
      await payload.create({
        collection: 'payload-migrations',
        data: {
          name: migration.name,
          batch: 1,
        },
        req: {
          transactionID,
        } as PayloadRequest,
      })
      await this.commitTransaction(transactionID)

      payload.logger.info({ msg: `Migrated:  ${migration.name} (${Date.now() - start}ms)` })
    } catch (err: unknown) {
      await this.rollbackTransaction(transactionID)
      payload.logger.error({
        err,
        msg: `Error running migration ${migration.name}. Rolling back.`,
      })
      throw err
    }
  }
}
