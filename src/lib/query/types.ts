// @dada78641/tuneserver <https://github.com/dada78641/tuneserver>
// © MIT license

import type {Track} from '../indexer/db.ts'

export type OrderDirection = 'asc' | 'desc'

// These are the column types we support for queries.
export type LibraryColumnType = 'grouping' | 'albumartist' | 'album' | 'genre'

// These sub-columns can be used to sort library columns.
export type LibrarySubColumnType = 'value' | 'year' | 'albumCount' | 'trackCount'

// A column value, e.g. for albumartist, album, grouping, etc.
export interface LibraryColumnValue {
  value: string
  albumCount: number
  trackCount: number
  minYear: string
  maxYear: string
}

// Result for a library query.
export interface LibraryQueryResult {
  tracks: Track[]
  columns: LibraryColumnValue[][]
}

// TODO: USE THIS
export interface LibraryColumn {
  type: LibraryColumnType
  orderBy: LibrarySubColumnType
  orderDirection: OrderDirection
  subColumns: LibrarySubColumnType[]
}

// Selection query object.
export interface LibrarySelector {
  primaryDirectory?: string
}

// A primary library category (smart playlist).
export interface LibraryCategory {
  title: string
  columns: LibraryColumn[]
  selector: LibrarySelector[]
}

// A request for information from the library.
export interface LibraryQuery {
  category: LibraryCategory
  selectedColumns: (string | null)[]
}
