/**
 * Shared schema utilities.
 *
 * The XARF JSON schemas are bundled into the package at build time (see
 * `schemas.generated.ts`, produced by `scripts/generate-schemas.js`). Reading
 * them from this in-memory bundle — rather than from disk — keeps the library
 * working in bundled, serverless, and edge environments where `fs`/`__dirname`
 * are unreliable, and removes the install-time network fetch entirely.
 */

import { bundledSchemas } from './schemas.generated';

/**
 * A parsed JSON Schema object.
 */
export type SchemaObject = Record<string, unknown>;

/**
 * Get a bundled schema by its relative path.
 * @param relativePath - Relative path used as the bundle key, e.g.
 *   "xarf-core.json" or "types/messaging-spam.json"
 * @returns The schema object, or null if not bundled
 */
export function getBundledSchema(relativePath: string): SchemaObject | null {
  const schema = bundledSchemas[relativePath];
  return schema ? (schema as SchemaObject) : null;
}

/**
 * Get the core XARF schema.
 * @returns The core schema, or null if not bundled
 */
export function getCoreSchema(): SchemaObject | null {
  return getBundledSchema('xarf-core.json');
}

/**
 * Get the master XARF schema (all category+type combinations).
 * @returns The master schema, or null if not bundled
 */
export function getMasterSchema(): SchemaObject | null {
  return getBundledSchema('xarf-v4-master.json');
}

/**
 * List the relative paths of all type-specific schemas.
 * @returns Array of relative paths, e.g. ["types/messaging-spam.json", ...]
 */
export function listTypeSchemaPaths(): string[] {
  return Object.keys(bundledSchemas).filter((key) => key.startsWith('types/'));
}

/**
 * Resolve a relative `$ref` to a base schema (e.g. "./content-base.json" or
 * "../content-base.json") to its bundled schema.
 *
 * Base schemas live under `types/`, so the leading relative segments are
 * stripped and the filename is looked up there.
 * @param ref - The `$ref` string from a schema
 * @returns The referenced base schema, or null if not found
 */
export function resolveBaseSchemaRef(ref: string): SchemaObject | null {
  const filename = ref.replace(/^(\.\.?\/)+/, '');
  return getBundledSchema(`types/${filename}`);
}
