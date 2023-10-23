import type { DeleteMany } from '@stigma-io/payload/database'
import type { PayloadRequest } from '@stigma-io/payload/types'

import type { MongooseAdapter } from '.'

import { withSession } from './withSession'

export const deleteMany: DeleteMany = async function deleteMany(
  this: MongooseAdapter,
  { collection, req = {} as PayloadRequest, where },
) {
  const Model = this.collections[collection]
  const options = {
    ...withSession(this, req.transactionID),
    lean: true,
  }

  const query = await Model.buildQuery({
    payload: this.payload,
    where,
  })

  await Model.deleteMany(query, options)
}
