/**
 * Schema Registry - Centralized schema-driven validation rules
 *
 * Extracts validation rules dynamically from XARF JSON schemas,
 * eliminating hardcoded validation lists throughout the codebase.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { XARFCategory, SeverityLevel } from './types';

/**
 * Schema property definition
 */
interface SchemaPropertyDef {
  type?: string;
  enum?: string[];
  examples?: unknown[];
  description?: string;
  'x-recommended'?: boolean;
  minimum?: number;
  maximum?: number;
  format?: string;
  $ref?: string;
  [key: string]: unknown;
}

/**
 * Schema definition structure
 */
interface SchemaDefinition {
  required?: string[];
  properties?: Record<string, SchemaPropertyDef>;
  allOf?: SchemaDefinition[];
  $defs?: Record<string, SchemaDefinition>;
  $ref?: string;
  [key: string]: unknown;
}

/**
 * Field metadata extracted from schema
 */
export interface FieldMetadata {
  description: string;
  required: boolean;
  recommended: boolean;
  type?: string;
  enum?: string[];
  format?: string;
  minimum?: number;
  maximum?: number;
}

/**
 * SchemaRegistry - Singleton for accessing schema-derived validation rules
 *
 * Provides centralized access to:
 * - Valid categories (from xarf-core.json enum)
 * - Valid types per category (from types/*.json filenames)
 * - Valid evidence sources (from schema)
 * - Required and optional fields
 * - Field metadata including descriptions
 */
export class SchemaRegistry {
  private static instance: SchemaRegistry | null = null;
  private schemasDir: string;
  private coreSchema: SchemaDefinition | null = null;
  private typeSchemas: Map<string, SchemaDefinition> = new Map();

  // Cached validation data
  private categoriesCache: Set<XARFCategory> | null = null;
  private typesPerCategoryCache: Map<string, Set<string>> | null = null;
  private evidenceSourcesCache: Set<string> | null = null;
  private severitiesCache: Set<SeverityLevel> | null = null;
  private requiredFieldsCache: Set<string> | null = null;
  private contactRequiredFieldsCache: Set<string> | null = null;

  /**
   * Private constructor - use getInstance() instead
   */
  private constructor() {
    this.schemasDir = this.findSchemasDir();
    this.loadCoreSchema();
    this.scanTypeSchemas();
  }

  /**
   * Get the singleton instance
   * @returns SchemaRegistry instance
   */
  static getInstance(): SchemaRegistry {
    if (!SchemaRegistry.instance) {
      SchemaRegistry.instance = new SchemaRegistry();
    }
    return SchemaRegistry.instance;
  }

  /**
   * Reset the singleton instance (useful for testing)
   */
  static resetInstance(): void {
    SchemaRegistry.instance = null;
  }

