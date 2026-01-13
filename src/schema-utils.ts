/**
 * Shared schema utilities
 *
 * Provides common schema loading and discovery functions used by
 * SchemaRegistry, SchemaValidator, and XARFValidator.
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Find the schemas directory by searching common locations
 * @returns Path to schemas directory
 */
export function findSchemasDir(): string {
  const possiblePaths = [
    path.join(__dirname, 'schemas'),
    path.join(__dirname, '..', 'schemas'),
    path.join(__dirname, '..', '..', 'schemas'),
    path.join(process.cwd(), 'schemas'),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p) && fs.existsSync(path.join(p, 'xarf-core.json'))) {
      return p;
    }
  }

  return possiblePaths[0];
}

/**
 * Load and parse a JSON schema file
 * @param schemaPath - Path to schema file
 * @returns Parsed schema object or null if not found/invalid
 */
export function loadSchemaFile<T = Record<string, unknown>>(schemaPath: string): T | null {
  try {
    if (!fs.existsSync(schemaPath)) {
      return null;
    }
    const content = fs.readFileSync(schemaPath, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}
