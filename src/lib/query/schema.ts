// @dada78641/tuneserver <https://github.com/dada78641/tuneserver>
// © MIT license

import type {JSONSchemaType} from 'ajv'
import type {LibraryQuery} from './types.ts'

export const libraryQuerySchema: JSONSchemaType<LibraryQuery> = {
  type: 'object',
  additionalProperties: false,
  required: ['category', 'selectedColumns'],

  properties: {
    category: {
      type: 'object',
      additionalProperties: false,
      required: ['title', 'columns', 'selector'],

      properties: {
        title: {
          type: 'string',
          minLength: 1,
        },

        columns: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['type', 'orderBy', 'orderDirection', 'subColumns'],
            properties: {
              type: {
                type: 'string',
                enum: ['grouping', 'albumartist', 'album', 'genre'],
              },
              orderBy: {
                type: 'string',
                enum: ['value', 'year', 'albumCount', 'trackCount'],
              },
              orderDirection: {
                type: 'string',
                enum: ['asc', 'desc'],
              },
              subColumns: {
                type: 'array',
                items: {
                  type: 'string',
                  enum: ['value', 'year', 'albumCount', 'trackCount'],
                }
              }
            },
          },
        },

        selector: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            additionalProperties: false,
            required: [],
            properties: {
              primaryDirectory: {
                type: 'string',
                nullable: true,
                minLength: 1,
              },
            },
          },
        },
      },
    },

    selectedColumns: {
      type: 'array',
      minItems: 0,
      items: {
        type: 'string',
        nullable: true,
      },
    },
  },
}
