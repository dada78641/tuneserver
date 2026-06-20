// @dada78641/tuneserver <https://github.com/dada78641/tuneserver>
// © MIT license

import fs from 'node:fs/promises'
import path from 'node:path'
import zlib from 'node:zlib'
import express, {type Request, type Response} from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import {TuneIndexer} from '../lib/indexer/index.ts'
import {getVersion} from '../util/version.ts'
import {getJSONResponse} from '../lib/server/res.ts'
import {validateLibraryQuery} from '../lib/query/validate.ts'
import type {LibraryQuery} from '../lib/query/types.ts'
import {getTemplate} from '../lib/server/template.ts'
import {getOutputTracks, getOutputColumns} from '../lib/indexer/data.ts'
import type {VersionResponse, PlaylistsResponse, QueryResponse, ErrorResponse} from '../lib/server/types.ts'

dotenv.config({quiet: true})

const tx = new TuneIndexer()
await tx.initialize()

async function runServer() {
  const app = express()
  const port = process.env.PORT ?? '8226'

  app.use(cors())
  app.use(express.json())

  /**
   * GET /
   * 
   * This serves the debugging environment.
   */
  app.get('/', async (req: Request, res: Response) => {
    const docs = await fs.readFile(path.join(import.meta.dirname, '..', 'static', 'index.html'), 'utf8')
    res.send(getTemplate(docs))
  })

  /**
   * GET /api/playlists
   * 
   * Returns the playlists (both smart and regular) that we're showing files from.
   */
  app.get('/file/:id', (req: Request, res: Response): ErrorResponse | void => {
    const track = tx.db.getTrackByID(Number(req.params.id))
    if (track == null) {
      return getJSONResponse(res, {error: 'Track not found'}, 404)
    }
    const trackFilename = tx.fs.getAbsoluteFilename(track.filename)
    return res.sendFile(
      trackFilename,
      err => {
        if (err) {
          console.error('Error sending file:', err)
          if (!res.headersSent) {
            return getJSONResponse(res, {error: 'Failed to send file'}, 500)
          }
        }
      }
    )
  })

  /**
   * POST /api/query
   * 
   * Returns the playlists (both smart and regular) that we're showing files from.
   */
  app.post('/api/query', (req: Request, res: Response): QueryResponse => {
    const query = req.body as LibraryQuery
    const valid = validateLibraryQuery(query)
    if (!valid) {
      console.log(validateLibraryQuery.errors)
      return getJSONResponse(res, {error: `Query invalid: ${JSON.stringify(validateLibraryQuery.errors)}`}, 500)
    }
    const result = tx.db.runLibraryQuery(query)
    const tracks = getOutputTracks(result.tracks)
    const columns = getOutputColumns(result.columns)
    const data = {query, result: {tracks, columns}}
    return getJSONResponse(res, data)
  })

  /**
   * GET /api/playlists
   * 
   * Returns the playlists (both smart and regular) that we're showing files from.
   */
  app.get('/api/playlists', (req: Request, res: Response): PlaylistsResponse => {
    const data = tx.getPlaylists()
    return getJSONResponse(res, {playlists: data})
  })

  /**
   * GET /api/version
   * 
   * Returns the current version.
   */
  app.get('/api/version', (req: Request, res: Response): VersionResponse => {
    const data = getVersion()
    return getJSONResponse(res, data)
  })

  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`)
  })
}

runServer()
