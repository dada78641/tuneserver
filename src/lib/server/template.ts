// @dada78641/tuneserver <https://github.com/dada78641/tuneserver>
// © MIT license

import {getVersionString} from '../../util/version.ts'

/**
 * Returns HTML with template keywords replaced.
 */
export function getTemplate(_html: string) {
  let html = _html
  html = html.replaceAll('%%version%%', getVersionString())
  return html
}
