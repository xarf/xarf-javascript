/**
 * XARF Report Validator
 *
 * Provides advanced validation capabilities for XARF reports
 */

import type { XARFReport } from './types';
import { validator as schemaValidator } from './schema-validator';
import { schemaRegistry } from './schema-registry';
import { loadSchemaFile } from './schema-utils';

/**
 * Validation result with detailed error information
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  info?: ValidationInfo[];
}

/**
 * Validation error details
 */
export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

/**
 * Validation warning details
 */
export interface ValidationWarning {
  field: string;
  message: string;
  value?: unknown;
}

/**
 * Validation info details (for missing optional fields)
 */
export interface ValidationInfo {
  field: string;
  message: string;
}

/**
 * Schema property definition
 */
interface SchemaPropertyDef {
  type?: string;
  description?: string;
  'x-recommended'?: boolean;
  [key: string]: unknown;
}

/**
 * Schema definition structure
 */
interface SchemaDefinition {
  required?: string[];
  properties?: Record<string, SchemaPropertyDef>;
  allOf?: SchemaDefinition[];
  [key: string]: unknown;
}

/**
 * Optional field info extracted from schema
 */
interface OptionalFieldInfo {
  description: string;
  recommended: boolean;
}

/**
 * XARF Report Validator
 *
 * Provides comprehensive validation for XARF v4.2.0 reports
 */
export class XARFValidator {
  private errors: ValidationError[] = [];
  private warnings: ValidationWarning[] = [];
  private info: ValidationInfo[] = [];
  private useSchemaValidation: boolean;
  private coreSchemaCache: SchemaDefinition | null = null;

  /**
   * Create a new XARF validator
   * @param useSchemaValidation - Enable JSON schema validation (default: true)
   */
  constructor(useSchemaValidation = true) {
    this.useSchemaValidation = useSchemaValidation;
  }

  /**
   * Get the core schema definition
   * @returns Core schema or null
   */
  private getCoreSchema(): SchemaDefinition | null {
    if (this.coreSchemaCache) {
      return this.coreSchemaCache;
    }
    this.coreSchemaCache = loadSchemaFile<SchemaDefinition>('xarf-core.json');
    return this.coreSchemaCache;
  }

  /**
   * Get a type-specific schema definition
   * @param category - Report category
   * @param type - Report type
   * @returns Type schema or null
   */
  private getTypeSchema(category: string, type: string): SchemaDefinition | null {
    return schemaRegistry.getTypeSchema(category, type);
  }

  /**
   * Extract optional fields from schema properties
   * @param properties - Schema properties object
   * @param required - Set of required field names
   * @param optionalFields - Map to add optional fields to
   */
  private extractFromProperties(
    properties: Record<string, SchemaPropertyDef>,
    required: Set<string>,
    optionalFields: Map<string, OptionalFieldInfo>
  ): void {
    for (const [fieldName, fieldDef] of Object.entries(properties)) {
      if (!required.has(fieldName) && fieldName !== '_internal') {
        optionalFields.set(fieldName, {
          description: fieldDef.description || `Optional field: ${fieldName}`,
          recommended: fieldDef['x-recommended'] === true,
        });
      }
    }
  }

