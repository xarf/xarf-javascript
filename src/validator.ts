/**
 * XARF Report Validator
 *
 * Provides advanced validation capabilities for XARF reports
 */

import { XARFValidationError } from './errors';
import type { XARFReport } from './types';
import { SchemaValidator } from './schema-validator';
import { schemaRegistry } from './schema-registry';
import { validateEmail, validateDomain } from './validation-utils';
import { findSchemasDir, loadSchemaFile } from './schema-utils';
import * as path from 'path';

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
 * Provides comprehensive validation for XARF v4.0.0 reports
 */
export class XARFValidator {
  private errors: ValidationError[] = [];
  private warnings: ValidationWarning[] = [];
  private info: ValidationInfo[] = [];
  private schemaValidator: SchemaValidator;
  private useSchemaValidation: boolean;
  private schemasDir: string;
  private coreSchemaCache: SchemaDefinition | null = null;
  private typeSchemaCache: Map<string, SchemaDefinition> = new Map();

  /**
   * Create a new XARF validator
   * @param useSchemaValidation - Enable JSON schema validation (default: true)
   */
  constructor(useSchemaValidation = true) {
    this.useSchemaValidation = useSchemaValidation;
    this.schemaValidator = new SchemaValidator();
    this.schemasDir = findSchemasDir();
  }

  /**
   * Get the core schema definition
   * @returns Core schema or null
   */
  private getCoreSchema(): SchemaDefinition | null {
    if (this.coreSchemaCache) {
      return this.coreSchemaCache;
    }
    this.coreSchemaCache = loadSchemaFile<SchemaDefinition>(
      path.join(this.schemasDir, 'xarf-core.json')
    );
    return this.coreSchemaCache;
  }

  /**
   * Get a type-specific schema definition
   * @param category - Report category
   * @param type - Report type
   * @returns Type schema or null
   */
  private getTypeSchema(category: string, type: string): SchemaDefinition | null {
    const cacheKey = `${category}-${type}`;
    if (this.typeSchemaCache.has(cacheKey)) {
      return this.typeSchemaCache.get(cacheKey) || null;
    }

    const schemaPath = path.join(this.schemasDir, 'types', `${category}-${type}.json`);
    const schema = loadSchemaFile<SchemaDefinition>(schemaPath);
    if (schema) {
      this.typeSchemaCache.set(cacheKey, schema);
    }
    return schema;
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
        if (subSchema.properties) {
          const subRequired = new Set([...required, ...(subSchema.required || [])]);
          this.extractFromProperties(subSchema.properties, subRequired, optionalFields);
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
      const schemaResult = this.validateWithSchema(report);
      if (!schemaResult.valid) {
        // Schema validation errors are primary - add them first
        this.errors.push(...schemaResult.errors);
      }
    }

    // 2. Run hand-coded validation for better error messages and additional checks
    // Validate required fields
    this.validateRequiredFields(report);

    // Validate field formats
    this.validateFormats(report);

    // Validate field values
    this.validateValues(report);

    // Validate category-specific requirements
    this.validateCategorySpecific(report);

    // Check for unknown fields
    this.collectUnknownFields(report);

    // 3. Merge and deduplicate errors (schema errors take priority)
    this.deduplicateErrors();

    // 4. In strict mode, convert warnings to errors
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

    // 5. Collect missing optional fields if requested
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

    if (strict && !result.valid) {
      throw new XARFValidationError(
        'Validation failed',
        result.errors.map((e) => `${e.field}: ${e.message}`)
      );
    }

    return result;
  }

