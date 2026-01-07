/**
 * XARF v4 Parser Implementation
 */

import { XARFParseError, XARFValidationError } from './errors';
import { schemaRegistry } from './schema-registry';
import type { XARFReport, MessagingReport, ConnectionReport, ContentReport } from './types';
import { isXARFv3, convertV3toV4, getV3DeprecationWarning, type XARFv3Report } from './v3-legacy';

/**
 * XARF v4 Report Parser
 *
 * Parses and validates XARF v4 abuse reports from JSON.
 */
export class XARFParser {
  private strict: boolean;
  private errors: string[] = [];
  private warnings: string[] = [];

  /**
   * Initialize parser
   * @param strict - If true, raise exceptions on validation errors.
   *                 If false, collect errors for later retrieval.
   */
  constructor(strict = false) {
    this.strict = strict;
  }

  /**
   * Parse JSON data into object
   * @param jsonData - JSON string or object
   * @returns Parsed object
   * @throws {XARFParseError} If JSON parsing fails
   */
  private parseJSON(jsonData: string | Record<string, unknown>): Record<string, unknown> {
    try {
      if (typeof jsonData === 'string') {
        return JSON.parse(jsonData) as Record<string, unknown>;
      }
      return jsonData;
    } catch (error) {
      throw new XARFParseError(
        `Invalid JSON: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Handle v3 to v4 conversion if needed
   * @param data - Report data to check and possibly convert
   * @returns Converted v4 data or original if already v4
   */
  private handleV3Conversion(data: Record<string, unknown>): Record<string, unknown> {
    if (!isXARFv3(data)) {
      return data;
    }

    const conversionWarnings: string[] = [];
    const v4Report = convertV3toV4(data as XARFv3Report, conversionWarnings);

    this.warnings.push(getV3DeprecationWarning());
    this.warnings.push(...conversionWarnings);

    return v4Report as Record<string, unknown>;
  }

  /**
   * Cast data to appropriate report type based on category
   * @param data - Validated report data
   * @param category - Report category
   * @returns Typed report object
   */
  private castToReportType(data: Record<string, unknown>, category: string): XARFReport {
    if (category === 'messaging') {
      return data as MessagingReport;
    } else if (category === 'connection') {
      return data as ConnectionReport;
    } else if (category === 'content') {
      return data as ContentReport;
    }
    return data as XARFReport;
  }

  /**
   * Parse XARF report from JSON
   *
   * Supports both XARF v4 and v3 (legacy) formats.
   * v3 reports are automatically converted to v4 with a deprecation warning.
   * @param jsonData - JSON string or object containing XARF report
   * @returns Parsed report object
   * @throws {XARFParseError} If parsing fails
   * @throws {XARFValidationError} If validation fails (strict mode)
   */
  parse(jsonData: string | Record<string, unknown>): XARFReport {
    this.errors = [];
    this.warnings = [];

    let data = this.parseJSON(jsonData);
    data = this.handleV3Conversion(data);

    if (!this.validateStructure(data)) {
      if (this.strict) {
        throw new XARFValidationError('Validation failed', this.errors);
      }
    }

    const reportCategory = data.category as string;

    if (!schemaRegistry.isValidCategory(reportCategory)) {
      const validCategories = Array.from(schemaRegistry.getCategories()).join(', ');
      const errorMsg = `Unsupported category '${reportCategory}'. Supported: ${validCategories}`;
      if (this.strict) {
        throw new XARFValidationError(errorMsg);
      }
      this.errors.push(errorMsg);
      return data as XARFReport;
    }

    try {
      return this.castToReportType(data, reportCategory);
    } catch (error) {
      throw new XARFParseError(
        `Failed to parse ${reportCategory} report: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Validate XARF report without parsing
   *
   * Supports both v4 and v3 formats. v3 reports are converted before validation.
   * @param jsonData - JSON string or object containing XARF report
   * @returns True if valid, false otherwise
   */
  validate(jsonData: string | Record<string, unknown>): boolean {
    this.errors = [];
    this.warnings = [];

    let data: Record<string, unknown>;
    try {
      if (typeof jsonData === 'string') {
        data = JSON.parse(jsonData) as Record<string, unknown>;
      } else {
        data = jsonData;
      }
    } catch (error) {
      this.errors.push(`Invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }

    // Check if this is a v3 report and convert it
    if (isXARFv3(data)) {
      const conversionWarnings: string[] = [];
      const v4Report = convertV3toV4(data as XARFv3Report, conversionWarnings);
      this.warnings.push(getV3DeprecationWarning());
      this.warnings.push(...conversionWarnings);
      data = v4Report as Record<string, unknown>;
    }

    return this.validateStructure(data);
  }

  /**
   * Validate basic XARF structure
   * @param data - Parsed JSON data
   * @returns True if structure is valid
   */
  private validateStructure(data: Record<string, unknown>): boolean {
    const requiredFields = new Set([
      'xarf_version',
      'report_id',
      'timestamp',
      'reporter',
      'sender',
      'source_identifier',
      'category',
      'type',
      'evidence_source',
    ]);

    // Check required fields
    const dataKeys = new Set(Object.keys(data));
    const missingFields = Array.from(requiredFields).filter((field) => !dataKeys.has(field));
    if (missingFields.length > 0) {
      this.errors.push(`Missing required fields: ${missingFields.join(', ')}`);
      return false;
    }

    // Check XARF version
    if (data.xarf_version !== '4.0.0') {
      this.errors.push(`Unsupported XARF version: ${data.xarf_version}`);
      return false;
    }

    // Validate reporter structure
    if (!this.validateContactInfo(data.reporter as Record<string, unknown>, 'reporter')) {
      return false;
    }

    // Validate sender structure
    if (!this.validateContactInfo(data.sender as Record<string, unknown>, 'sender')) {
      return false;
    }

    // Validate timestamp format
    try {
      const timestamp = data.timestamp as string;
      new Date(timestamp.replace('Z', '+00:00'));
    } catch {
      this.errors.push(`Invalid timestamp format: ${data.timestamp}`);
      return false;
    }

    // Check for unknown properties and emit warnings
    this.checkForUnknownProperties(data);

    // Category-specific validation
    return this.validateCategorySpecific(data);
  }

  /**
   * Check for unknown or potentially misspelled properties
   * @param data - Parsed XARF report data to check for unknown fields
   */
  private checkForUnknownProperties(data: Record<string, unknown>): void {
    // Known base fields
    const knownBaseFields = new Set([
      'xarf_version',
      'report_id',
      'timestamp',
      'reporter',
      'sender',
      'source_identifier',
      'category',
      'type',
      'evidence_source',
      'on_behalf_of',
      'description',
      'evidence',
      'tags',
      'severity',
      'confidence',
      'occurrence',
      'target',
      '_internal',
    ]);

    // Known category-specific fields
    const knownCategoryFields = new Set([
      // Messaging
      'protocol',
      'smtp_from',
      'smtp_to',
      'subject',
      'message_id',
      'sender_display_name',
      'target_victim',
      'message_content',
      // Connection
      'destination_ip',
      'destination_port',
      'source_port',
      'attack_type',
      'duration_minutes',
      'packet_count',
      'byte_count',
      'attempt_count',
      'successful_logins',
      'usernames_attempted',
      'attack_pattern',
      // Content
      'url',
      'content_type',
      'affected_pages',
      'cms_platform',
      'vulnerability_exploited',
      'affected_parameters',
      'payload_detected',
      'data_exposed',
      'database_type',
      'records_potentially_affected',
      // Infrastructure
      'infrastructure_type',
      'affected_services',
      // Copyright
      'copyright_holder',
      'infringing_content',
      'original_content',
      // Vulnerability
      'cve_id',
      'vulnerability_type',
      'affected_software',
      'affected_version',
      // Reputation
      'reputation_score',
      'blocklists',
    ]);

    const allKnownFields = new Set([...knownBaseFields, ...knownCategoryFields]);
    const dataKeys = Object.keys(data);

    for (const key of dataKeys) {
      if (!allKnownFields.has(key)) {
        this.warnings.push(`Unknown property '${key}' - may be ignored or misspelled`);
      }
    }
  }

  /**
   * Validate ContactInfo structure (reporter or sender)
   * @param contactInfo - Contact information object to validate
   * @param fieldName - Name of the field being validated (for error messages)
   * @returns True if contact info is valid, false otherwise
   */
  private validateContactInfo(contactInfo: Record<string, unknown>, fieldName: string): boolean {
    if (typeof contactInfo !== 'object' || contactInfo === null) {
      this.errors.push(`${fieldName} must be an object`);
      return false;
    }

    const contactRequired = new Set(['org', 'contact', 'domain']);
    const contactKeys = new Set(Object.keys(contactInfo));
    const missingContact = Array.from(contactRequired).filter((field) => !contactKeys.has(field));
    if (missingContact.length > 0) {
      this.errors.push(`Missing ${fieldName} fields: ${missingContact.join(', ')}`);
      return false;
    }

    // Validate email format for contact
    const contact = contactInfo.contact as string;
    if (
      typeof contact !== 'string' ||
      !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(contact)
    ) {
      this.errors.push(`${fieldName}.contact must be a valid email address`);
      return false;
    }

    // Validate domain format
    const domain = contactInfo.domain as string;
    if (
      typeof domain !== 'string' ||
      !/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(
        domain
      )
    ) {
      this.errors.push(`${fieldName}.domain must be a valid hostname`);
      return false;
    }

    // Validate org is non-empty string
    const org = contactInfo.org as string;
    if (typeof org !== 'string' || org.trim().length === 0) {
      this.errors.push(`${fieldName}.org must be a non-empty string`);
      return false;
    }

    return true;
  }

  /**
   * Validate category-specific requirements
   * @param data - Parsed JSON data
   * @returns True if category-specific validation passes
   */
  private validateCategorySpecific(data: Record<string, unknown>): boolean {
    const reportCategory = data.category as string;
    const reportType = data.type as string;

    if (reportCategory === 'messaging') {
      return this.validateMessaging(data, reportType);
    } else if (reportCategory === 'connection') {
      return this.validateConnection(data, reportType);
    } else if (reportCategory === 'content') {
      return this.validateContent(data, reportType);
    }

    return true;
  }

  /**
   * Validate messaging category reports
   * @param data - Parsed XARF report data
   * @param reportType - Type of messaging report (spam, phishing, etc.)
   * @returns True if validation passes, false otherwise
   */
  private validateMessaging(data: Record<string, unknown>, reportType: string): boolean {
    if (!schemaRegistry.isValidType('messaging', reportType)) {
      const validTypes = Array.from(schemaRegistry.getTypesForCategory('messaging')).join(', ');
      this.errors.push(`Invalid messaging type: ${reportType}. Valid types: ${validTypes}`);
      return false;
    }

    // Email-specific validation
    if (data.protocol === 'smtp') {
      if (!data.smtp_from) {
        this.errors.push('smtp_from required for email reports');
        return false;
      }
      if ((reportType === 'spam' || reportType === 'phishing') && !data.subject) {
        this.errors.push('subject required for spam/phishing reports');
        return false;
      }
    }

    return true;
  }

  /**
   * Validate connection category reports
   * @param data - Parsed XARF report data
   * @param reportType - Type of connection report (ddos, port_scan, etc.)
   * @returns True if validation passes, false otherwise
   */
  private validateConnection(data: Record<string, unknown>, reportType: string): boolean {
    if (!schemaRegistry.isValidType('connection', reportType)) {
      const validTypes = Array.from(schemaRegistry.getTypesForCategory('connection')).join(', ');
      this.errors.push(`Invalid connection type: ${reportType}. Valid types: ${validTypes}`);
      return false;
    }

    // Required fields for connection reports
    if (!data.destination_ip) {
      this.errors.push('destination_ip required for connection reports');
      return false;
    }

    if (!data.protocol) {
      this.errors.push('protocol required for connection reports');
      return false;
    }

    return true;
  }

  /**
   * Validate content category reports
   * @param data - Parsed XARF report data
   * @param reportType - Type of content report (phishing, malware, etc.)
   * @returns True if validation passes, false otherwise
   */
  private validateContent(data: Record<string, unknown>, reportType: string): boolean {
    if (!schemaRegistry.isValidType('content', reportType)) {
      const validTypes = Array.from(schemaRegistry.getTypesForCategory('content')).join(', ');
      this.errors.push(`Invalid content type: ${reportType}. Valid types: ${validTypes}`);
      return false;
    }

    // URL required for content reports
    if (!data.url) {
      this.errors.push('url required for content reports');
      return false;
    }

    return true;
  }

  /**
   * Get validation errors from last parse/validate call
   * @returns List of validation error messages
   */
  getErrors(): string[] {
    return [...this.errors];
  }

  /**
   * Get warnings from last parse/validate call
   *
   * Warnings include deprecation notices for v3 reports and conversion issues.
   * @returns List of warning messages
   */
  getWarnings(): string[] {
    return [...this.warnings];
  }
}
