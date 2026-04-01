/**
 * Shared schema utilities
 *
 * Provides schema loading backed by the bundled static schemas,
 * making the library usable in browser environments without any
 * runtime filesystem access.
 */

import { bundledSchemas } from './bundled-schemas';

/**
 * Load a schema by its path relative to the schemas root.
 * @param relativePath - e.g. 'xarf-core.json' or 'types/messaging-spam.json'
 * @returns Parsed schema object or null if not found
 */
export function loadSchemaFile<T = Record<string, unknown>>(relativePath: string): T | null {
  const schema = bundledSchemas[relativePath];
  return schema ? (schema as unknown as T) : null;
}