  /**
   * Validate report using JSON schema
   * @param report - The XARF report to validate
   * @returns Validation result from schema validation
   */
  validateWithSchema(report: XARFReport): ValidationResult {
    try {
      const schemaResult = this.schemaValidator.validate(report);

      // Convert schema validation errors to our format
      const errors: ValidationError[] = schemaResult.errors.map((err) => ({
        field: err.replace(/^\//, '').replace(/\//g, '.') || 'root',
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

  /**
   * Deduplicate errors - keep schema errors, remove duplicate hand-coded errors
   */
  private deduplicateErrors(): void {
    const seen = new Set<string>();
    const uniqueErrors: ValidationError[] = [];

    for (const error of this.errors) {
      const key = `${error.field}:${error.message}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueErrors.push(error);
      }
    }

    this.errors = uniqueErrors;
  }

  /**
   * Validate required fields are present
   * @param report - XARF report to validate for required fields
   */
  private validateRequiredFields(report: XARFReport): void {
    // Get required fields from schema registry (single source of truth)
    const required = schemaRegistry.getRequiredFields();

    required.forEach((field) => {
      if (!(field in report) || report[field as keyof XARFReport] === undefined) {
        this.errors.push({
          field,
          message: 'Required field is missing',
        });
      }
    });

    // Validate reporter ContactInfo subfields
    if (report.reporter) {
      this.validateContactInfoFields(report.reporter, 'reporter');
    }

    // Validate sender ContactInfo subfields
    if (report.sender) {
      this.validateContactInfoFields(report.sender, 'sender');
    }
  }

  /**
   * Validate ContactInfo fields
   * @param contactInfo - Contact information object to validate
   * @param contactInfo.org - Organization name
   * @param contactInfo.contact - Contact email address
   * @param contactInfo.domain - Domain name
   * @param fieldName - Name of the contact field being validated (reporter or sender)
   */
  private validateContactInfoFields(
    contactInfo: { org: string; contact: string; domain: string },
    fieldName: string
  ): void {
    if (!contactInfo.org) {
      this.errors.push({
        field: `${fieldName}.org`,
        message: `${fieldName} org is required`,
      });
    }
    if (!contactInfo.contact) {
      this.errors.push({
        field: `${fieldName}.contact`,
        message: `${fieldName} contact is required`,
      });
    }
    if (!contactInfo.domain) {
      this.errors.push({
        field: `${fieldName}.domain`,
        message: `${fieldName} domain is required`,
      });
    }
  }

  /**
   * Validate contact info formats (email and domain)
   * @param contactInfo - Contact info to validate
   * @param fieldPrefix - Field name prefix (reporter or sender)
   */
  private validateContactFormats(
    contactInfo: { contact: string; domain: string } | undefined,
    fieldPrefix: string
  ): void {
    if (!contactInfo) return;

    const capitalizedPrefix = fieldPrefix.charAt(0).toUpperCase() + fieldPrefix.slice(1);

    if (contactInfo.contact) {
      const emailResult = validateEmail(contactInfo.contact);
      if (!emailResult.valid) {
        this.errors.push({
          field: `${fieldPrefix}.contact`,
          message: `${capitalizedPrefix} contact must be a valid email address`,
          value: contactInfo.contact,
        });
      }
    }

    if (contactInfo.domain) {
      const domainResult = validateDomain(contactInfo.domain);
      if (!domainResult.valid) {
        this.errors.push({
          field: `${fieldPrefix}.domain`,
          message: `${capitalizedPrefix} domain must be a valid hostname`,
          value: contactInfo.domain,
        });
      }
    }
  }

  /**
   * Validate field formats
   * @param report - XARF report to validate for correct field formats
   */
  private validateFormats(report: XARFReport): void {
    this.validateXarfVersion(report.xarf_version);
    this.validateReportId(report.report_id);
    this.validateTimestamp(report.timestamp);
    this.validateContactFormats(report.reporter, 'reporter');
    this.validateContactFormats(report.sender, 'sender');
    this.validateConfidenceRange(report.confidence);
  }

  /**
   * Validate XARF version format
   * @param version - XARF version string
   */
  private validateXarfVersion(version: string | undefined): void {
    if (version && !/^\d+\.\d+\.\d+$/.test(version)) {
      this.errors.push({
        field: 'xarf_version',
        message: 'Invalid version format (expected X.Y.Z)',
        value: version,
      });
    }
  }

  /**
   * Validate report ID UUID format
   * @param reportId - Report ID string
   */
  private validateReportId(reportId: string | undefined): void {
    if (
      reportId &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reportId)
    ) {
      this.warnings.push({
        field: 'report_id',
        message: 'Report ID does not appear to be a valid UUID',
        value: reportId,
      });
    }
  }

  /**
   * Validate timestamp format
   * @param timestamp - Timestamp string
   */
  private validateTimestamp(timestamp: string | undefined): void {
    if (!timestamp) return;

    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        this.errors.push({
          field: 'timestamp',
          message: 'Invalid timestamp format',
          value: timestamp,
        });
      }
    } catch {
      this.errors.push({
        field: 'timestamp',
        message: 'Invalid timestamp format',
        value: timestamp,
      });
    }
  }

  /**
   * Validate confidence score range
   * @param confidence - Confidence score
   */
  private validateConfidenceRange(confidence: number | undefined): void {
    if (confidence !== undefined) {
      if (typeof confidence !== 'number' || confidence < 0 || confidence > 1) {
        this.errors.push({
          field: 'confidence',
          message: 'Confidence must be a number between 0.0 and 1.0',
          value: confidence,
        });
      }
    }
  }

  /**
   * Validate an enum value against schema-derived options
   * @param fieldName - Name of the field being validated
   * @param value - The value to validate
   * @param validOptions - Set of valid options from schema
   * @param fieldLabel - Human-readable label for error messages
   */
  private validateEnumValue(
    fieldName: string,
    value: string | undefined,
    validOptions: Set<string>,
    fieldLabel: string
  ): void {
    if (value && !validOptions.has(value)) {
      this.errors.push({
        field: fieldName,
        message: `Invalid ${fieldLabel} (must be one of: ${Array.from(validOptions).join(', ')})`,
        value,
      });
    }
  }

  /**
   * Validate type for category (dynamically from schema)
   * @param report - XARF report to validate
   */
  private validateTypeForCategory(report: XARFReport): void {
    if (!report.category || !report.type) {
      return;
    }
    const validTypes = schemaRegistry.getTypesForCategory(report.category);
    if (validTypes.size > 0 && !validTypes.has(report.type)) {
      this.errors.push({
        field: 'type',
        message: `Invalid type for category '${report.category}' (must be one of: ${Array.from(validTypes).join(', ')})`,
        value: report.type,
      });
    }
  }

  /**
   * Validate field values
   * @param report - XARF report to validate for correct field values
   */
  private validateValues(report: XARFReport): void {
    // Validate XARF version
    if (report.xarf_version !== '4.0.0') {
      this.errors.push({
        field: 'xarf_version',
        message: 'Unsupported XARF version (expected 4.0.0)',
        value: report.xarf_version,
      });
    }

    // Validate category (dynamically from schema)
    this.validateEnumValue('category', report.category, schemaRegistry.getCategories(), 'category');

    // Validate evidence source (dynamically from schema)
    this.validateEnumValue(
      'evidence_source',
      report.evidence_source,
      schemaRegistry.getEvidenceSources(),
      'evidence source'
    );

    // Validate type for category (dynamically from schema)
    this.validateTypeForCategory(report);
  }

  /**
   * Validate category-specific requirements
   * @param report - XARF report to validate for category-specific rules
   */
  private validateCategorySpecific(report: XARFReport): void {
    switch (report.category) {
      case 'messaging':
        this.validateMessagingReport(report);
        break;
      case 'connection':
        this.validateConnectionReport(report);
        break;
      case 'content':
        this.validateContentReport(report);
        break;
    }
  }

  /**
   * Validate messaging category reports
   * @param report - XARF report with messaging category to validate
   */
  private validateMessagingReport(report: XARFReport): void {
    // Check for email-specific fields
    if (report.protocol === 'smtp') {
      if (!report.smtp_from) {
        this.errors.push({
          field: 'smtp_from',
          message: 'smtp_from is required for SMTP messaging reports',
        });
      }
    }
  }

  /**
   * Validate connection category reports
   * @param report - XARF report with connection category to validate
   */
  private validateConnectionReport(report: XARFReport): void {
    // Check for required connection fields
    if (!report.destination_ip) {
      this.errors.push({
        field: 'destination_ip',
        message: 'destination_ip is required for connection reports',
      });
    }

    if (!report.protocol) {
      this.errors.push({
        field: 'protocol',
        message: 'protocol is required for connection reports',
      });
    }

    // Validate port numbers if present
    if (report.destination_port !== undefined) {
      const port = Number(report.destination_port);
      if (!Number.isInteger(port) || port < 0 || port > 65535) {
        this.errors.push({
          field: 'destination_port',
          message: 'Invalid port number (must be 0-65535)',
          value: report.destination_port,
        });
      }
    }
  }

  /**
   * Validate content category reports
   * @param report - XARF report with content category to validate
   */
  private validateContentReport(report: XARFReport): void {
    // URL is required for content reports
    if (!report.url) {
      this.errors.push({
        field: 'url',
        message: 'url is required for content reports',
      });
    } else {
      // Validate URL format
      try {
        new URL(report.url as string);
      } catch {
        this.errors.push({
          field: 'url',
          message: 'Invalid URL format',
          value: report.url,
        });
      }
    }
  }
}