  /**
   * Find the schemas directory
   * @returns Path to schemas directory
   */
  private findSchemasDir(): string {
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
   * @returns Parsed schema or null if not found
   */
  private loadSchema(schemaPath: string): SchemaDefinition | null {
    try {
      if (!fs.existsSync(schemaPath)) {
        return null;
      }
      const content = fs.readFileSync(schemaPath, 'utf-8');
      return JSON.parse(content) as SchemaDefinition;
    } catch {
      return null;
    }
  }

  /**
   * Load the core schema
   */
  private loadCoreSchema(): void {
    this.coreSchema = this.loadSchema(path.join(this.schemasDir, 'xarf-core.json'));
  }

  /**
   * Scan type schemas directory and build category->types map
   */
  private scanTypeSchemas(): void {
    const typesDir = path.join(this.schemasDir, 'types');
    if (!fs.existsSync(typesDir)) {
      return;
    }

    try {
      const files = fs.readdirSync(typesDir);
      for (const file of files) {
        if (file.endsWith('.json') && file !== 'content-base.json') {
          // Parse filename: {category}-{type}.json
          const match = file.match(/^([^-]+)-(.+)\.json$/);
          if (match) {
            const schemaPath = path.join(typesDir, file);
            const schema = this.loadSchema(schemaPath);
            if (schema) {
              this.typeSchemas.set(`${match[1]}/${match[2]}`, schema);
            }
          }
        }
      }
    } catch {
      // Directory read failed, continue with empty type schemas
    }
  }

  /**
   * Get all valid categories from schema
   * @returns Set of valid category names
   */
  getCategories(): Set<XARFCategory> {
    if (this.categoriesCache) {
      return this.categoriesCache;
    }

    const categories = new Set<XARFCategory>();

    if (this.coreSchema?.properties?.category?.enum) {
      for (const cat of this.coreSchema.properties.category.enum) {
        categories.add(cat as XARFCategory);
      }
    }

    this.categoriesCache = categories;
    return categories;
  }

  /**
   * Get valid types for a specific category
   * @param category - The category to get types for
   * @returns Set of valid type names for the category
   */
  getTypesForCategory(category: string): Set<string> {
    if (!this.typesPerCategoryCache) {
      this.buildTypesCache();
    }
    return this.typesPerCategoryCache?.get(category) || new Set();
  }

  /**
   * Get all types organized by category
   * @returns Map of category to set of types
   */
  getAllTypes(): Map<string, Set<string>> {
    if (!this.typesPerCategoryCache) {
      this.buildTypesCache();
    }
    return this.typesPerCategoryCache || new Map();
  }

  /**
   * Build the types per category cache from scanned schemas
   */
  private buildTypesCache(): void {
    this.typesPerCategoryCache = new Map();

    for (const key of this.typeSchemas.keys()) {
      const [category, type] = key.split('/');
      if (!this.typesPerCategoryCache.has(category)) {
        this.typesPerCategoryCache.set(category, new Set());
      }
      // Convert filename format (e.g., "bulk-messaging") to schema format (e.g., "bulk_messaging")
      const normalizedType = type.replace(/-/g, '_');
      this.typesPerCategoryCache.get(category)!.add(normalizedType);
    }
  }

  /**
   * Check if a category is valid
   * @param category - Category to check
   * @returns true if valid
   */
  isValidCategory(category: string): boolean {
    return this.getCategories().has(category as XARFCategory);
  }

  /**
   * Check if a type is valid for a category
   * @param category - The category
   * @param type - The type to check
   * @returns true if valid
   */
  isValidType(category: string, type: string): boolean {
    return this.getTypesForCategory(category).has(type);
  }

  /**
   * Extract evidence sources from core schema examples
   * @param sources - Set to add sources to
   */
  private extractCoreEvidenceSources(sources: Set<string>): void {
    const examples = this.coreSchema?.properties?.evidence_source?.examples;
    if (!examples) {
      return;
    }
    for (const example of examples) {
      if (typeof example === 'string') {
        sources.add(example);
      }
    }
  }

  /**
   * Extract evidence sources from type schemas
   * @param sources - Set to add sources to
   */
  private extractTypeEvidenceSources(sources: Set<string>): void {
    for (const schema of this.typeSchemas.values()) {
      this.extractEvidenceSourcesFromSchema(schema, sources);
    }
  }

  /**
   * Extract evidence sources from a single schema
   * @param schema - Schema to extract from
   * @param sources - Set to add sources to
   */
  private extractEvidenceSourcesFromSchema(schema: SchemaDefinition, sources: Set<string>): void {
    if (!schema.allOf) {
      return;
    }
    for (const subSchema of schema.allOf) {
      const enumValues = subSchema.properties?.evidence_source?.enum;
      if (enumValues) {
        enumValues.forEach((source: string) => sources.add(source));
      }
    }
  }

  /**
   * Get valid evidence sources from schema
   * @returns Set of valid evidence source values
   */
  getEvidenceSources(): Set<string> {
    if (this.evidenceSourcesCache) {
      return this.evidenceSourcesCache;
    }

    const sources = new Set<string>();
    this.extractCoreEvidenceSources(sources);
    this.extractTypeEvidenceSources(sources);

    this.evidenceSourcesCache = sources;
    return sources;
  }

  /**
   * Check if an evidence source is valid
   * @param source - Evidence source to check
   * @returns true if valid
   */
  isValidEvidenceSource(source: string): boolean {
    return this.getEvidenceSources().has(source);
  }

  /**
   * Get valid severity levels
   * @returns Set of valid severity values
   */
  getSeverities(): Set<SeverityLevel> {
    if (this.severitiesCache) {
      return this.severitiesCache;
    }

    // Severity is typically defined with an enum in schemas
    // For now, use the standard XARF severities
    this.severitiesCache = new Set<SeverityLevel>(['low', 'medium', 'high', 'critical']);
    return this.severitiesCache;
  }

  /**
   * Check if a severity is valid
   * @param severity - Severity to check
   * @returns true if valid
   */
  isValidSeverity(severity: string): boolean {
    return this.getSeverities().has(severity as SeverityLevel);
  }

  /**
   * Get required fields from core schema
   * @returns Set of required field names
   */
  getRequiredFields(): Set<string> {
    if (this.requiredFieldsCache) {
      return this.requiredFieldsCache;
    }

    this.requiredFieldsCache = new Set(this.coreSchema?.required || []);
    return this.requiredFieldsCache;
  }

  /**
   * Get required contact info fields
   * @returns Set of required contact field names
   */
  getContactRequiredFields(): Set<string> {
    if (this.contactRequiredFieldsCache) {
      return this.contactRequiredFieldsCache;
    }

    const contactDef = this.coreSchema?.$defs?.contact_info;
    this.contactRequiredFieldsCache = new Set(contactDef?.required || ['org', 'contact', 'domain']);
    return this.contactRequiredFieldsCache;
  }

  /**
   * Get type-specific schema for a category/type combination
   * @param category - The category
   * @param type - The type
   * @returns Schema definition or null
   */
  getTypeSchema(category: string, type: string): SchemaDefinition | null {
    // Try exact match first
    const exactKey = `${category}/${type}`;
    if (this.typeSchemas.has(exactKey)) {
      return this.typeSchemas.get(exactKey) || null;
    }

    // Try with underscores converted to hyphens (filename format)
    const hyphenatedType = type.replace(/_/g, '-');
    const hyphenKey = `${category}/${hyphenatedType}`;
    if (this.typeSchemas.has(hyphenKey)) {
      return this.typeSchemas.get(hyphenKey) || null;
    }

    return null;
  }

  /**
   * Get field metadata from schema
   * @param fieldName - Name of the field
   * @returns Field metadata or null
   */
  getFieldMetadata(fieldName: string): FieldMetadata | null {
    const prop = this.coreSchema?.properties?.[fieldName];
    if (!prop) {
      return null;
    }

    return {
      description: prop.description || '',
      required: this.getRequiredFields().has(fieldName),
      recommended: prop['x-recommended'] === true,
      type: prop.type,
      enum: prop.enum,
      format: prop.format,
      minimum: prop.minimum,
      maximum: prop.maximum,
    };
  }

  /**
   * Get all property names from core schema
   * @returns Set of all defined property names
   */
  getCorePropertyNames(): Set<string> {
    return new Set(Object.keys(this.coreSchema?.properties || {}));
  }

  /**
   * Check if schemas are loaded
   * @returns true if core schema is loaded
   */
  isLoaded(): boolean {
    return this.coreSchema !== null;
  }

  /**
   * Get category-specific field names for a given category/type combination.
   * These are fields defined in the type schema that are NOT part of core schema.
   * @param category - The category
   * @param type - The type
   * @returns Array of field names specific to this category/type
   */
  getCategoryFields(category: string, type: string): string[] {
    const schema = this.getTypeSchema(category, type);
    if (!schema) {
      return [];
    }

    const coreFields = this.getCorePropertyNames();
    const categoryFields: string[] = [];

    // Extract properties from allOf structure
    this.extractFieldsFromSchema(schema, coreFields, categoryFields);

    return categoryFields;
  }

  /**
   * Extract category-specific fields from a schema, excluding core fields
   * @param schema - Schema definition to extract from
   * @param coreFields - Set of core field names to exclude
   * @param result - Array to collect field names
   */
  private extractFieldsFromSchema(
    schema: SchemaDefinition,
    coreFields: Set<string>,
    result: string[]
  ): void {
    this.extractDirectProperties(schema, coreFields, result);
    this.extractFromAllOf(schema, coreFields, result);
  }

  /**
   * Extract fields from direct schema properties
   * @param schema - Schema definition to extract from
   * @param coreFields - Set of core field names to exclude
   * @param result - Array to collect field names
   */
  private extractDirectProperties(
    schema: SchemaDefinition,
    coreFields: Set<string>,
    result: string[]
  ): void {
    if (!schema.properties) {
      return;
    }
    for (const fieldName of Object.keys(schema.properties)) {
      const isExcluded =
        coreFields.has(fieldName) || fieldName === 'category' || fieldName === 'type';
      if (!isExcluded && !result.includes(fieldName)) {
        result.push(fieldName);
      }
    }
  }

  /**
   * Extract fields from allOf schema composition
   * @param schema - Schema definition to extract from
   * @param coreFields - Set of core field names to exclude
   * @param result - Array to collect field names
   */
  private extractFromAllOf(
    schema: SchemaDefinition,
    coreFields: Set<string>,
    result: string[]
  ): void {
    if (!schema.allOf) {
      return;
    }
    for (const subSchema of schema.allOf) {
      this.processSubSchema(subSchema, coreFields, result);
    }
  }

  /**
   * Process a sub-schema from allOf, handling $ref and inline schemas
   * @param subSchema - Sub-schema to process
   * @param coreFields - Set of core field names to exclude
   * @param result - Array to collect field names
   */
  private processSubSchema(
    subSchema: SchemaDefinition,
    coreFields: Set<string>,
    result: string[]
  ): void {
    if (subSchema.$ref) {
      this.processSchemaReference(subSchema.$ref, coreFields, result);
      return;
    }
    this.extractFieldsFromSchema(subSchema, coreFields, result);
  }

  /**
   * Process a schema $ref, loading base schemas if needed
   * @param ref - Schema reference string (e.g., "./content-base.json")
   * @param coreFields - Set of core field names to exclude
   * @param result - Array to collect field names
   */
  private processSchemaReference(ref: string, coreFields: Set<string>, result: string[]): void {
    if (!ref.includes('-base.json')) {
      return;
    }
    const baseSchema = this.loadBaseSchema(ref);
    if (baseSchema) {
      this.extractFieldsFromSchema(baseSchema, coreFields, result);
    }
  }

  /**
   * Load a base schema referenced by $ref
   * @param ref - Schema reference (e.g., "./content-base.json")
   * @returns Schema definition or null
   */
  private loadBaseSchema(ref: string): SchemaDefinition | null {
    // Extract filename from ref
    const filename = ref.replace(/^\.\//, '').replace(/^\.\.\//, '');
    const schemaPath = path.join(this.schemasDir, 'types', filename);
    return this.loadSchema(schemaPath);
  }

  /**
   * Get all category-specific fields across all types for a category.
   * Useful for building union type interfaces.
   * @param category - The category
   * @returns Set of all field names used by any type in this category
   */
  getAllFieldsForCategory(category: string): Set<string> {
    const allFields = new Set<string>();
    const types = this.getTypesForCategory(category);

    for (const type of types) {
      const fields = this.getCategoryFields(category, type);
      for (const field of fields) {
        allFields.add(field);
      }
    }

    return allFields;
  }
}

/**
 * Convenience singleton accessor
 */
export const schemaRegistry = SchemaRegistry.getInstance();
