// tuneserver <https://github.com/dada78641/tuneserver>
// © MIT License

import fs from 'node:fs/promises'

/**
 * Returns whether a given path is accessible.
 */
export async function canAccess(fp: string): Promise<boolean> {
  try {
    await fs.access(fp, fs.constants.F_OK)
    return true
  }
  catch {
    return false
  }
}
