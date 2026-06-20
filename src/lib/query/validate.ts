// @dada78641/tuneserver <https://github.com/dada78641/tuneserver>
// © MIT license

import Ajv from 'ajv'
import {libraryQuerySchema} from './schema.ts'

const ajv = new Ajv.default({allErrors: true})
export const validateLibraryQuery = ajv.compile(libraryQuerySchema)
