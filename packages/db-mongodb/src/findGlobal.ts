import type { FindGlobal } from '@stigma-io/payload/database'
import type { PayloadRequest } from '@stigma-io/payload/types'

import { combineQueries } from '@stigma-io/payload/database'

import type { MongooseAdapter } from '.'

import sanitizeInternalFields from './utilities/sanitizeInternalFields'
import { withSession } from './withSession'

export const findGlobal: FindGlobal = async function findGlobal(
  this: MongooseAdapter,
  { locale, req = {} as PayloadRequest, slug, where },
) {
  const Model = this.globals
  const options = {
    ...withSession(this, req.transactionID),
    lean: true,
  }

  const query = await Model.buildQuery({
    globalSlug: slug,
    locale,
    payload: this.payload,
    where: combineQueries({ globalType: { equals: slug } }, where),
  })

  let doc = (await Model.findOne(query, {}, options)) as any

  if (!doc) {
    return null
  }
  if (doc._id) {
    doc.id = doc._id
    delete doc._id
  }

  doc = JSON.parse(JSON.stringify(doc))
  doc = sanitizeInternalFields(doc)

  return doc
}
