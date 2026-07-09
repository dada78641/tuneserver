// @dada78641/tuneserver <https://github.com/dada78641/tuneserver>
// © MIT license

import path from 'node:path'
import fs from 'node:fs/promises'
import fg from 'fast-glob'
import {createEnvPaths, type EnvPaths} from '@dada78641/env-paths'
import type {WinampSkin, WinampSkinFiles} from './types.ts'
import type {Config} from '../config.ts'

/**
 * Returns a cleaned up name for a skin.
 */
function cleanName(filename: string) {
  let fn = filename
  fn = fn.replaceAll('_', ' ')
  fn = fn.replace(/^\]/, ' ')
  return fn
}

export class WinampSkins {
  private envPaths: EnvPaths
  public config!: Config
  private cacheTime: number | undefined
  private cachedSkins!: WinampSkin[]

  constructor() {
    this.envPaths = createEnvPaths('tuneserver')
  }

  /**
   * Returns all our Winamp skins found in the configured directories.
   * 
   * This information is cached for a short time.
   */
  public async getWinampSkins(): Promise<WinampSkin[]> {
    if (!this.cacheIsStale()) {
      return this.cachedSkins
    }
    const allSkins = []
    for (const directory of this.config.winampSkinDirectories) {
      const {inputPath, identifier} = directory
      const skinFiles = await this.findWinampSkins(inputPath)
      const skins = this.getWinampSkinObjects(skinFiles, inputPath, identifier)
      allSkins.push(...skins)
    }
    this.cachedSkins = allSkins
    this.cacheTime = Date.now()
    return allSkins
  }

  /**
   * Returns a skin file path by ID.
   */
  public async getSkinPathByID(id: string, type: 'skin' | 'image') {
    const skins = await this.getWinampSkins()
    const skin = skins.find(skin => skin.id === id)
    if (!skin) {
      throw new Error('no_skin')
    }
    return this.getSkinAbsolutePath(skin, type)
  }

  /**
   * Returns the absolute path of a skin file.
   */
  private getSkinAbsolutePath(skin: WinampSkin, type: 'skin' | 'image'): string {
    const identifier = skin.id.split(':')[0]
    const skinDirectory = this.config.winampSkinDirectories.find(skinDirectory => skinDirectory.identifier === identifier)
    if (!skinDirectory) {
      throw new Error('no_skin')
    }
    return path.join(skinDirectory.inputPath, type === 'skin' ? skin.skinPath : skin.imagePath)
  }

  /**
   * Checks whether the cache is stale.
   */
  private cacheIsStale() {
    const ms15Mins = 60_000 * 15
    return this.cacheTime === undefined || (this.cacheTime < (Date.now() - ms15Mins))
  }

  /**
   * Completes the WinampSkin object by merging in the identifier.
   */
  private getWinampSkinObjects(skinFiles: WinampSkinFiles[], inputPath: string, identifier: string): WinampSkin[] {
    const skins = []
    for (const skinFile of skinFiles) {
      const filePath = path.parse(skinFile.skinPath)
      const id = filePath.name.trim()
      const name = cleanName(id)
      skins.push({
        id: `${identifier}:${id}`,
        name,
        skinPath: skinFile.skinPath,
        imagePath: skinFile.imagePath,
      })
    }
    return skins
  }

  /**
   * Finds Winamp skins to serve.
   * 
   * This requires that the Winamp skins have a preview image.
   */
  private async findWinampSkins(inputPath: string): Promise<WinampSkinFiles[]> {
    const skins = await fg(['*.wsz', '*.zip'], {cwd: inputPath, deep: 1})
    const images = await fg(['*.png'], {cwd: inputPath, deep: 1})

    const skinPaths = skins.map(skin => path.parse(skin))
    const imagePaths = images.map(image => path.parse(image))

    const skinsWithImage = []

    for (const skinPath of skinPaths) {
      const matchingImagePath = imagePaths.find(imagePath => imagePath.name === skinPath.name)
      if (!matchingImagePath) {
        continue
      }
      skinsWithImage.push({
        skinPath: skinPath.base,
        imagePath: matchingImagePath.base,
      })
    }

    return skinsWithImage
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
   * Initializes everything needed to grab skins.
   */
  public async initialize() {
    await this.readConfig()
    return this
  }
}
