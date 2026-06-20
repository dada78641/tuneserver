// @dada78641/tuneserver <https://github.com/dada78641/tuneserver>
// © MIT license

import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import fg from 'fast-glob'
import {canAccess} from '../../util/fs.ts'
import {audioFileExts} from './static.ts'
import type {Config} from '../config.ts'
import type {File, FileSearchResult, FileIndexStatus, InputDirectoryStatus, IndexerResult} from './types.ts'

export class TuneFS {
  private config: Config

  constructor(config: Config) {
    this.config = config
  }

  public async scanFiles() {
    const files = this.findFiles()
    return {

    }
  }

  /**
   * Checks if all input directories are accessible.
   * 
   * This can help inform the user that they need to make the files available
   * (e.g. mount a share). Automated indexing does not happen unless
   * all input directories are determined to be available.
   */
  public async checkInputDirectoryStatus(): Promise<InputDirectoryStatus> {
    const dirs = []
    for (const {baseIdentifier, dirPath} of this.config.inputDirectories) {
      const accessible = await canAccess(dirPath)
      dirs.push({baseIdentifier, isAccessible: accessible})
    }
    return {
      hasInaccessibleDirectories: !(dirs.find(dir => !dir.isAccessible) === undefined),
      inputDirectories: dirs
    }
  }

  /**
   * Returns an absolute filename for a file identifier.
   */
  public getAbsoluteFilename(identifier: string) {
    const matches = identifier.match(/<([^>]+?)>(.+?)$/)
    if (matches == null) {
      throw new Error(`Invalid file identifier: ${identifier}`)
    }
    const baseIdentifier = matches[1]
    const filePath = matches[2]
    const inputDirectory = this.config.inputDirectories.find(dir => dir.baseIdentifier === baseIdentifier)
    if (inputDirectory == null) {
      throw new Error(`Did not find input directory: ${baseIdentifier}`)
    }
    return path.join(inputDirectory.dirPath, filePath)
  }

  /**
   * Checks if a file is accessible to us.
   */
  public async isFileAccessible(filePath: string) {
    const accessible = await canAccess(filePath)
    return accessible
  }

  /**
   * Finds all relevant files in the given input directories.
   */
  public async findFiles(): Promise<FileSearchResult> {
    const musicFiles = []
    for (const {baseIdentifier, dirPath} of this.config.inputDirectories) {
      const files = (await fg([`**/*.{${audioFileExts.join(',')}}`], {cwd: dirPath, stats: true}))
        .sort((a, b) => a.path < b.path ? 1 : -1)
      for (const file of files) {
        const segments = file.path.split(path.sep)
        musicFiles.push({
          baseIdentifier,
          filePrimaryDirectory: segments[0],
          fileRelPath: file.path,
          filePath: path.join(dirPath, file.path),
          fileMtime: Math.floor(file.stats!.mtimeMs / 1000),
        })
      }
    }
    return {
      files: musicFiles
    }
  }
}
