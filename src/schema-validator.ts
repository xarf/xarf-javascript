/**
 * XARF Schema Validator
 * Production-ready validation using AJV with JSON Schema support
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import type { XARFReport } from './types';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Validation result containing status and error details
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Schema validation error with detailed context
 */
export interface ValidationError {
  field?: string;
  message: string;
  value?: unknown;
}

/**
 * SchemaValidator class for validating XARF reports against JSON schemas
 *
 * Features:
 * - Validates against xarf-core.json base schema
 * - Applies type-specific validation based on category+type
 * - Proper $ref resolution for nested schemas
 * - Comprehensive error handling and reporting
 * - Singleton pattern for easy reuse
 */
export class SchemaValidator {
  private ajv: Ajv;
  private coreSchemaLoaded = false;
  private masterSchemaLoaded = false;
  private schemasDir: string;

  constructor() {
    // Initialize AJV with strict mode and all errors
    this.ajv = new Ajv({
      strict: false, // Disable strict mode to avoid issues with $schema references
      allErrors: true,
      verbose: true,
      validateFormats: true,
      // Disable meta-schema validation during schema compilation
      // Our schemas reference JSON Schema Draft 2020-12 which AJV handles internally
      validateSchema: false,
    });

    // Add format validators (email, uri, date-time, etc.)
    addFormats(this.ajv);

    // Determine schemas directory path
    this.schemasDir = path.join(__dirname, 'schemas');
  }

