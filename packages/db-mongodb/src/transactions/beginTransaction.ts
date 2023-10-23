import type { TransactionOptions } from 'mongodb'
import type { BeginTransaction } from '@stigma-io/payload/database'

import { APIError } from '@stigma-io/payload/errors'
import { v4 as uuid } from 'uuid'

let transactionsNotAvailable: boolean
export const beginTransaction: BeginTransaction = async function beginTransaction(
  options: TransactionOptions = {},
) {
  let id = null
  if (!this.connection) {
    throw new APIError('beginTransaction called while no connection to the database exists')
  }

  if (transactionsNotAvailable) return id

  const client = this.connection.getClient()
  if (!client.options.replicaSet) {
    transactionsNotAvailable = true
  } else {
    id = uuid()
    if (!this.sessions[id]) {
      this.sessions[id] = await client.startSession()
    }
    if (this.sessions[id].inTransaction()) {
      this.payload.logger.warn('beginTransaction called while transaction already exists')
    } else {
      await this.sessions[id].startTransaction(options)
    }
  }
  return id
}
