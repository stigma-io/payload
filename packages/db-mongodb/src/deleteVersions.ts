import type { DeleteVersions } from '@stigma-io/payload/database'
import type { PayloadRequest } from '@stigma-io/payload/types'

import type { MongooseAdapter } from '.'

import { withSession } from './withSession'

export const deleteVersions: DeleteVersions = async function deleteVersions(
  this: MongooseAdapter,
  { collection, locale, req = {} as PayloadRequest, where },
) {
  const VersionsModel = this.versions[collection]
  const options = {
    ...withSession(this, req.transactionID),
    lean: true,
  }

  const query = await VersionsModel.buildQuery({
    locale,
    payload: this.payload,
    where,
  })

  await VersionsModel.deleteMany(query, options)
}
