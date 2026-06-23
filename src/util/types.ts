// @dada78641/tuneserver <https://github.com/dada78641/tuneserver>
// © MIT license

import type {QueryDataResponse, QueryErrorResponse} from '../lib/server/types.ts'

/**
 * Returns whether an object is a isQueryErrorResponse.
 */
export function isQueryErrorResponse(obj: QueryDataResponse | QueryErrorResponse): obj is QueryErrorResponse {
  return (<QueryErrorResponse>obj).error !== undefined
}
