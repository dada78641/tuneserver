// @dada78641/tuneserver <https://github.com/dada78641/tuneserver>
// © MIT license

import pkg from '../../package.json' with {type: 'json'}

export interface Version {
  name: string
  version: string
}

/**
 * Returns the version as a string.
 */
export function getVersionString() {
  const version = getVersion()
  return `${version.name}@${version.version}`
}

/**
 * Returns the name and version of the package.
 */
export function getVersion(): Version {
  return {
    name: pkg.name,
    version: pkg.version
  }
}
