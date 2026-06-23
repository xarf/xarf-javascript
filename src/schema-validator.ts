/**
 * XARF Schema Validator
 * Production-ready validation using AJV with JSON Schema support.
 *
 * Schemas are read from the in-memory bundle (see `schema-utils.ts`), so no
 * filesystem or network access is required at runtime.
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import type { XARFReport } from './types';
import {
  getCoreSchema,
  getMasterSchema,
  listTypeSchemaPaths,
  getBundledSchema,
  type SchemaObject,
} from './schema-utils';
import { schemaRegistry } from './schema-registry';

const SCHEMA_BASE_URL = 'https://xarf.org/schemas/v4';
const MASTER_SCHEMA_ID = `${SCHEMA_BASE_URL}/xarf-v4-master.json`;
const CORE_SCHEMA_ID = `${SCHEMA_BASE_URL}/xarf-core.json`;

/**
 * Validation result containing status and error details
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * SchemaValidator class for validating XARF reports against JSON schemas
 *
 * Features:
 * - Validates against the bundled xarf-v4-master schema (core + type-specific)
 * - Registers every schema under its canonical `$id` so AJV resolves all `$ref`s
 * - Optional strict mode that promotes `x-recommended` fields to required
 * - Comprehensive error formatting
 * - Singleton instance for easy reuse
 */
export class SchemaValidator {
  private ajv: Ajv;
  private strictAjv: Ajv;
  private masterSchemaLoaded = false;

  /**
   * Create a configured AJV instance
   * @returns A configured AJV instance with formats registered
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
   * @param node - The schema node to walk
   */
  private promoteRecommendedToRequired(node: unknown): void {
    if (typeof node !== 'object' || node === null) {
      return;
    }

    if (Array.isArray(node)) {
      node.forEach((item) => this.promoteRecommendedToRequired(item));
      return;
    }

    const obj = node as Record<string, unknown>;
    this.promoteNodeProperties(obj);
    this.recurseIntoSubSchemas(obj);
  }

  /**
   * Add this node's `x-recommended` properties to its `required` array.
   * @param obj - The schema node to mutate
   */
  private promoteNodeProperties(obj: Record<string, unknown>): void {
    const properties = obj.properties;
    if (typeof properties !== 'object' || properties === null || Array.isArray(properties)) {
      return;
    }

    const required = new Set<string>(Array.isArray(obj.required) ? (obj.required as string[]) : []);

    for (const [propName, propDef] of Object.entries(properties as Record<string, unknown>)) {
      if (
        propDef &&
        typeof propDef === 'object' &&
        !Array.isArray(propDef) &&
        (propDef as Record<string, unknown>)['x-recommended'] === true
      ) {
        required.add(propName);
      }
    }

    obj.required = Array.from(required);
  }

  /**
   * Recurse into the schema-relevant sub-structures of a node.
   * @param obj - The schema node whose children should be walked
   */
  private recurseIntoSubSchemas(obj: Record<string, unknown>): void {
    const dictionaryKeys = ['properties', '$defs'];
    const nestedKeys = [
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

    for (const key of dictionaryKeys) {
      const value = obj[key];
      if (value && typeof value === 'object') {
        for (const child of Object.values(value as Record<string, unknown>)) {
          this.promoteRecommendedToRequired(child);
        }
      }
    }

    for (const key of nestedKeys) {
      const value = obj[key];
      if (value && typeof value === 'object') {
        this.promoteRecommendedToRequired(value);
      }
    }
  }

  /**
   * Register a schema under the given `$id` in both the lenient and strict AJV
   * instances, unless it is already registered.
   * @param schema - The schema object to register
   * @param id - The canonical `$id` to register it under
   */
  private addSchemaUnderId(schema: SchemaObject, id: string): void {
    if (!this.ajv.getSchema(id)) {
      this.ajv.addSchema({ ...schema, $id: id });
    }
    if (!this.strictAjv.getSchema(id)) {
      const strict = this.transformSchemaForStrict(schema) as SchemaObject;
      this.strictAjv.addSchema({ ...strict, $id: id });
    }
  }

  /**
   * Load and compile the master XARF schema together with the core and all
   * type-specific schemas, so AJV can resolve every `$ref`. Idempotent.
   */
  private loadMasterSchema(): void {
    if (this.masterSchemaLoaded) {
      return;
    }

    const coreSchema = getCoreSchema();
    if (!coreSchema) {
      throw new Error('Core schema (xarf-core.json) is missing from the bundle');
    }
    const masterSchema = getMasterSchema();
    if (!masterSchema) {
      throw new Error('Master schema (xarf-v4-master.json) is missing from the bundle');
    }

    // Register core under both its full URL and the relative id the master uses.
    this.addSchemaUnderId(coreSchema, CORE_SCHEMA_ID);
    this.addSchemaUnderId(coreSchema, 'xarf-core.json');

    // Register every type schema under its canonical full URL.
    for (const relativePath of listTypeSchemaPaths()) {
      const schema = getBundledSchema(relativePath);
      if (schema) {
        this.addSchemaUnderId(schema, `${SCHEMA_BASE_URL}/${relativePath}`);
      }
    }

    // Finally register the master schema itself.
    this.addSchemaUnderId(masterSchema, MASTER_SCHEMA_ID);

    this.masterSchemaLoaded = true;
  }

  /**
   * Validate a XARF report against the appropriate schema
   * Validates against both the core schema and the type-specific schema
   * @param report - The XARF report to validate
   * @param strict - When true, `x-recommended` fields are treated as required
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
      const masterValidate = ajvInstance.getSchema(MASTER_SCHEMA_ID);

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
 * const result = validator.validate(report);
 * if (!result.valid) {
 *   console.error(result.errors);
 * }
 * ```
 */
export const validator = new SchemaValidator();
