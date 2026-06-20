[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=fff)](https://www.typescriptlang.org/) [![npm version](https://badge.fury.io/js/@dada78641%2Fyapcraft-widgets.svg)](https://badge.fury.io/js/@dada78641%2Fyapcraft-widgets)

# TuneServer

A music server and jukebox for use on my stream.

This features a media library similar to the one in Winamp. It's designed to act as a controller for the Webamp instance running in the stream interface. When playing music, it sends a signal to that Webamp instance telling it to play the song (more accurately, to play the current list of files as a playlist, starting with the highlighted one), through the OBS websocket connection.

This project is totally tailored for my own stream and has a number of opinionated choices.

## Usage

Run the server in production using [PM2](https://pm2.keymetrics.io/):

```bash
pm2 start TuneServer # or ./ecosystem.config.json
```

## Setup

Set up a configuration file in `~/.config/tuneserver/config.json`.

```json
{
  "inputDirectories": ["/dir/to/my/music"]
}
```

The server will create an SQLite database at `~/.cache/tuneserver/db.sqlite3`.

## Indexing

Before any files are usable, they need to be indexed first. The indexing process happens as follows:

* Get a list of all audio files inside the given input directories.
* Remove any files that we don't need to index (already present in the database with the same modification time).
* Of the remaining files, fetch their tags and insert them into the database.

## Copyright

© 2023-2026
