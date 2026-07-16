// @dada78641/tuneserver <https://github.com/dada78641/tuneserver>
// © MIT license

import Database from 'better-sqlite3'
import type {File, FileIndexStatus, ParsedAudioFile, Track, Playlist} from './types.ts'
import type {LibraryQuery, LibraryQueryResult, LibraryColumn, LibraryColumnValue} from '../query/types.ts'

// Nested selection clauses for filtering columns.
type NestedClauses = ([string, string] | null)[][]

/**
 * Database class that handles all persistent data.
 * 
 * This tracks all our audio files and contains their parsed metadata.
 * To create this data, all files are analyzed one by one, with the data
 * getting updated if the file ever changes.
 * 
 * TODO
 */
export class TuneDB {
  private db: Database.Database

  private stmtInsertTrack!: Database.Statement
  private stmtGetTrackByFilename!: Database.Statement
  private stmtGetTrackByID!: Database.Statement
  private stmtAllTracks!: Database.Statement
  private stmtDeleteTrackByID!: Database.Statement

  private stmtCreatePlaylist!: Database.Statement
  private stmtAddPlaylistItem!: Database.Statement
  private stmtPlaylistTracks!: Database.Statement

  constructor(file: string) {
    this.db = new Database(file)
    this.initialize()
  }

  /**
   * Initializes the database.
   */
  public initialize() {
    this.createSchema()
    this.createPreparedStatements()
  }

  /**
   * Inserts or replaces a given track.
   */
  public insertTrack(parsedAudioFile: ParsedAudioFile) {
    const trackData = this.unpackTrackData(parsedAudioFile)
    this.stmtInsertTrack.run(
      trackData.title,
      trackData.album,
      trackData.albumartist,
      trackData.genre,
      trackData.year,
      trackData.stars,
      trackData.grouping,
      trackData.filename,
      trackData.filedir,
      trackData.filemtime,
      trackData.track,
      trackData.trackOf,
      trackData.duration
    )
  }

  /**
   * Unpacks the audio metadata into data for a track row.
   */
  private unpackTrackData(parsedAudioFile: ParsedAudioFile): Track {
    const {file, tags} = parsedAudioFile
    return {
      title: tags.metadata.title ?? '',
      album: tags.metadata.album ?? '',
      albumartist: tags.metadata.albumartist ?? '',
      genre: (tags.metadata.genre ?? []).join(', '),
      year: tags.metadata.year ? String(tags.metadata.year) : null,
      stars: tags.metadata.stars ?? null,
      grouping: tags.metadata.grouping ?? '',
      filename: this.getFileIdentifier(file),
      filedir: file.filePrimaryDirectory,
      filemtime: parsedAudioFile.file.fileMtime,
      track: this.getTrackString(tags, 'no'),
      trackOf: this.getTrackString(tags, 'of'),
      duration: tags.format.duration ?? 0,
    }
  }

  /**
   * Returns a track/disc number string.
   * 
   * The return string is in the form of "00000_00000" where the first set
   * of zeroes is the disc number, and the second set is the track number,
   * defaulting to zeroes if not set.
   */
  private getTrackString(tags: ParsedAudioFile['tags'], type: 'no' | 'of'): string {
    const {metadata} = tags
    const discNo = metadata.disk?.[type] ?? 0
    const trackNo = metadata.track?.[type] ?? 0
    return `${String(discNo).padStart(5, '0')}_${String(trackNo).padStart(5, '0')}`
  }

