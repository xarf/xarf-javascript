/**
 * XARF v4 Parser Implementation
 */

import { XARFParseError, XARFValidationError } from './errors';
import { XARFValidator } from './validator';
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
  private validator: XARFValidator;

  /**
   * Initialize parser
   * @param strict - If true, raise exceptions on validation errors.
   *                 If false, collect errors for later retrieval.
   */
  constructor(strict = false) {
    this.strict = strict;
    this.validator = new XARFValidator();
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

    const result = this.validator.validate(data as XARFReport, false);
    this.errors.push(...result.errors.map((e) => `${e.field}: ${e.message}`));
    this.warnings.push(...result.warnings.map((w) => `${w.field}: ${w.message}`));

    if (!result.valid && this.strict) {
      throw new XARFValidationError('Validation failed', this.errors);
    }

    const reportCategory = data.category as string;

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
      data = this.parseJSON(jsonData);
    } catch (error) {
      this.errors.push(error instanceof XARFParseError ? error.message : String(error));
      return false;
    }

    data = this.handleV3Conversion(data);

    const result = this.validator.validate(data as XARFReport, false);
    this.errors.push(...result.errors.map((e) => `${e.field}: ${e.message}`));
    this.warnings.push(...result.warnings.map((w) => `${w.field}: ${w.message}`));

    return result.valid;
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