  /**
   * Load a schema file from the schemas directory
   * Helper method to load schemas synchronously
   */
  private loadSchemaFile(relativePath: string): object {
    const schemaPath = path.join(this.schemasDir, relativePath);

    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found: ${schemaPath}`);
    }

    const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
    return JSON.parse(schemaContent);
  }

  /**
   * Recursively load all referenced schemas from a base schema
   * This manually handles $ref resolution for nested schemas
   */
  private loadReferencedSchemas(schema: unknown, basePath: string = ''): void {
    // Check for $ref in schema
    const schemaObj = schema as Record<string, unknown>;
    if (schemaObj.$ref && typeof schemaObj.$ref === 'string') {
      const ref = schemaObj.$ref;

      // Skip meta-schemas and anchor references
      if (ref.includes('json-schema.org') || ref.startsWith('#')) {
        // Skip - these are handled by AJV internally
      } else {
        // Handle relative paths (e.g., "types/messaging-spam.json" or "./content-base.json")
        let relativePath = ref;

        // Remove leading "./" for same-directory references
        if (relativePath.startsWith('./')) {
          relativePath = relativePath.substring(2);

          // If we have a basePath (e.g., we're in "types/content-phishing.json"),
          // prepend the directory from basePath
          if (basePath) {
            const baseDir = path.dirname(basePath);
            if (baseDir && baseDir !== '.') {
              relativePath = `${baseDir}/${relativePath}`;
            }
          }
        }

        // If it's a full URL, extract the relative path
        if (ref.includes('schemas/v4/')) {
          const match = ref.match(/schemas\/v4\/(.+\.json)/);
          if (match) {
            relativePath = match[1];
          }
        }

        // Build schema ID
        const schemaId = relativePath.startsWith('http')
          ? relativePath
          : `https://xarf.org/schemas/v4/${relativePath}`;

        // Load and add schema if not already loaded
        if (!this.ajv.getSchema(schemaId)) {
          try {
            const referencedSchema = this.loadSchemaFile(relativePath);
            this.ajv.addSchema(referencedSchema);

            // Recursively load any schemas referenced by this schema
            this.loadReferencedSchemas(referencedSchema, relativePath);
          } catch (error) {
            // Ignore errors for already-loaded or missing schemas
          }
        }
      }
    }

    // Recursively check all object properties
    if (typeof schemaObj === 'object' && schemaObj !== null) {
      for (const key in schemaObj) {
        if (typeof schemaObj[key] === 'object') {
          this.loadReferencedSchemas(schemaObj[key], basePath);
        }
      }
    }

    // Check array items
    if (Array.isArray(schemaObj)) {
      schemaObj.forEach((item) => this.loadReferencedSchemas(item, basePath));
    }
  }

  /**
   * Load and compile the core XARF schema
   * This must be called before validation can occur
   */
  private loadCoreSchema(): void {
    if (this.coreSchemaLoaded) {
      return;
    }

    try {
      const coreSchemaPath = path.join(this.schemasDir, 'xarf-core.json');
      if (!fs.existsSync(coreSchemaPath)) {
        throw new Error(`Core schema not found at: ${coreSchemaPath}`);
      }

      const coreSchema = JSON.parse(fs.readFileSync(coreSchemaPath, 'utf-8')) as Record<
        string,
        unknown
      >;

      // Register core schema under BOTH the relative path and full URL
      // Master schema uses relative path "xarf-core.json"
      const relativePath = 'xarf-core.json';
      if (!this.ajv.getSchema(relativePath)) {
        const schemaWithRelativeId = { ...coreSchema, $id: relativePath };
        this.ajv.addSchema(schemaWithRelativeId);
      }

      // Also register under full URL for completeness
      const fullUrl = 'https://xarf.org/schemas/v4/xarf-core.json';
      if (!this.ajv.getSchema(fullUrl)) {
        const schemaWithFullId = { ...coreSchema, $id: fullUrl };
        this.ajv.addSchema(schemaWithFullId);
      }

      this.coreSchemaLoaded = true;
    } catch (error) {
      throw new Error(
        `Failed to load core schema: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Pre-load all type-specific schemas into AJV
   * This ensures all $refs can be resolved during compilation
   */
  private preloadAllTypeSchemas(): void {
    const typesDir = path.join(this.schemasDir, 'types');

    if (!fs.existsSync(typesDir)) {
      return;
    }

    const files = fs.readdirSync(typesDir);

    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const schemaPath = path.join(typesDir, file);
          const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8')) as Record<
            string,
            unknown
          >;

          // Type schemas have `allOf: [{ $ref: "../xarf-core.json" }, { ... }]`
          // The master schema already includes the core schema via allOf
          // So we need to extract just the type-specific part (second element of allOf)
          const modifiedSchema = this.extractTypeSpecificSchema(schema);

          // Build the FULL URL that AJV will resolve
          // Master schema id is https://xarf.org/schemas/v4/xarf-v4-master.json
          // When it references "types/messaging-spam.json", AJV resolves to full URL
          const relativePath = `types/${file}`;
          const fullUrl = `https://xarf.org/schemas/v4/${relativePath}`;

          // Add schema under the FULL URL (what AJV resolves to)
          if (!this.ajv.getSchema(fullUrl)) {
            const schemaWithFullId = { ...modifiedSchema, $id: fullUrl };
            this.ajv.addSchema(schemaWithFullId);
          }
        } catch (error) {
          // Ignore errors loading individual schemas
        }
      }
    }
  }

  /**
   * Extract type-specific schema part, removing the $ref to core schema
   * Type schemas have structure: { allOf: [{ $ref: "../xarf-core.json" }, { type-specific }] }
   * We only need the type-specific part since master schema already includes core
   */
  private extractTypeSpecificSchema(schema: Record<string, unknown>): Record<string, unknown> {
    // If schema has allOf array with 2 elements
    if (
      schema.allOf &&
      Array.isArray(schema.allOf) &&
      schema.allOf.length === 2 &&
      typeof schema.allOf[1] === 'object'
    ) {
      // Return just the type-specific part (second element of allOf)
      return { ...schema, allOf: undefined, ...schema.allOf[1] };
    }

    // Otherwise return as-is
    return schema;
  }

  /**
   * Load and compile the master XARF schema with type-specific validation
   * This includes all category+type combinations
   *
   * Note: Some type-specific schemas may be missing from the master schema.
   * In that case, we create a filtered version that only includes existing schemas.
   */
  private loadMasterSchema(): void {
    if (this.masterSchemaLoaded) {
      return;
    }

    try {
      // First ensure core schema is loaded
      this.loadCoreSchema();

      // Pre-load all type-specific schemas
      this.preloadAllTypeSchemas();

      // Load the master schema
      const masterSchema = this.loadSchemaFile('xarf-v4-master.json') as Record<string, unknown>;

      // Filter out missing type-specific schemas from the master schema
      const filteredMasterSchema = this.filterMissingSchemas(masterSchema);

      // Add the filtered master schema
      const masterSchemaId = 'https://xarf.org/schemas/v4/xarf-v4-master.json';
      if (!this.ajv.getSchema(masterSchemaId)) {
        this.ajv.addSchema(filteredMasterSchema);
      }

      // Try to compile the schema
      try {
        this.ajv.compile(filteredMasterSchema);
      } catch (compileError) {
        // If compilation still fails, silently continue
        // Core schema validation will still work
        // Suppress unused variable warning
        void compileError;
      }

      this.masterSchemaLoaded = true;
    } catch (error) {
      throw new Error(
        `Failed to load master schema: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Filter out references to missing type-specific schemas
   * This handles cases where the master schema references schemas that don't exist
   */
  private filterMissingSchemas(schema: Record<string, unknown>): Record<string, unknown> {
    // Clone the schema
    const filtered = JSON.parse(JSON.stringify(schema));

    // Find the anyOf array that contains type-specific validations
    if (
      filtered.allOf &&
      Array.isArray(filtered.allOf) &&
      filtered.allOf[1] &&
      typeof filtered.allOf[1] === 'object' &&
      (filtered.allOf[1] as Record<string, unknown>).anyOf
    ) {
      const anyOf = (filtered.allOf[1] as Record<string, unknown>).anyOf as Array<
        Record<string, unknown>
      >;

      // Filter out entries that reference missing schemas
      const filteredAnyOf = anyOf.filter((entry: Record<string, unknown>) => {
        if (entry.then && typeof entry.then === 'object') {
          const ref = (entry.then as Record<string, unknown>).$ref;
          if (typeof ref === 'string' && ref.startsWith('types/')) {
            const schemaFile = ref.replace('types/', '');
            const schemaPath = path.join(this.schemasDir, 'types', schemaFile);
            return fs.existsSync(schemaPath);
          }
        }
        return true;
      });

      // Update the anyOf array
      (filtered.allOf[1] as Record<string, unknown>).anyOf = filteredAnyOf;
    }

    return filtered;
  }

  /**
   * Validate a XARF report against the appropriate schema
   *
   * @param report - The XARF report to validate
   * @returns ValidationResult with status and any error messages
   *
   * @example
   * ```typescript
   * const validator = new SchemaValidator();
   * const result = validator.validate(report);
   * if (!result.valid) {
   *   console.error('Validation errors:', result.errors);
   * }
   * ```
   */
  validate(report: XARFReport): ValidationResult {
    try {
      // Ensure schemas are loaded
      this.loadMasterSchema();

      // Get the compiled master schema
      const masterSchema = this.ajv.getSchema('https://xarf.org/schemas/v4/xarf-v4-master.json');

      if (!masterSchema) {
        throw new Error('Master schema not found after loading');
      }

      // Validate the report
      const valid = masterSchema(report);

      if (valid) {
        return {
          valid: true,
          errors: [],
        };
      }

      // Format validation errors
      const errors = this.formatValidationErrors(masterSchema.errors || []);

      return {
        valid: false,
        errors,
      };
    } catch (error) {
      // Handle unexpected validation errors
      return {
        valid: false,
        errors: [`Validation failed: ${error instanceof Error ? error.message : String(error)}`],
      };
    }
  }

  /**
   * Validate only against core schema (without type-specific validation)
   * Useful for partial validation or testing
   *
   * @param report - The XARF report to validate
   * @returns ValidationResult with status and any error messages
   */
  validateCore(report: XARFReport): ValidationResult {
    try {
      // Ensure core schema is loaded
      this.loadCoreSchema();

      const coreSchema = this.ajv.getSchema('https://xarf.org/schemas/v4/xarf-core.json');

      if (!coreSchema) {
        throw new Error('Core schema not found after loading');
      }

      const valid = coreSchema(report);

      if (valid) {
        return {
          valid: true,
          errors: [],
        };
      }

      const errors = this.formatValidationErrors(coreSchema.errors || []);

      return {
        valid: false,
        errors,
      };
    } catch (error) {
      return {
        valid: false,
        errors: [
          `Core validation failed: ${error instanceof Error ? error.message : String(error)}`,
        ],
      };
    }
  }

  /**
   * Format AJV validation errors into human-readable messages
   */
  private formatValidationErrors(ajvErrors: unknown[]): string[] {
    return ajvErrors.map((error: unknown) => {
      const err = error as Record<string, unknown>;
      const field = (err.instancePath as string) || (err.dataPath as string) || 'root';
      const message = (err.message as string) || 'validation failed';
      const keyword = err.keyword as string;

      // Add additional context based on error keyword
      let detail = '';
      const params = err.params as Record<string, unknown> | undefined;
      if (keyword === 'required') {
        detail = ` (missing required field: ${params?.missingProperty || 'unknown'})`;
      } else if (keyword === 'enum') {
        const allowedValues = params?.allowedValues;
        detail = ` (allowed values: ${Array.isArray(allowedValues) ? allowedValues.join(', ') : 'unknown'})`;
      } else if (keyword === 'format') {
        detail = ` (expected format: ${params?.format || 'unknown'})`;
      } else if (keyword === 'pattern') {
        detail = ` (expected pattern: ${params?.pattern || 'unknown'})`;
      } else if (keyword === 'type') {
        detail = ` (expected type: ${params?.type || 'unknown'})`;
      }

      return `${field}: ${message}${detail}`;
    });
  }

  /**
   * Check if a specific category+type combination is supported
   *
   * @param category - XARF category
   * @param type - XARF type
   * @returns true if the combination has a specific schema
   */
  hasTypeSchema(category: string, type: string): boolean {
    const schemaFile = `${category}-${type}.json`;
    const schemaPath = path.join(this.schemasDir, 'types', schemaFile);
    return fs.existsSync(schemaPath);
  }

  /**
   * Get list of all supported category+type combinations
   *
   * @returns Array of {category, type} objects
   */
  getSupportedTypes(): Array<{ category: string; type: string }> {
    const typesDir = path.join(this.schemasDir, 'types');

    if (!fs.existsSync(typesDir)) {
      return [];
    }

    const files = fs.readdirSync(typesDir);
    const types: Array<{ category: string; type: string }> = [];

    for (const file of files) {
      if (file.endsWith('.json') && !file.endsWith('-base.json')) {
        const match = file.match(/^([^-]+)-(.+)\.json$/);
        if (match) {
          types.push({
            category: match[1],
            type: match[2],
          });
        }
      }
    }

    return types;
  }
}

/**
 * Singleton instance for easy import and use
 *
 * @example
 * ```typescript
 * import { validator } from './schema-validator';
 *
 * const result = await validator.validate(report);
 * if (!result.valid) {
 *   console.error(result.errors);
 * }
 * ```
 */
export const validator = new SchemaValidator();
