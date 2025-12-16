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
  private loadReferencedSchemas(schema: any, basePath: string = ''): void {
    // Check for $ref in schema
    if (schema.$ref && typeof schema.$ref === 'string') {
      const ref = schema.$ref;

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
    if (typeof schema === 'object' && schema !== null) {
      for (const key in schema) {
        if (typeof schema[key] === 'object') {
          this.loadReferencedSchemas(schema[key], basePath);
        }
      }
    }

    // Check array items
    if (Array.isArray(schema)) {
      schema.forEach((item) => this.loadReferencedSchemas(item, basePath));
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

      const coreSchema = JSON.parse(fs.readFileSync(coreSchemaPath, 'utf-8'));

      // Check if schema already exists before adding
      const schemaId = 'https://xarf.org/schemas/v4/xarf-core.json';
      if (!this.ajv.getSchema(schemaId)) {
        this.ajv.addSchema(coreSchema);
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
          const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));

          // Add schema if it has an $id and isn't already loaded
          if (schema.$id && !this.ajv.getSchema(schema.$id)) {
            this.ajv.addSchema(schema);
          }
        } catch (error) {
          // Ignore errors loading individual schemas
        }
      }
    }
  }

  /**
   * Load and compile the master XARF schema with type-specific validation
   * This includes all category+type combinations
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

      // Load and compile the master schema
      const masterSchema = this.loadSchemaFile('xarf-v4-master.json');

      // Add the master schema
      const masterSchemaId = 'https://xarf.org/schemas/v4/xarf-v4-master.json';
      if (!this.ajv.getSchema(masterSchemaId)) {
        this.ajv.addSchema(masterSchema);
      }

      // Compile the schema to validate it's correct
      this.ajv.compile(masterSchema);

      this.masterSchemaLoaded = true;
    } catch (error) {
      throw new Error(
        `Failed to load master schema: ${error instanceof Error ? error.message : String(error)}`
      );
    }
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
    return ajvErrors.map((error: Record<string, unknown>) => {
      const field = (error.instancePath as string) || (error.dataPath as string) || 'root';
      const message = (error.message as string) || 'validation failed';

      // Add additional context based on error keyword
      let detail = '';
      const params = error.params as Record<string, unknown> | undefined;
      if (error.keyword === 'required') {
        detail = ` (missing required field: ${params?.missingProperty || 'unknown'})`;
      } else if (error.keyword === 'enum') {
        const allowedValues = params?.allowedValues;
        detail = ` (allowed values: ${Array.isArray(allowedValues) ? allowedValues.join(', ') : 'unknown'})`;
      } else if (error.keyword === 'format') {
        detail = ` (expected format: ${params?.format || 'unknown'})`;
      } else if (error.keyword === 'pattern') {
        detail = ` (expected pattern: ${params?.pattern || 'unknown'})`;
      } else if (error.keyword === 'type') {
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
