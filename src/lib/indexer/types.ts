// @dada78641/tuneserver <https://github.com/dada78641/tuneserver>
// © MIT license

import type {TTFileTags} from '@dada78641/tunetags'

export interface Track {
  id?: number
  title: string
  album: string
  albumartist: string
  genre: string
  year: string | null
  stars: number | null
  grouping: string
  filename: string
  filedir: string
  filemtime: number
  track: string
  trackOf: string
  duration: number
}

export interface Playlist {
  id: number
  title: string
}

export interface File {
  baseIdentifier: string
  filePrimaryDirectory: string
  fileRelPath: string
  filePath: string
  fileMtime: number
}

export interface FileSearchResult {
  files: File[]
}

export interface FileIndexStatus {
  fileNeedsAdding: boolean
  fileNeedsReindexing: boolean
}

export interface ParsedAudioFile {
  file: File
  tags: TTFileTags
}

export interface InputDirectoryStatus {
  hasInaccessibleDirectories: boolean
  inputDirectories: {
    baseIdentifier: string
    isAccessible: boolean
  }[]
}

export interface IndexerResult {
  hasRun: boolean
  totalFiles: number
  addedFiles: number
  removedFiles: number
  reindexedFiles: number
  inputDirectoryStatus: InputDirectoryStatus
}

export interface ColumnOutput {
  value: string
  albumCount: number
  trackCount: number
  year: string
}

export interface TrackOutput {
  id: number
  title: string
  album: string
  albumartist: string
  genre: string
  year: string | null
  stars: number | null
  grouping: string
  filename: string
  track: string
  disc: string
  duration: string
}
