/**
 * XARF v4 Parser Implementation
 */

import { XARFParseError, XARFValidationError } from './errors';
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
  private readonly supportedCategories = new Set(['messaging', 'connection', 'content']);

  /**
   * Initialize parser
   *
   * @param strict - If true, raise exceptions on validation errors.
   *                 If false, collect errors for later retrieval.
   */
  constructor(strict = false) {
    this.strict = strict;
  }

  /**
   * Parse XARF report from JSON
   *
   * Supports both XARF v4 and v3 (legacy) formats.
   * v3 reports are automatically converted to v4 with a deprecation warning.
   *
   * @param jsonData - JSON string or object containing XARF report
   * @returns Parsed report object
   * @throws {XARFParseError} If parsing fails
   * @throws {XARFValidationError} If validation fails (strict mode)
   */
  parse(jsonData: string | Record<string, unknown>): XARFReport {
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
      throw new XARFParseError(
        `Invalid JSON: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // Check if this is a v3 report and convert it
    if (isXARFv3(data)) {
      const conversionWarnings: string[] = [];
      const v4Report = convertV3toV4(data as XARFv3Report, conversionWarnings);

      // Add deprecation warning
      this.warnings.push(getV3DeprecationWarning());
      this.warnings.push(...conversionWarnings);

      // Log warnings if not in strict mode
      if (!this.strict && this.warnings.length > 0) {
        console.warn('XARF Parser Warnings:', this.warnings);
      }

      // Continue processing the converted v4 report
      data = v4Report as Record<string, unknown>;
    }

    // Validate basic structure
    if (!this.validateStructure(data)) {
      if (this.strict) {
        throw new XARFValidationError('Validation failed', this.errors);
      }
    }

    // Parse based on category
    const reportCategory = data.category as string;

    if (!this.supportedCategories.has(reportCategory)) {
      const errorMsg = `Unsupported category '${reportCategory}' in alpha version. Supported: ${Array.from(this.supportedCategories).join(', ')}`;
      if (this.strict) {
        throw new XARFValidationError(errorMsg);
      } else {
        this.errors.push(errorMsg);
        return data as XARFReport;
      }
    }

    try {
      if (reportCategory === 'messaging') {
        return data as MessagingReport;
      } else if (reportCategory === 'connection') {
        return data as ConnectionReport;
      } else if (reportCategory === 'content') {
        return data as ContentReport;
      } else {
        return data as XARFReport;
      }
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
   *
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
   *
   * @param data - Parsed JSON data
   * @returns True if structure is valid
   */
  private validateStructure(data: Record<string, unknown>): boolean {
    const requiredFields = new Set([
      'xarf_version',
      'report_id',
      'timestamp',
      'reporter',
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
    const reporter = data.reporter as Record<string, unknown>;
    if (typeof reporter !== 'object' || reporter === null) {
      this.errors.push('Reporter must be an object');
      return false;
    }

    const reporterRequired = new Set(['org', 'contact', 'type']);
    const reporterKeys = new Set(Object.keys(reporter));
    const missingReporter = Array.from(reporterRequired).filter(
      (field) => !reporterKeys.has(field)
    );
    if (missingReporter.length > 0) {
      this.errors.push(`Missing reporter fields: ${missingReporter.join(', ')}`);
      return false;
    }

    // Validate reporter type
    const validReporterTypes = new Set(['automated', 'manual', 'hybrid']);
    if (!validReporterTypes.has(reporter.type as string)) {
      this.errors.push(`Invalid reporter type: ${reporter.type}`);
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

    // Category-specific validation
    return this.validateCategorySpecific(data);
  }

  /**
   * Validate category-specific requirements
   *
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
   */
  private validateMessaging(data: Record<string, unknown>, reportType: string): boolean {
    const validTypes = new Set(['spam', 'phishing', 'social_engineering']);
    if (!validTypes.has(reportType)) {
      this.errors.push(`Invalid messaging type: ${reportType}`);
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
   */
  private validateConnection(data: Record<string, unknown>, reportType: string): boolean {
    const validTypes = new Set(['ddos', 'port_scan', 'login_attack', 'ip_spoofing']);
    if (!validTypes.has(reportType)) {
      this.errors.push(`Invalid connection type: ${reportType}`);
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
   */
  private validateContent(data: Record<string, unknown>, reportType: string): boolean {
    const validTypes = new Set([
      'phishing_site',
      'malware_distribution',
      'defacement',
      'spamvertised',
      'web_hack',
    ]);
    if (!validTypes.has(reportType)) {
      this.errors.push(`Invalid content type: ${reportType}`);
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
   *
   * @returns List of validation error messages
   */
  getErrors(): string[] {
    return [...this.errors];
  }

  /**
   * Get warnings from last parse/validate call
   *
   * Warnings include deprecation notices for v3 reports and conversion issues.
   *
   * @returns List of warning messages
   */
  getWarnings(): string[] {
    return [...this.warnings];
  }
}