  /**
   * Creates prepared statements to run later.
   */
  private createPreparedStatements() {
    this.stmtInsertTrack = this.db.prepare(`
      insert or replace into track
      (title, album, albumartist, genre, year, stars, grouping, filename, filedir, filemtime, track, trackOf, duration)
      values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.stmtGetTrackByFilename = this.db.prepare(`
      select * from track where filename = ?
    `);

    this.stmtGetTrackByID = this.db.prepare(`
      select * from track where id = ?
    `);

    this.stmtAllTracks = this.db.prepare(`
      select * from track
    `);

    this.stmtDeleteTrackByID = this.db.prepare(`
      delete from track where id = ?
    `);

    this.stmtCreatePlaylist = this.db.prepare(`
      insert into playlist (title) values (?)
    `);

    this.stmtAddPlaylistItem = this.db.prepare(`
      insert into playlist_track (playlist_id, track_id, ordering)
      values (?, ?, ?)
    `);

    this.stmtPlaylistTracks = this.db.prepare(`
      select t.*
      from playlist_track pt
      join track t on t.id = pt.track_id
      where pt.playlist_id = ?
      order by pt.ordering
    `);
  }

  /**
   * Returns whether a given string is a valid column type.
   */
  private isValidColumnType(col: LibraryColumn) {
    return ['album', 'albumartist', 'genre', 'grouping'].includes(col.type)
  }

  /**
   * Ensures that a list of column keys are valid.
   */
  private validateQueryColumns(cols: LibraryColumn[]) {
    cols.forEach(col => {
      if (!this.isValidColumnType(col)) {
        throw new Error(`Invalid column type: "${col.type}"`)
      }
    })
  }

  /**
   * Unpacks clauses and returns a list of parameters and values.
   */
  private unpackClauses(clauses: [string, string][]): [string[], string[]] {
    const parameters = []
    const values = []
    for (let n = 0; n < clauses.length; ++n) {
      const clause = clauses[n]
      parameters.push(clause[0])
      values.push(clause[1])
    }
    return [parameters, values]
  }

  /**
   * Unpacks nested clauses and returns a list of parameters and values.
   * 
   * Used for filters, which may have multiple simultaneous selectors.
   */
  private unpackNestedClauses(nestedClauses: NestedClauses): [(string | null)[][], (string | null)[]] {
    const parameters: (string | null)[][] = []
    const values: (string | null)[] = []
    for (let n = 0; n < nestedClauses.length; ++n) {
      const clause = nestedClauses[n]
      if (clause[0] === null) {
        parameters.push([null])
        values.push(null)
      }
      else {
        parameters.push(clause.map(clauseItem => (clauseItem as [string, string])[0]))
        values.push(...clause.map(clauseItem => (clauseItem as [string, string])[1]))
      }
    }
    return [parameters, values]
  }

  /**
   * Removes selected columns that are null off the end of a selection query.
   * 
   * Selection columns filter the list of tracks to a given set of conditions.
   * If a selection column is null, it means "any". The ones at the end are cut
   * off since the result will not change.
   */
  private removeNullColumns(selectedColumns: LibraryQuery['selectedColumns']): LibraryQuery['selectedColumns'] {
    const beforeLastNull = selectedColumns.findLastIndex(item => item !== null)
    return selectedColumns.slice(0, beforeLastNull + 1)
  }

  /**
   * Returns library tracks, categories and metadata based on a query.
   */
  public runLibraryQuery(query: LibraryQuery): LibraryQueryResult {
    // Ensure we're only working with valid keys.
    this.validateQueryColumns(query.category.columns)

    // The selected columns are what the user has clicked on in the column browser.
    // The columns contain things like album artist, album, grouping, etc. and is used
    // to quickly filter the list of displayed files.
    // As the user selects something in a column, the columns to the right get filtered
    // as well so you can quickly hone in on specific albums, artists, etc.
    const selectedColumnValues = this.removeNullColumns(query.selectedColumns)

    // And here's the column types equal in length to what's selected.
    const usedColumnTypes = query.category.columns.slice(0, selectedColumnValues.length)

    // Selector clauses are WHERE clauses based on the playlist itself.
    // E.g. the "Hip Hop" playlist will always filter the files for that genre,
    // regardless of what columns the user has selected.
    const selectorClauses: [string, string][][] = query.category.selector.map(selector => {
      if (selector.primaryDirectory) {
        return [[`t.filedir = ?`, selector.primaryDirectory]]
      }
      throw new Error(`Unknown selector clause: ${JSON.stringify(selector)}`)
    })

    // Column clauses are WHERE clauses based on what columns the user has clicked on.
    // Each column can have multiple items selected. In that case, it becomes an OR clause.
    const columnClauses: NestedClauses = selectedColumnValues
      .map((value, n) => {
        const col = usedColumnTypes[n]
        const clauses = []
        if (value === null) {
          clauses.push(null)
        }
        else {
          for (let n = 0; n < value.length; ++n) {
            clauses.push([`t.${col.type} = ?`, value![n]] as [string, string])
          }
        }
        return clauses
      })

    // Here we unpack the filters into a list of discrete columns we can query for.
    // The selectors are always AND (this is a list of filters a smart playlist can have).
    // For example: list all tracks with genre "Hip hop" AND stars = 5.
    // The filters, on the other hand, are always OR. This is so that, when the user selects
    // the artists "A Tribe Called Quest" and "MF DOOM" in the list, they both show up.
    const [selectorParameters, selectorValues] = this.unpackNestedClauses(selectorClauses)
    const [columnParameters, columnValues] = this.unpackNestedClauses(columnClauses)
    const combinedValues = [...selectorValues, ...columnValues].filter(value => value !== null)

    const joinedSelectorClauses = selectorParameters
      .filter(columnParameter => columnParameter[0] !== null)
      .map(selectorParameter => selectorParameter.join(' and '))
    const joinedColumnClauses = columnParameters
      .filter(columnParameter => columnParameter[0] !== null)
      .map(columnParameter => columnParameter.join(' or '))
    const selectorClausesVerb = joinedSelectorClauses.length ? 'where' : ''
    const columnClausesVerb = joinedSelectorClauses.length ? 'and' : 'where'

    // Query the tracks.
    const stmtQuery = this.db.prepare(`
      select t.*
      from track t
      ${joinedSelectorClauses.length ? `${selectorClausesVerb} (${joinedSelectorClauses.join(' and ')})` : ''}
      ${joinedColumnClauses.length ? `${columnClausesVerb} (${joinedColumnClauses.join(' and ')})` : ''}
      order by t.album asc, t.albumartist asc, t.track asc, t.id asc
      limit 200 offset 0
    `)
    const tracks = stmtQuery.all(...combinedValues) as Track[]

    // Now we'll query the columns. Unlike the tracks query, we don't apply every column clause.
    // We need to apply zero column clauses for the first column, one for the second, etc;
    // while always applying the selector clauses.
    const columns: LibraryColumnValue[][] = []
    for (let n = 0; n < query.category.columns.length; ++n) {
      const col = query.category.columns[n]

      // Determine the columns and values we'll filter by for this column.
      const [applicableColumnParameters, applicableColumnValues] = this.unpackNestedClauses(columnClauses.slice(0, n))
      const applicableColumnClauses = applicableColumnParameters
        .filter(columnParameter => columnParameter[0] !== null)
        .map(columnParameter => columnParameter.join(' or '))
      const currentColumnValues = [...selectorValues, ...applicableColumnValues].filter(value => value !== null)

      // Determine the ordering for this column.
      const ordering = this.columnOrdering(col)

      const stmtQueryColumn = this.db.prepare(`
        select
          t.${col.type} as value,
          count(distinct t.album) as albumCount,
          count(*) as trackCount,
          min(t.year) as minYear,
          max(t.year) as maxYear
        from track t
        ${joinedSelectorClauses.length ? `${selectorClausesVerb} (${joinedSelectorClauses.join(' and ')})` : ''}
        ${applicableColumnClauses.length ? `${columnClausesVerb} (${applicableColumnClauses.join(' and ')})` : ''}
        group by t.${col.type}
        having t.${col.type} is not null
        ${ordering}
      `)
      const items = stmtQueryColumn.all(...currentColumnValues) as LibraryColumnValue[]
      
      columns.push(items)
    }

    return {
      tracks,
      columns,
    }
  }

  /**
   * Returns a requested ordering for a column.
   */
  private columnOrdering(col: LibraryColumn) {
    let key = col.orderBy as string
    if (col.orderBy === 'value') {
      key = col.type
    }
    return `order by ${key} ${col.orderDirection}`
  }

  /**
   * Creates the schema.
   */
  private createSchema() {
    this.db.exec(`
      create table if not exists track (
        id integer primary key,
        title text,
        album text,
        albumartist text,
        genre text,
        year text,
        stars integer,
        grouping text,
        filename text unique,
        filedir text,
        filemtime number,
        track text,
        trackOf text,
        duration integer
      );

      create index if not exists idx_track_filedir_grouping_albumartist_album_year
        on track (filedir, grouping, albumartist, album, year);
      create index if not exists idx_track_genre_grouping_albumartist_album_year
        on track (genre, grouping, albumartist, album, year);
      create index if not exists idx_track_albumartist_grouping_album_year
        on track (albumartist, grouping, album, year);
      create index if not exists idx_track_grouping_albumartist_album_year
        on track (grouping, albumartist, album, year);
      create index if not exists idx_track_album_track
        on track (album, track);
      create index if not exists idx_track_albumartist_album_track
        on track (albumartist, album, track);
      create index if not exists idx_track_grouping_albumartist_album_track
        on track (grouping, albumartist, album, track);
      create index if not exists idx_track_stars
        on track (stars);
      create index if not exists idx_track_filedir
        on track (filedir);

      create table if not exists playlist (
        id integer primary key,
        title text
      );

      create table if not exists playlist_track (
        playlist_id integer,
        track_id integer,
        ordering integer,
        primary key (playlist_id, ordering)
      );
    `)
  }

  /**
   * Returns whether a file needs to be reindexed.
   * 
   * This returns true if the file has not yet been indexed,
   * or if the indexed information is stale, determined by mtime.
   */
  public checkReindexingNeed(file: File): FileIndexStatus {
    const fileID = this.getFileIdentifier(file)
    const track = this.getTrackByFilename(fileID)
    if (track == null) {
      return {fileNeedsAdding: true, fileNeedsReindexing: false}
    }
    if (track.filemtime < file.fileMtime) {
      return {fileNeedsAdding: false, fileNeedsReindexing: true}
    }
    return {fileNeedsAdding: false, fileNeedsReindexing: false}
  }

  /**
   * Returns a file identifier string.
   * 
   * This is a string containing the base directory identifier,
   * followed by the actual filename.
   */
  public getFileIdentifier(file: File): string {
    return `<${file.baseIdentifier}>${file.fileRelPath}`
  }

  /**
   * Returns a Track object by filename.
   */
  public getTrackByFilename(filename: string): Track | undefined {
    return this.stmtGetTrackByFilename.get(filename) as Track | undefined
  }

  /**
   * Returns a Track object by ID.
   */
  public getTrackByID(id: number): Track | undefined {
    return this.stmtGetTrackByID.get(id) as Track | undefined
  }

  /**
   * Deletes a track row by ID.
   */
  public deleteTrackByID(id: number): Database.RunResult {
    return this.stmtDeleteTrackByID.run(id)
  }

  getAllTracks(): Track[] {
    return this.stmtAllTracks.all() as Track[]
  }

  createPlaylist(title: string): number {
    const res = this.stmtCreatePlaylist.run(title)
    return Number(res.lastInsertRowid)
  }

  addTrackToPlaylist(playlistId: number, trackId: number, ordering: number) {
    this.stmtAddPlaylistItem.run(playlistId, trackId, ordering)
  }

  getPlaylistTracks(playlistId: number): Track[] {
    return this.stmtPlaylistTracks.all(playlistId) as Track[]
  }

  close() {
    this.db.close()
  }
}
