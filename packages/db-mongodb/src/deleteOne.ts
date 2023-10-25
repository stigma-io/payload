import type { DeleteOne } from '@stigma-io/payload/database'
import type { PayloadRequest } from '@stigma-io/payload/types'
import type { Document } from '@stigma-io/payload/types'

import type { MongooseAdapter } from '.'

import sanitizeInternalFields from './utilities/sanitizeInternalFields'
import { withSession } from './withSession'

export const deleteOne: DeleteOne = async function deleteOne(
  this: MongooseAdapter,
  { collection, req = {} as PayloadRequest, where },
) {
  const Model = this.collections[collection]
  const options = withSession(this, req.transactionID)

  const query = await Model.buildQuery({
    payload: this.payload,
    where,
  })

  const doc = await Model.findOneAndDelete(query, options).lean()

  let result: Document = JSON.parse(JSON.stringify(doc))

  // custom id type reset
  result.id = result._id
  result = sanitizeInternalFields(result)

  return result
}
