// @dada78641/tuneserver <https://github.com/dada78641/tuneserver>
// © MIT license

import type {LibraryCategory} from './query/types.ts'

export interface Config {
  inputDirectories: {
    baseIdentifier: string
    dirPath: string
  }[]
  winampSkinDirectories: {
    inputPath: string
    identifier: string
  }[]
  playlists: LibraryCategory[]
}
