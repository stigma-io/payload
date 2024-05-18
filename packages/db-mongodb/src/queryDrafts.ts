import type { PaginateOptions } from 'mongoose'
import type { QueryDrafts } from '@stigma-io/payload/database'
import type { PayloadRequest } from '@stigma-io/payload/types'

import { combineQueries, flattenWhereToOperators } from '@stigma-io/payload/database'

import type { MongooseAdapter } from '.'

import { buildSortParam } from './queries/buildSortParam'
import sanitizeInternalFields from './utilities/sanitizeInternalFields'
import { withSession } from './withSession'

export const queryDrafts: QueryDrafts = async function queryDrafts(
  this: MongooseAdapter,
  { collection, limit, locale, page, pagination, req = {} as PayloadRequest, sort: sortArg, where },
) {
  const VersionModel = this.versions[collection]
  const collectionConfig = this.payload.collections[collection].config
  const options = withSession(this, req.transactionID)

  let hasNearConstraint
  let sort

  if (where) {
    const constraints = flattenWhereToOperators(where)
    hasNearConstraint = constraints.some((prop) => Object.keys(prop).some((key) => key === 'near'))
  }

  if (!hasNearConstraint) {
    sort = buildSortParam({
      config: this.payload.config,
      fields: collectionConfig.fields,
      locale,
      sort: sortArg || collectionConfig.defaultSort,
      timestamps: true,
    })
  }

  const combinedWhere = combineQueries({ latest: { equals: true } }, where)

  const versionQuery = await VersionModel.buildQuery({
    locale,
    payload: this.payload,
    where: combinedWhere,
  })

  // useEstimatedCount is faster, but not accurate, as it ignores any filters. It is thus set to true if there are no filters.
  const useEstimatedCount =
    hasNearConstraint || !versionQuery || Object.keys(versionQuery).length === 0
  const paginationOptions: PaginateOptions = {
    forceCountFn: hasNearConstraint,
    lean: true,
    leanWithId: true,
    options,
    page,
    pagination,
    sort,
    useEstimatedCount,
  }

  if (
    !useEstimatedCount &&
    Object.keys(versionQuery).length === 0 &&
    this.disableIndexHints !== true
  ) {
    // Improve the performance of the countDocuments query which is used if useEstimatedCount is set to false by adding
    // a hint. By default, if no hint is provided, MongoDB does not use an indexed field to count the returned documents,
    // which makes queries very slow. This only happens when no query (filter) is provided. If one is provided, it uses
    // the correct indexed field
    paginationOptions.useCustomCountFn = () => {
      return Promise.resolve(
        VersionModel.countDocuments(versionQuery, {
          hint: { _id: 1 },
        }),
      )
    }
  }

  if (limit > 0) {
    paginationOptions.limit = limit
    // limit must also be set here, it's ignored when pagination is false
    paginationOptions.options.limit = limit
  }

  const result = await VersionModel.paginate(versionQuery, paginationOptions)
  const docs = JSON.parse(JSON.stringify(result.docs))

  return {
    ...result,
    docs: docs.map((doc) => {
      // eslint-disable-next-line no-param-reassign
      doc = {
        _id: doc.parent,
        id: doc.parent,
        ...doc.version,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      }

      return sanitizeInternalFields(doc)
    }),
  }
}