  /**
   * Resolve a $ref to a base schema file (e.g. "./content-base.json")
   * @param ref - Schema $ref string
   * @returns Resolved schema or null
   */
  private resolveBaseRef(ref: string): SchemaDefinition | null {
    if (!ref.includes('-base.json')) {
      return null;
    }
    const filename = ref.replace(/^\.\//, '').replace(/^\.\.\//, '');
    return loadSchemaFile<SchemaDefinition>(`types/${filename}`);
  }

  /**
   * Extract optional fields from a schema
   * @param schema - Schema definition
   * @returns Map of field name to description
   */
  private extractOptionalFields(schema: SchemaDefinition): Map<string, OptionalFieldInfo> {
    const optionalFields = new Map<string, OptionalFieldInfo>();
    const required = new Set(schema.required || []);

    if (schema.properties) {
      this.extractFromProperties(schema.properties, required, optionalFields);
    }

    // Handle allOf for type schemas
    if (schema.allOf) {
      for (const subSchema of schema.allOf) {
        // Follow $ref to base schemas (e.g. content-base.json)
        const resolved = subSchema.$ref ? this.resolveBaseRef(subSchema.$ref as string) : subSchema;
        if (resolved) {
          const subOptional = this.extractOptionalFields(resolved);
          for (const [field, info] of subOptional) {
            optionalFields.set(field, info);
          }
        }
      }
    }

    return optionalFields;
  }

  /**
   * Collect missing optional fields from the report
   * @param report - XARF report to check
   */
  private collectMissingOptionalFields(report: XARFReport): void {
    const coreSchema = this.getCoreSchema();
    if (!coreSchema) {
      return;
    }

    // Get optional fields from core schema
    const optionalFields = this.extractOptionalFields(coreSchema);

    // Get type-specific optional fields
    const typeSchema = this.getTypeSchema(report.category, report.type);
    if (typeSchema) {
      const typeOptionalFields = this.extractOptionalFields(typeSchema);
      for (const [field, info] of typeOptionalFields) {
        optionalFields.set(field, info);
      }
    }

    // Check which optional fields are missing
    for (const [fieldName, fieldInfo] of optionalFields) {
      if (!(fieldName in report) || report[fieldName as keyof XARFReport] === undefined) {
        const prefix = fieldInfo.recommended ? 'RECOMMENDED' : 'OPTIONAL';
        this.info.push({
          field: fieldName,
          message: `${prefix}: ${fieldInfo.description}`,
        });
      }
    }
  }

  /**
   * Collect unknown fields from the report that are not defined in the schema
   * @param report - XARF report to check
   */
  private collectUnknownFields(report: XARFReport): void {
    // Get all known fields from core schema
    const knownFields = new Set(schemaRegistry.getCorePropertyNames());

    // Add category-specific fields if category and type are present
    if (report.category && report.type) {
      const categoryFields = schemaRegistry.getCategoryFields(report.category, report.type);
      for (const field of categoryFields) {
        knownFields.add(field);
      }
    }

    // Check all fields in the report
    for (const fieldName of Object.keys(report)) {
      if (!knownFields.has(fieldName)) {
        this.warnings.push({
          field: fieldName,
          message: `Unknown field '${fieldName}' is not defined in the XARF schema`,
          value: report[fieldName as keyof XARFReport],
        });
      }
    }
  }

  /**
   * Validate a XARF report comprehensively
   * @param report - The XARF report to validate
   * @param strict - If true, warnings are treated as errors
   * @param showMissingOptional - If true, includes info about missing optional fields
   * @returns Validation result with errors, warnings, and optionally info
   * @throws {XARFValidationError} If strict mode and validation fails
   */
  validate(report: XARFReport, strict = false, showMissingOptional = false): ValidationResult {
    this.errors = [];
    this.warnings = [];
    this.info = [];

    // 1. Run schema validation first (if enabled)
    if (this.useSchemaValidation) {
      const schemaResult = this.validateWithSchema(report, strict);
      if (!schemaResult.valid) {
        // Schema validation errors are primary - add them first
        this.errors.push(...schemaResult.errors);
      }
    }

    // 2. Check for unknown fields (schemas use additionalProperties: true)
    this.collectUnknownFields(report);

    // 3. In strict mode, convert warnings to errors
    if (strict && this.warnings.length > 0) {
      this.warnings.forEach((warning) => {
        this.errors.push({
          field: warning.field,
          message: warning.message,
          value: warning.value,
        });
      });
      this.warnings = [];
    }

    // 4. Collect missing optional fields if requested
    if (showMissingOptional) {
      this.collectMissingOptionalFields(report);
    }

    const result: ValidationResult = {
      valid: this.errors.length === 0,
      errors: [...this.errors],
      warnings: [...this.warnings],
    };

    // Only include info array if showMissingOptional is enabled
    if (showMissingOptional) {
      result.info = [...this.info];
    }

    return result;
  }

  /**
   * Validate report using JSON schema
   * @param report - The XARF report to validate
   * @param strict
   * @returns Validation result from schema validation
   */
  validateWithSchema(report: XARFReport, strict = false): ValidationResult {
    try {
      const schemaResult = schemaValidator.validate(report, strict);

      // Convert schema validation errors to our format
      const errors: ValidationError[] = schemaResult.errors.map((err) => ({
        field: (err.split(':')[0] || '').replace(/^\//, '').replace(/\//g, '.') || 'root',
        message: err.includes(':') ? err.split(':').slice(1).join(':').trim() : err,
        value: undefined,
      }));

      return {
        valid: schemaResult.valid,
        errors,
        warnings: [],
      };
    } catch (error) {
      // If schema validation fails completely, add a general error
      return {
        valid: false,
        errors: [
          {
            field: 'schema',
            message: `Schema validation error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        warnings: [],
      };
    }
  }
}
