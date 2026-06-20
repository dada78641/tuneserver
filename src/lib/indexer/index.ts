// @dada78641/tuneserver <https://github.com/dada78641/tuneserver>
// © MIT license

import path from 'node:path'
import fs from 'node:fs/promises'
import {chunk} from 'lodash-es'
import {createEnvPaths, type EnvPaths} from '@dada78641/env-paths'
import {parseFileTags, type TTFileTags} from '@dada78641/tunetags'
import {TuneDB} from './db.ts'
import {TuneFS} from './fs.ts'
import type {File, ParsedAudioFile} from './types.ts'
import type {Config} from '../config.ts'
import type {IndexerResult, InputDirectoryStatus} from './types.ts'

export class TuneIndexer {
  private envPaths: EnvPaths
  public config!: Config
  public db!: TuneDB
  public fs!: TuneFS

  constructor() {
    this.envPaths = createEnvPaths('tuneserver')
  }

  /**
   * Scans for files in our input directories and indexes them.
   * 
   * If the input directories are not all accessible, the indexer does not run.
   * It could take a while to finish running this function, especially if
   * one of the input directories is a network drive.
   * 
   * This does not attempt to remove 
   */
  public async scanFiles(): Promise<IndexerResult> {
    await this.checkIndexerEnvironment()

    // Finds all files in the given input directories.
    const searchResult = await this.fs.findFiles()

    // Filter to only the files that need to be added or reindexed.
    const relevantFiles = await this.filterRelevantFiles(searchResult.files)

    let addedFiles = 0
    let reindexedFiles = 0

    // Now just iterate and store to the database.
    for (const [type, files] of Object.entries(relevantFiles)) {
      for (const file of files) {
        try {
          const parsedFile = await this.getParsedAudioFile(file)
          this.db.insertTrack(parsedFile)
          if (type === 'toAdd') {
            addedFiles += 1
          }
          if (type === 'toReindex') {
            reindexedFiles += 1
          }
        }
        catch (err) {
          console.error(`Could not index file: ${file.filePath}`)
          console.error(err)
          continue
        }
      }
    }

    return {
      hasRun: true,
      totalFiles: searchResult.files.length,
      addedFiles,
      removedFiles: 0,
      reindexedFiles,
      inputDirectoryStatus: await this.fs.checkInputDirectoryStatus(),
    }
  }

  /**
   * Checks to see if existing files in the database need to be reindexed or removed.
   */
  public async recheckFiles(): Promise<IndexerResult> {
    await this.checkIndexerEnvironment()

    const toReindex: number[] = []
    const toRemove: number[] = []

    // Get all existing tracks. We'll check to see if the files still exist.
    const tracks = this.db.getAllTracks()
    const bundles = chunk(tracks, 100)

    for (const bundle of bundles) {
      await Promise.all(bundle.map(async (track) => {
        const filePath = this.fs.getAbsoluteFilename(track.filename)
        if (!(await this.fs.isFileAccessible(filePath))) {
          toRemove.push(track.id!)
        }
      }))
    }
    
    for (const id of toRemove) {
      this.db.deleteTrackByID(id)
    }

    return {
      hasRun: true,
      totalFiles: tracks.length,
      addedFiles: 0,
      removedFiles: toRemove.length,
      reindexedFiles: 0,
      inputDirectoryStatus: await this.fs.checkInputDirectoryStatus(),
    }
  }

  /**
   * Combines various indexer result sets into one.
   */
  public combineIndexerResults(...resSets: IndexerResult[]): IndexerResult {
    if (resSets.length === 0) {
      throw new Error('No result sets passed')
    }

    const combined = {
      hasRun: resSets[0].hasRun,
      totalFiles: resSets[0].totalFiles,
      addedFiles: 0,
      removedFiles: 0,
      reindexedFiles: 0,
      inputDirectoryStatus: resSets[0].inputDirectoryStatus,
    }

    for (const res of resSets) {
      combined.addedFiles += res.addedFiles
      combined.removedFiles += res.removedFiles
      combined.reindexedFiles += res.reindexedFiles
    }

    // Note: This always assumes the resA values for hasRun and inputDirectoryStatus.
    // In practice this should only be used on two result sets for the same input directories.
    return combined
  }

  /**
   * Ensures that the indexer is capable of running.
   */
  private async checkIndexerEnvironment() {
    const status = await this.fs.checkInputDirectoryStatus()
    if (status.hasInaccessibleDirectories) {
      throw new Error(`Input directories inaccessible (check if all shares are mounted)`)
    }
  }
  
  /**
   * Returns audio file information.
   * 
   * This includes all the tags we need to index the file.
   */
  public async getParsedAudioFile(file: File): Promise<ParsedAudioFile> {
    const tags = await parseFileTags(file.filePath)
    return {
      file,
      tags,
    }
  }

  /**
   * Takes a list of audio files and returns only the files that we need to index.
   */
  private async filterRelevantFiles(audioFiles: File[]): Promise<{toAdd: File[], toReindex: File[]}> {
    const toAdd = []
    const toReindex = []
    for (const file of audioFiles) {
      const need = this.db.checkReindexingNeed(file)
      if (need.fileNeedsAdding) {
        toAdd.push(file)
      }
      if (need.fileNeedsReindexing) {
        toReindex.push(file)
      }
    }
    return {toAdd, toReindex}
  }

  /**
   * Returns all playlists defined in the config file.
   */
  public getPlaylists() {
    return this.config.playlists
  }

  /**
   * Reads the server config.
   */
  private async readConfig() {
    const content = await fs.readFile(path.join(this.envPaths.config, 'config.json'), 'utf8')
    const config = JSON.parse(content) as Config
    this.config = config
  }

  /**
   * Ensures that all directories exist.
   */
  private async ensureDirectories() {
    await fs.mkdir(this.envPaths.config, {recursive: true})
    await fs.mkdir(this.envPaths.cache, {recursive: true})
  }

  /**
   * Initializes the database controller.
   */
  private initializeDatabase() {
    this.db = new TuneDB(path.join(this.envPaths.cache, 'db.sqlite3'))
    this.db.initialize()
  }

  /**
   * Initializes the filesystem controller.
   */
  private initializeFilesystem() {
    this.fs = new TuneFS(this.config)
  }

  /**
   * Initializes everything needed to run the server.
   */
  public async initialize() {
    await this.ensureDirectories()
    await this.readConfig()
    this.initializeDatabase()
    this.initializeFilesystem()
    return this
  }
}
