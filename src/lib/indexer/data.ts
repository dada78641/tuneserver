// @dada78641/tuneserver <https://github.com/dada78641/tuneserver>
// © MIT license

import type {Track} from './types.ts'
import type {LibraryColumnValue} from '../query/types.ts'
import type {ColumnOutput, TrackOutput, TrackOutputOrdered} from './types.ts'

/**
 * Formats a track string (or disc string).
 */
function formatTrackString(track: number, trackOf: number): string {
  if (trackOf > 0) {
    return `${track}/${trackOf}`
  }
  if (track === 0) {
    return ``
  }
  return `${track}`
}

/**
 * Formats the duration of a song.
 */
export function formatDuration(duration: number): string {
  let remainder = duration
  const hours = Math.floor(remainder / 3600)
  remainder -= hours * 3600
  const minutes = Math.floor(remainder / 60)
  remainder -= minutes * 60
  const seconds = Math.floor(remainder)

  if (hours) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  else {
    return `${minutes}:${String(seconds).padStart(2, '0')}`
  }
}

/**
 * Formats minimum and maximum year values into a single string.
 */
export function formatYear(minYear: string, maxYear: string): string {
  if (minYear === maxYear) {
    if (minYear == null) {
      return ''
    }
    return `${minYear}`
  }
  return `${minYear}-${maxYear}`
}

/**
 * Returns the API output version of a library column value.
 */
export function getOutputColumnValue(column: LibraryColumnValue): ColumnOutput {
  return {
    value: column.value,
    albumCount: column.albumCount,
    trackCount: column.trackCount,
    year: formatYear(column.minYear, column.maxYear),
  }
}

/**
 * Converts a library columns object for output.
 */
export function getOutputColumns(columns: LibraryColumnValue[][]): ColumnOutput[][] {
  return columns.map(column => column.map(value => getOutputColumnValue(value)))
}

/**
 * Returns the API output version of a Track object.
 */
export function getOutputTrack(track: Track): TrackOutput {
  const trackParts = track.track.split('_').map(part => parseInt(part))
  const trackOfParts = track.trackOf.split('_').map(part => parseInt(part))

  return {
    id: track.id!,
    title: track.title,
    album: track.album,
    albumartist: track.albumartist,
    genre: track.genre,
    year: track.year,
    stars: track.stars,
    grouping: track.grouping,
    filename: track.filename,
    track: formatTrackString(trackParts[1], trackOfParts[1]),
    disc: formatTrackString(trackParts[0], trackOfParts[0]),
    duration: formatDuration(track.duration),
  }
}

/**
 * Converts Track objects into API output track objects.
 */
export function getOutputTracks(tracks: Track[]): TrackOutput[] {
  return tracks.map(track => getOutputTrack(track))
}

/**
 * Adds each track's ordering to the object.
 */
export function orderOutputTracks(tracks: TrackOutput[]): TrackOutputOrdered[] {
  return tracks.map((track, n) => ({...track, n}))
}
