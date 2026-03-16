/**
 * XARF Schema Validator
 * Production-ready validation using AJV with JSON Schema support
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import type { XARFReport } from './types';
import * as fs from 'fs';
import * as path from 'path';
import { findSchemasDir } from './schema-utils';
import { schemaRegistry } from './schema-registry';

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
  private strictAjv: Ajv;
  private coreSchemaLoaded = false;
  private masterSchemaLoaded = false;
  private schemasDir: string;

  /**
   * Create a configured AJV instance
   */
  private static createAjvInstance(): Ajv {
    const ajv = new Ajv({
      strict: false, // Disable strict mode to avoid issues with $schema references and x-recommended
      allErrors: true,
      verbose: true,
      validateFormats: true,
      // Disable meta-schema validation during schema compilation
      // Our schemas reference JSON Schema Draft 2020-12 which AJV handles internally
      validateSchema: false,
    });
    addFormats(ajv);
    return ajv;
  }

  /**
   * Initialize SchemaValidator with AJV and format validators
   */
  constructor() {
    this.ajv = SchemaValidator.createAjvInstance();
    this.strictAjv = SchemaValidator.createAjvInstance();

    // Determine schemas directory path
    // Schemas are fetched from xarf-spec to project_root/schemas/ and copied to dist/schemas/ on build
    this.schemasDir = findSchemasDir();
  }

  /**
   * Transform a schema for strict mode by promoting x-recommended properties to required.
   * Deep-clones the schema and recursively walks all object definitions.
   * @param schema - Original schema object
   * @returns Transformed deep clone with x-recommended fields added to required arrays
   */
  transformSchemaForStrict(schema: object): object {
    const clone = JSON.parse(JSON.stringify(schema));
    this.promoteRecommendedToRequired(clone);
    return clone;
  }

  /**
   * Recursively walk a schema node and add x-recommended properties to required arrays.
   * Mutates the node in place.
   * @param node
   */
  private promoteRecommendedToRequired(node: unknown): void {
    if (typeof node !== 'object' || node === null) return;

    if (Array.isArray(node)) {
      for (const item of node) {
        this.promoteRecommendedToRequired(item);
      }
      return;
    }

    const obj = node as Record<string, unknown>;

    // Promote x-recommended properties to required
    if (obj.properties && typeof obj.properties === 'object' && !Array.isArray(obj.properties)) {
      const properties = obj.properties as Record<string, Record<string, unknown>>;
      const required = new Set<string>(
        Array.isArray(obj.required) ? (obj.required as string[]) : []
      );

      for (const [propName, propDef] of Object.entries(properties)) {
        if (
          propDef &&
          typeof propDef === 'object' &&
          !Array.isArray(propDef) &&
          propDef['x-recommended'] === true
        ) {
          required.add(propName);
        }
      }

      obj.required = Array.from(required);
    }

    // Recurse into schema-relevant sub-structures only
    const schemaKeys = [
      'properties',
      '$defs',
      'allOf',
      'anyOf',
      'oneOf',
      'items',
      'if',
      'then',
      'else',
      'not',
      'additionalProperties',
    ];
    for (const key of schemaKeys) {
      if (!obj[key] || typeof obj[key] !== 'object') continue;

      if (key === 'properties' || key === '$defs') {
        // These are dictionaries — recurse into each value
        for (const value of Object.values(obj[key] as Record<string, unknown>)) {
          this.promoteRecommendedToRequired(value);
        }
      } else {
        this.promoteRecommendedToRequired(obj[key]);
      }
    }
  }

  /**
   * Load a schema file from the schemas directory
   * Helper method to load schemas synchronously
   * @param relativePath - Relative path to schema file within schemas directory
   * @returns Parsed schema object
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
   * @param schema - Schema object to scan for $ref references
   * @param basePath - Base path for resolving relative schema references
   */
  private loadReferencedSchemas(schema: unknown, basePath: string = ''): void {
    const schemaObj = schema as Record<string, unknown>;

    // Process $ref if present
    if (schemaObj.$ref && typeof schemaObj.$ref === 'string') {
      this.processSchemaRef(schemaObj.$ref, basePath);
    }

    // Recursively process nested structures
    this.processNestedSchemas(schemaObj, basePath);
  }

  /**
   * Process a schema $ref and load it if needed
   * @param ref - Schema reference string
   * @param basePath - Base path for resolving relative references
   */
  private processSchemaRef(ref: string, basePath: string): void {
    // Skip meta-schemas and anchor references
    if (this.shouldSkipRef(ref)) {
      return;
    }

    const relativePath = this.normalizeRelativePath(ref, basePath);
    const schemaId = this.buildSchemaId(relativePath);

    // Load and add schema if not already loaded
    if (!this.ajv.getSchema(schemaId)) {
      this.loadAndAddSchema(relativePath);
    }
  }

  /**
   * Check if a schema reference should be skipped
   * @param ref - Schema reference string
   * @returns True if ref should be skipped (handled by AJV internally)
   */
  private shouldSkipRef(ref: string): boolean {
    return ref.includes('json-schema.org') || ref.startsWith('#');
  }

  /**
   * Normalize a relative path based on context
   * @param ref - Schema reference string
   * @param basePath - Base path for resolving relative references
   * @returns Normalized relative path
   */
  private normalizeRelativePath(ref: string, basePath: string): string {
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

    return relativePath;
  }

  /**
   * Build schema ID from relative path
   * @param relativePath - Relative path to schema file
   * @returns Full schema ID URL
   */
  private buildSchemaId(relativePath: string): string {
    return relativePath.startsWith('http')
      ? relativePath
      : `https://xarf.org/schemas/v4/${relativePath}`;
  }

  /**
   * Load and add a schema file
   * @param relativePath - Relative path to schema file (also used as basePath for nested schemas)
   */
  private loadAndAddSchema(relativePath: string): void {
    try {
      const referencedSchema = this.loadSchemaFile(relativePath);
      this.ajv.addSchema(referencedSchema);
      this.strictAjv.addSchema(
        this.transformSchemaForStrict(referencedSchema) as Record<string, unknown>
      );

      // Recursively load any schemas referenced by this schema
      this.loadReferencedSchemas(referencedSchema, relativePath);
    } catch (error) {
      // Ignore errors for already-loaded or missing schemas
      // Explicitly acknowledge error to satisfy linter
      void error;
    }
  }

  /**
   * Recursively process nested schemas (objects and arrays)
   * @param schemaObj - Schema object to process
   * @param basePath - Base path for resolving relative references
   */
  private processNestedSchemas(schemaObj: Record<string, unknown>, basePath: string): void {
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
      const strictCoreSchema = this.transformSchemaForStrict(coreSchema) as Record<string, unknown>;

      // Register core schema under BOTH the relative path and full URL
      // Master schema uses relative path "xarf-core.json"
      const relativePath = 'xarf-core.json';
      if (!this.ajv.getSchema(relativePath)) {
        this.ajv.addSchema({ ...coreSchema, $id: relativePath });
        this.strictAjv.addSchema({ ...strictCoreSchema, $id: relativePath });
      }

      // Also register under full URL for completeness
      const fullUrl = 'https://xarf.org/schemas/v4/xarf-core.json';
      if (!this.ajv.getSchema(fullUrl)) {
        this.ajv.addSchema({ ...coreSchema, $id: fullUrl });
        this.strictAjv.addSchema({ ...strictCoreSchema, $id: fullUrl });
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

          // Build the FULL URL that AJV will resolve
          // Master schema id is https://xarf.org/schemas/v4/xarf-v4-master.json
          // When it references "types/messaging-spam.json", AJV resolves to full URL
          const relativePath = `types/${file}`;
          const fullUrl = `https://xarf.org/schemas/v4/${relativePath}`;

          // Add schema under the FULL URL (what AJV resolves to)
          if (!this.ajv.getSchema(fullUrl)) {
            this.ajv.addSchema({ ...schema, $id: fullUrl });
            const strictSchema = this.transformSchemaForStrict(schema) as Record<string, unknown>;
            this.strictAjv.addSchema({ ...strictSchema, $id: fullUrl });
          }
        } catch (error) {
          // Ignore errors loading individual schemas
          // Explicitly acknowledge error to satisfy linter
          void error;
        }
      }
    }
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

      // Add the master schema to both AJV instances
      const masterSchemaId = 'https://xarf.org/schemas/v4/xarf-v4-master.json';
      if (!this.ajv.getSchema(masterSchemaId)) {
        this.ajv.addSchema(masterSchema);
      }
      if (!this.strictAjv.getSchema(masterSchemaId)) {
        const strictMasterSchema = this.transformSchemaForStrict(masterSchema) as Record<
          string,
          unknown
        >;
        this.strictAjv.addSchema(strictMasterSchema);
      }

      this.masterSchemaLoaded = true;
    } catch (error) {
      throw new Error(
        `Failed to load master schema: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Validate a XARF report against the appropriate schema
   * Validates against both the core schema and the type-specific schema
   * @param report - The XARF report to validate
   * @param strict
   * @returns ValidationResult with status and any error messages
   * @example
   * ```typescript
   * const validator = new SchemaValidator();
   * const result = validator.validate(report);
   * if (!result.valid) {
   *   console.error('Validation errors:', result.errors);
   * }
   * ```
   */
  validate(report: XARFReport, strict = false): ValidationResult {
    try {
      // Ensure schemas are loaded
      this.loadMasterSchema();

      const ajvInstance = strict ? this.strictAjv : this.ajv;
      const masterSchemaId = 'https://xarf.org/schemas/v4/xarf-v4-master.json';
      const masterValidate = ajvInstance.getSchema(masterSchemaId);

      if (!masterValidate) {
        return { valid: false, errors: ['Master schema not found after loading'] };
      }

      const valid = masterValidate(report);
      if (valid) {
        return { valid: true, errors: [] };
      }

      // Deduplicate errors (core schema is referenced from both master and type schemas)
      const errors = this.formatValidationErrors(masterValidate.errors || []);
      const uniqueErrors = [...new Set(errors)];
      return { valid: false, errors: uniqueErrors };
    } catch (error) {
      return {
        valid: false,
        errors: [`Validation failed: ${error instanceof Error ? error.message : String(error)}`],
      };
    }
  }

  /**
   * Format AJV validation errors into human-readable messages
   * @param ajvErrors - Array of AJV error objects from validation
   * @returns Array of formatted error messages with field and context information
   */
  private formatValidationErrors(ajvErrors: unknown[]): string[] {
    return ajvErrors.map((error: unknown) => {
      const err = error as Record<string, unknown>;
      const field = (err.instancePath as string) || (err.dataPath as string) || 'root';
      const message = (err.message as string) || 'validation failed';
      const keyword = err.keyword as string;
      const params = err.params as Record<string, unknown> | undefined;

      const detail = this.buildErrorDetail(keyword, params);
      return `${field}: ${message}${detail}`;
    });
  }

  /**
   * Build detailed error context based on validation keyword
   * @param keyword - AJV validation keyword (required, enum, format, etc.)
   * @param params - Error parameters containing specific validation details
   * @returns Formatted detail string with context information
   */
  private buildErrorDetail(keyword: string, params?: Record<string, unknown>): string {
    switch (keyword) {
      case 'required':
        return this.formatRequiredError(params);
      case 'enum':
        return this.formatEnumError(params);
      case 'format':
        return this.formatFormatError(params);
      case 'pattern':
        return this.formatPatternError(params);
      case 'type':
        return this.formatTypeError(params);
      default:
        return '';
    }
  }

  /**
   * Format required field error detail
   * @param params - Error parameters
   * @returns Formatted detail string
   */
  private formatRequiredError(params?: Record<string, unknown>): string {
    return ` (missing required field: ${params?.missingProperty || 'unknown'})`;
  }

  /**
   * Format enum validation error detail
   * @param params - Error parameters
   * @returns Formatted detail string
   */
  private formatEnumError(params?: Record<string, unknown>): string {
    const allowedValues = params?.allowedValues;
    const values = Array.isArray(allowedValues) ? allowedValues.join(', ') : 'unknown';
    return ` (allowed values: ${values})`;
  }

  /**
   * Format format validation error detail
   * @param params - Error parameters
   * @returns Formatted detail string
   */
  private formatFormatError(params?: Record<string, unknown>): string {
    return ` (expected format: ${params?.format || 'unknown'})`;
  }

  /**
   * Format pattern validation error detail
   * @param params - Error parameters
   * @returns Formatted detail string
   */
  private formatPatternError(params?: Record<string, unknown>): string {
    return ` (expected pattern: ${params?.pattern || 'unknown'})`;
  }

  /**
   * Format type validation error detail
   * @param params - Error parameters
   * @returns Formatted detail string
   */
  private formatTypeError(params?: Record<string, unknown>): string {
    return ` (expected type: ${params?.type || 'unknown'})`;
  }

  /**
   * Check if a specific category+type combination is supported
   * @param category - XARF category
   * @param type - XARF type
   * @returns true if the combination has a specific schema
   */
  hasTypeSchema(category: string, type: string): boolean {
    return schemaRegistry.isValidType(category, type);
  }

  /**
   * Get list of all supported category+type combinations
   * @returns Array of {category, type} objects
   */
  getSupportedTypes(): Array<{ category: string; type: string }> {
    const types: Array<{ category: string; type: string }> = [];
    for (const category of schemaRegistry.getCategories()) {
      for (const type of schemaRegistry.getTypesForCategory(category)) {
        types.push({ category, type });
      }
    }
    return types;
  }
}

/**
 * Singleton instance for easy import and use
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
