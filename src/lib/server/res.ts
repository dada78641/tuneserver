// @dada78641/tuneserver <https://github.com/dada78641/tuneserver>
// © MIT license

import zlib from 'zlib'
import type {Response} from 'express'

export function getJSONResponse(res: Response, data: unknown, status: number = 200) {
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Content-Encoding', 'gzip')

  const gzip = zlib.createGzip()
  gzip.pipe(res)
  gzip.end(JSON.stringify(data))
}
