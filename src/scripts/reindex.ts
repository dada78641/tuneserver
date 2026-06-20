// @dada78641/tuneserver <https://github.com/dada78641/tuneserver>
// © MIT license

import {TuneIndexer} from '../lib/indexer/index.ts'

async function main() {
  const tx = await new TuneIndexer().initialize()
  const resA = await tx.recheckFiles()
  const resB = await tx.scanFiles()
  console.log(JSON.stringify(tx.combineIndexerResults(resA, resB), null, 2))
}

main()
