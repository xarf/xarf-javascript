/**
 * XARF Report Validator
 *
 * Provides advanced validation capabilities for XARF reports
 */

import { XARFValidationError } from './errors';
import type { XARFReport, XARFCategory } from './types';

/**
 * Validation result with detailed error information
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
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
 * XARF Report Validator
 *
 * Provides comprehensive validation for XARF v4.0.0 reports
 */
export class XARFValidator {
  private errors: ValidationError[] = [];
  private warnings: ValidationWarning[] = [];

  /**
   * Validate a XARF report comprehensively
   *
   * @param report - The XARF report to validate
   * @param strict - If true, warnings are treated as errors
   * @returns Validation result with errors and warnings
   * @throws {XARFValidationError} If strict mode and validation fails
   */
  validate(report: XARFReport, strict = false): ValidationResult {
    this.errors = [];
    this.warnings = [];

    // Validate required fields
    this.validateRequiredFields(report);

    // Validate field formats
    this.validateFormats(report);

    // Validate field values
    this.validateValues(report);

    // Validate category-specific requirements
    this.validateCategorySpecific(report);

    // In strict mode, convert warnings to errors
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

    const result: ValidationResult = {
      valid: this.errors.length === 0,
      errors: [...this.errors],
      warnings: [...this.warnings],
    };

    if (strict && !result.valid) {
      throw new XARFValidationError(
        'Validation failed',
        result.errors.map((e) => `${e.field}: ${e.message}`)
      );
    }

    return result;
  }

  /**
   * Validate required fields are present
   */
  private validateRequiredFields(report: XARFReport): void {
    const required = [
      'xarf_version',
      'report_id',
      'timestamp',
      'reporter',
      'sender',
      'source_identifier',
      'category',
      'type',
      'evidence_source',
    ];

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
   * Validate field formats
   */
  private validateFormats(report: XARFReport): void {
    // Validate XARF version format
    if (report.xarf_version && !/^\d+\.\d+\.\d+$/.test(report.xarf_version)) {
      this.errors.push({
        field: 'xarf_version',
        message: 'Invalid version format (expected X.Y.Z)',
        value: report.xarf_version,
      });
    }

    // Validate UUID format for report_id
    if (
      report.report_id &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(report.report_id)
    ) {
      this.warnings.push({
        field: 'report_id',
        message: 'Report ID does not appear to be a valid UUID',
        value: report.report_id,
      });
    }

    // Validate timestamp format
    if (report.timestamp) {
      try {
        const date = new Date(report.timestamp);
        if (isNaN(date.getTime())) {
          this.errors.push({
            field: 'timestamp',
            message: 'Invalid timestamp format',
            value: report.timestamp,
          });
        }
      } catch {
        this.errors.push({
          field: 'timestamp',
          message: 'Invalid timestamp format',
          value: report.timestamp,
        });
      }
    }

    // Validate email format for reporter contact
    if (report.reporter?.contact && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(report.reporter.contact)) {
      this.errors.push({
        field: 'reporter.contact',
        message: 'Reporter contact must be a valid email address',
        value: report.reporter.contact,
      });
    }

    // Validate domain format for reporter
    if (
      report.reporter?.domain &&
      !/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(
        report.reporter.domain
      )
    ) {
      this.errors.push({
        field: 'reporter.domain',
        message: 'Reporter domain must be a valid hostname',
        value: report.reporter.domain,
      });
    }

    // Validate email format for sender contact
    if (report.sender?.contact && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(report.sender.contact)) {
      this.errors.push({
        field: 'sender.contact',
        message: 'Sender contact must be a valid email address',
        value: report.sender.contact,
      });
    }

    // Validate domain format for sender
    if (
      report.sender?.domain &&
      !/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(
        report.sender.domain
      )
    ) {
      this.errors.push({
        field: 'sender.domain',
        message: 'Sender domain must be a valid hostname',
        value: report.sender.domain,
      });
    }

    // Validate confidence is between 0 and 1
    if (report.confidence !== undefined) {
      if (typeof report.confidence !== 'number' || report.confidence < 0 || report.confidence > 1) {
        this.errors.push({
          field: 'confidence',
          message: 'Confidence must be a number between 0.0 and 1.0',
          value: report.confidence,
        });
      }
    }
  }

  /**
   * Validate field values
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

    // Validate category (7 total per XARF v4.0.0 spec)
    const validCategories = new Set<XARFCategory>([
      'messaging',
      'connection',
      'content',
      'infrastructure',
      'copyright',
      'vulnerability',
      'reputation',
    ]);
    if (report.category && !validCategories.has(report.category)) {
      this.errors.push({
        field: 'category',
        message: `Invalid category (must be one of: ${Array.from(validCategories).join(', ')})`,
        value: report.category,
      });
    }

    // Validate evidence source
    const validEvidenceSources = new Set([
      'spamtrap',
      'honeypot',
      'user_report',
      'automated_scan',
      'manual_analysis',
      'vulnerability_scan',
      'researcher_analysis',
      'threat_intelligence',
      'flow_analysis',
      'ids_ips',
      'siem',
    ]);
    if (report.evidence_source && !validEvidenceSources.has(report.evidence_source)) {
      this.errors.push({
        field: 'evidence_source',
        message: `Invalid evidence source (must be one of: ${Array.from(validEvidenceSources).join(', ')})`,
        value: report.evidence_source,
      });
    }

    // Validate severity if present
    const validSeverities = new Set(['low', 'medium', 'high', 'critical']);
    if (report.severity && !validSeverities.has(report.severity)) {
      this.errors.push({
        field: 'severity',
        message: `Invalid severity (must be one of: ${Array.from(validSeverities).join(', ')})`,
        value: report.severity,
      });
    }

    // Validate occurrence times if present
    if (report.occurrence) {
      if (!report.occurrence.start || !report.occurrence.end) {
        this.errors.push({
          field: 'occurrence',
          message: 'Occurrence must have both start and end times',
          value: report.occurrence,
        });
      } else {
        const start = new Date(report.occurrence.start);
        const end = new Date(report.occurrence.end);
        if (start > end) {
          this.errors.push({
            field: 'occurrence',
            message: 'Occurrence start time must be before end time',
            value: report.occurrence,
          });
        }
      }
    }
  }

  /**
   * Validate category-specific requirements
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
   */
  private validateMessagingReport(report: XARFReport): void {
    const validTypes = new Set(['spam', 'phishing', 'social_engineering', 'bulk_messaging']);
    if (!validTypes.has(report.type)) {
      this.errors.push({
        field: 'type',
        message: `Invalid messaging type (must be one of: ${Array.from(validTypes).join(', ')})`,
        value: report.type,
      });
    }

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
   */
  private validateConnectionReport(report: XARFReport): void {
    const validTypes = new Set([
      'ddos',
      'port_scan',
      'login_attack',
      'ip_spoofing',
      'compromised',
      'botnet',
      'malicious_traffic',
    ]);
    if (!validTypes.has(report.type)) {
      this.warnings.push({
        field: 'type',
        message: `Uncommon connection type: ${report.type}`,
        value: report.type,
      });
    }

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
   */
  private validateContentReport(report: XARFReport): void {
    const validTypes = new Set([
      'phishing_site',
      'malware_distribution',
      'defacement',
      'spamvertised',
      'web_hack',
    ]);
    if (!validTypes.has(report.type)) {
      this.warnings.push({
        field: 'type',
        message: `Uncommon content type: ${report.type}`,
        value: report.type,
      });
    }

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
