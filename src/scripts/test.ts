// @dada78641/tuneserver <https://github.com/dada78641/tuneserver>
// © MIT license

import {TuneIndexer} from '../lib/indexer/index.ts'

async function main() {
  const tx = await new TuneIndexer().initialize()
  const pl = tx.getPlaylists()
  const res1 = await tx.db.runLibraryQuery({
    category: pl[0],
    selectedColumns: [null, null],
  })
  const res2 = await tx.db.runLibraryQuery({
    category: pl[0],
    selectedColumns: [res1.columns[0][0].value, null],
  })
  console.log(JSON.stringify(res2, null, 2))
}

main()
