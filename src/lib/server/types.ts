// @dada78641/tuneserver <https://github.com/dada78641/tuneserver>
// © MIT license

import type {TrackOutput, ColumnOutput} from '../indexer/types.ts'
import type {LibraryCategory, LibraryQuery} from '../query/types.ts'
import type {WinampSkin} from '../skins/types.ts'
import type {Version} from '../../util/version.ts'

export type ErrorResponse = {error: string}

export type VersionResponse = Version

export type PlaylistsResponse = {playlists: LibraryCategory[]}

export type SkinsResponse = {skins: WinampSkin[]}

export type QueryResponse = QueryDataResponse | QueryErrorResponse

export type QueryDataResponse = {
  query: LibraryQuery
  result: {
    tracks: TrackOutput[]
    columns: ColumnOutput[][]
  }
}

export type QueryErrorResponse = ErrorResponse
