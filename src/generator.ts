/**
 * XARF Report Generator
 *
 * This module provides functionality for generating XARF v4.0.0 compliant reports
 * programmatically with proper validation and type safety.
 */

import { randomBytes, randomUUID, createHash } from 'crypto';
import { XARFError } from './errors';
import type {
  XARFReport,
  XARFCategory,
  ReporterType,
  EvidenceSource,
  SeverityLevel,
  XARFEvidence,
  ContactInfo,
  TimeOccurrence,
  Target,
} from './types';

/**
 * Generator options for creating XARF reports
 *
 * Supports both camelCase (backward compatibility) and snake_case (XARF spec) field names.
 * Snake_case is preferred and matches the XARF specification.
 */
export interface GeneratorOptions {
  category: XARFCategory;

  // Type field (XARF spec uses "type")
  type?: string; // XARF spec field name
  reportType?: string; // Backward compatibility (deprecated)

  // Source identifier
  source_identifier?: string; // XARF spec field name
  sourceIdentifier?: string; // Backward compatibility (deprecated)

  reporter: {
    org: string;
    contact: string;
    domain: string;
  };
  sender: {
    org: string;
    contact: string;
    domain: string;
  };

  // Evidence source
  evidence_source?: EvidenceSource; // XARF spec field name
  evidenceSource?: EvidenceSource; // Backward compatibility (deprecated)

  // On behalf of
  on_behalf_of?: ContactInfo; // XARF spec field name
  onBehalfOf?: ContactInfo; // Backward compatibility (deprecated)

  description?: string;
  evidence?: XARFEvidence[];
  severity?: SeverityLevel;
  confidence?: number;
  tags?: string[];
  occurrence?: TimeOccurrence;
  target?: Target;

  // Additional fields (use snake_case directly)
  additionalFields?: Record<string, unknown>;
}

/**
 * Generator for creating XARF v4.0.0 compliant reports
 *
 * This class provides methods to generate complete XARF reports with all
 * required fields, proper validation, and support for all 7 report categories.
 */
export class XARFGenerator {
  // XARF v4.0.0 specification constants
  static readonly XARF_VERSION = '4.0.0';

  // Valid categories as per XARF spec (7 total)
  static readonly VALID_CATEGORIES = new Set<XARFCategory>([
    'messaging',
    'connection',
    'content',
    'infrastructure',
    'copyright',
    'vulnerability',
    'reputation',
  ]);

  // Valid types per category
  static readonly EVENT_TYPES: Record<string, string[]> = {
    messaging: ['spam', 'phishing', 'social_engineering', 'bulk_messaging'],
    connection: [
      'ddos',
      'port_scan',
      'login_attack',
      'ip_spoofing',
      'compromised',
      'botnet',
      'malicious_traffic',
      'sql_injection',
      'reconnaissance',
      'scraping',
      'vuln_scanning',
      'bot',
      'infected_host',
    ],
    content: [
      'phishing_site',
      'malware_distribution',
      'defacement',
      'spamvertised',
      'web_hack',
      'illegal',
      'malicious',
      'policy_violation',
      'phishing',
      'malware',
      'fraud',
      'exposed_data',
      'csam',
      'csem',
      'brand_infringement',
      'suspicious_registration',
      'remote_compromise',
    ],
    infrastructure: ['botnet', 'compromised_server'],
    copyright: [
      'infringement',
      'dmca',
      'trademark',
      'p2p',
      'cyberlocker',
      'link_site',
      'ugc_platform',
      'usenet',
      'copyright',
    ],
    vulnerability: ['cve', 'misconfiguration', 'open_service'],
    reputation: ['blocklist', 'threat_intelligence'],
  };

  // Valid evidence sources
  static readonly VALID_EVIDENCE_SOURCES = new Set<EvidenceSource>([
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

  // Valid reporter types
  static readonly VALID_REPORTER_TYPES = new Set<ReporterType>(['automated', 'manual', 'hybrid']);

  // Valid severity levels
  static readonly VALID_SEVERITIES = new Set<SeverityLevel>(['low', 'medium', 'high', 'critical']);

  // Evidence content types by category
  static readonly EVIDENCE_CONTENT_TYPES: Record<string, string[]> = {
    messaging: ['message/rfc822', 'text/plain', 'text/html'],
    connection: ['application/pcap', 'text/plain', 'application/json'],
    content: ['image/png', 'text/html', 'application/pdf'],
    infrastructure: ['application/pcap', 'text/plain', 'application/json'],
    copyright: ['text/html', 'image/png', 'application/pdf'],
    vulnerability: ['text/plain', 'application/json', 'image/png'],
    reputation: ['application/json', 'text/plain', 'text/csv'],
    other: ['text/plain', 'application/json'],
  };

  /**
   * Generate a UUID v4 for report identification
   * @returns A string representation of a UUID v4
   */
  generateUUID(): string {
    return randomUUID();
  }

  /**
   * Generate an ISO 8601 formatted timestamp with UTC timezone
   * @returns ISO 8601 formatted timestamp string with UTC timezone
   */
  generateTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * Generate a cryptographic hash of the provided data
   * @param data - The data to hash (string or buffer)
   * @param algorithm - Hash algorithm to use (default: "sha256")
   * @returns Hexadecimal string representation of the hash
   * @throws {XARFError} If the algorithm is not supported
   */
  generateHash(
    data: string | Buffer,
    algorithm: 'sha256' | 'sha512' | 'sha1' | 'md5' = 'sha256'
  ): string {
    const validAlgorithms = new Set(['sha256', 'sha512', 'sha1', 'md5']);
    if (!validAlgorithms.has(algorithm)) {
      throw new XARFError(`Unsupported hash algorithm: ${algorithm}`);
    }

    const buffer = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
    return createHash(algorithm).update(buffer).digest('hex');
  }

  /**
   * Create an evidence item with automatic hashing
   * @param contentType - MIME type of the evidence
   * @param description - Human-readable description of the evidence
   * @param payload - The evidence data
   * @param hashAlgorithm - Algorithm to use for hashing (default: "sha256")
   * @returns Evidence object with computed hash
   */
  addEvidence(
    contentType: string,
    description: string,
    payload: string | Buffer,
    hashAlgorithm: 'sha256' | 'sha512' | 'sha1' | 'md5' = 'sha256'
  ): XARFEvidence {
    const payloadStr = typeof payload === 'string' ? payload : payload.toString('utf8');
    const payloadBuffer = typeof payload === 'string' ? Buffer.from(payload, 'utf8') : payload;

    const hashValue = this.generateHash(payloadBuffer, hashAlgorithm);
    const hash = `${hashAlgorithm}:${hashValue}`; // Format: algorithm:hexvalue

    return {
      content_type: contentType,
      description,
      payload: payloadStr,
      hash,
    };
  }

  /**
   * Generate a complete XARF v4.0.0 report
   * @param options - Report generation options
   * @returns Complete XARF report object
   * @throws {XARFError} If validation fails or required fields are missing
   */
  generateReport(options: GeneratorOptions): XARFReport {
    const {
      category,
      reporter,
      sender,
      description,
      evidence,
      severity,
      confidence,
      tags,
      occurrence,
      target,
      additionalFields,
    } = options;

    // Normalize field names: prefer snake_case (XARF spec), fall back to camelCase (backward compat)
    const reportType = options.type ?? options.reportType;
    const sourceIdentifier = options.source_identifier ?? options.sourceIdentifier;
    const evidenceSource = options.evidence_source ?? options.evidenceSource ?? 'automated_scan';
    const onBehalfOf = options.on_behalf_of ?? options.onBehalfOf;

    // Validate all required fields
    this.validateRequiredOptions(sourceIdentifier, reportType, reporter, sender);

    // After validation, these are guaranteed to be defined
    const validatedReportType = reportType!;
    const validatedSourceIdentifier = sourceIdentifier!;
    const validatedReporter = reporter!;
    const validatedSender = sender!;

    // Validate category and type
    this.validateCategoryAndType(category, validatedReportType, evidenceSource);

    // Validate optional fields
    this.validateOptionalFields(severity, confidence, occurrence, onBehalfOf);

    // Validate category-specific required fields
    this.validateCategoryRequirements(category, validatedReportType, additionalFields);

    // Build and return complete report
    return this.buildCompleteReport(
      {
        category,
        reportType: validatedReportType,
        sourceIdentifier: validatedSourceIdentifier,
        evidenceSource,
        reporter: validatedReporter,
        sender: validatedSender,
        onBehalfOf,
      },
      { description, evidence, severity, confidence, tags, occurrence, target, additionalFields }
    );
  }

  /**
   * Validate required options for report generation
   * @param sourceIdentifier - Source identifier value
   * @param reportType - Report type value
   * @param reporter - Reporter contact info
   * @param sender - Sender contact info
   * @throws {XARFError} If required fields are missing or invalid
   */
  private validateRequiredOptions(
    sourceIdentifier: string | undefined,
    reportType: string | undefined,
    reporter: { org: string; contact: string; domain: string } | undefined,
    sender: { org: string; contact: string; domain: string } | undefined
  ): void {
    if (!sourceIdentifier) {
      throw new XARFError('source_identifier (or sourceIdentifier) is required');
    }
    if (!reportType) {
      throw new XARFError('type (or reportType) is required');
    }
    if (!reporter) {
      throw new XARFError('reporter is required');
    }
    if (!sender) {
      throw new XARFError('sender is required');
    }

    this.validateContactInfo(reporter, 'reporter');
    this.validateContactInfo(sender, 'sender');
  }

  /**
   * Validate category, type, and evidence source
   * @param category - XARF category
   * @param reportType - Report type
   * @param evidenceSource - Evidence source
   * @throws {XARFError} If category, type, or evidence source is invalid
   */
  private validateCategoryAndType(
    category: XARFCategory,
    reportType: string,
    evidenceSource: EvidenceSource
  ): void {
    if (!XARFGenerator.VALID_CATEGORIES.has(category)) {
      throw new XARFError(
        `Invalid category '${category}'. Must be one of: ${Array.from(XARFGenerator.VALID_CATEGORIES).join(', ')}`
      );
    }

    const validTypes = XARFGenerator.EVENT_TYPES[category] || [];
    if (!validTypes.includes(reportType)) {
      throw new XARFError(
        `Invalid type '${reportType}' for category '${category}'. Must be one of: ${validTypes.join(', ')}`
      );
    }

    if (!XARFGenerator.VALID_EVIDENCE_SOURCES.has(evidenceSource)) {
      throw new XARFError(
        `Invalid evidence_source '${evidenceSource}'. Must be one of: ${Array.from(XARFGenerator.VALID_EVIDENCE_SOURCES).join(', ')}`
      );
    }
  }

  /**
   * Validate optional fields
   * @param severity - Optional severity level
   * @param confidence - Optional confidence score
   * @param occurrence - Optional occurrence time range
   * @param onBehalfOf - Optional on_behalf_of contact info
   * @throws {XARFError} If optional fields have invalid values
   */
  private validateOptionalFields(
    severity: 'low' | 'medium' | 'high' | 'critical' | undefined,
    confidence: number | undefined,
    occurrence: { start: string; end: string } | undefined,
    onBehalfOf: { org: string; contact: string; domain: string } | undefined
  ): void {
    this.validateSeverity(severity);
    this.validateConfidence(confidence);
    this.validateOccurrence(occurrence);
    this.validateOnBehalfOf(onBehalfOf);
  }

  /**
   * Validate severity level
   * @param severity - Optional severity level
   * @throws {XARFError} If severity is invalid
   */
  private validateSeverity(severity: 'low' | 'medium' | 'high' | 'critical' | undefined): void {
    if (severity && !XARFGenerator.VALID_SEVERITIES.has(severity)) {
      throw new XARFError(
        `Invalid severity '${severity}'. Must be one of: ${Array.from(XARFGenerator.VALID_SEVERITIES).join(', ')}`
      );
    }
  }

  /**
   * Validate confidence score
   * @param confidence - Optional confidence score
   * @throws {XARFError} If confidence is out of range
   */
  private validateConfidence(confidence: number | undefined): void {
    if (confidence !== undefined && (confidence < 0.0 || confidence > 1.0)) {
      throw new XARFError('confidence must be between 0.0 and 1.0');
    }
  }

  /**
   * Validate occurrence time range
   * @param occurrence - Optional occurrence time range
   * @throws {XARFError} If occurrence is missing required fields
   */
  private validateOccurrence(occurrence: { start: string; end: string } | undefined): void {
    if (occurrence && (!occurrence.start || !occurrence.end)) {
      throw new XARFError("occurrence must contain 'start' and 'end' keys");
    }
  }

  /**
   * Validate on_behalf_of contact info
   * @param onBehalfOf - Optional on_behalf_of contact info
   * @throws {XARFError} If on_behalf_of is missing required fields
   */
  private validateOnBehalfOf(
    onBehalfOf: { org: string; contact: string; domain: string } | undefined
  ): void {
    if (onBehalfOf && (!onBehalfOf.org || !onBehalfOf.contact || !onBehalfOf.domain)) {
      throw new XARFError("on_behalf_of must contain 'org', 'contact', and 'domain' fields");
    }
  }

  /**
   * Build complete XARF report with all fields
   * @param required - Required report fields (typed object with nested properties)
   * @param required.category
   * @param required.reportType
   * @param required.sourceIdentifier
   * @param required.evidenceSource
   * @param required.reporter
   * @param required.reporter.org
   * @param required.reporter.contact
   * @param required.reporter.domain
   * @param required.sender
   * @param required.sender.org
   * @param required.sender.contact
   * @param required.sender.domain
   * @param required.onBehalfOf
   * @param required.onBehalfOf.org
   * @param required.onBehalfOf.contact
   * @param required.onBehalfOf.domain
   * @param optional - Optional report fields (typed object with nested properties)
   * @param optional.description
   * @param optional.evidence
   * @param optional.severity
   * @param optional.confidence
   * @param optional.tags
   * @param optional.occurrence
   * @param optional.occurrence.start
   * @param optional.occurrence.end
   * @param optional.target
   * @param optional.target.ip
   * @param optional.target.domain
   * @param optional.target.url
   * @param optional.target.email
   * @param optional.additionalFields
   * @returns Complete XARF report
   *
   * eslint-disable jsdoc/require-param, jsdoc/check-param-names -- TypeScript types document the structure
   */
  private buildCompleteReport(
    required: {
      category: XARFCategory;
      reportType: string;
      sourceIdentifier: string;
      evidenceSource: EvidenceSource;
      reporter: { org: string; contact: string; domain: string };
      sender: { org: string; contact: string; domain: string };
      onBehalfOf?: { org: string; contact: string; domain: string };
    },
    optional: {
      description?: string;
      evidence?: XARFEvidence[];
      severity?: 'low' | 'medium' | 'high' | 'critical';
      confidence?: number;
      tags?: string[];
      occurrence?: { start: string; end: string };
      target?: { ip?: string; domain?: string; url?: string; email?: string };
      additionalFields?: Record<string, unknown>;
    }
  ): XARFReport {
    const report: XARFReport = {
      xarf_version: XARFGenerator.XARF_VERSION,
      report_id: this.generateUUID(),
      timestamp: this.generateTimestamp(),
      reporter: {
        org: required.reporter.org,
        contact: required.reporter.contact,
        domain: required.reporter.domain,
      },
      sender: {
        org: required.sender.org,
        contact: required.sender.contact,
        domain: required.sender.domain,
      },
      source_identifier: required.sourceIdentifier,
      category: required.category,
      type: required.reportType,
      evidence_source: required.evidenceSource,
    };

    if (required.onBehalfOf) {
      report.on_behalf_of = {
        org: required.onBehalfOf.org,
        contact: required.onBehalfOf.contact,
        domain: required.onBehalfOf.domain,
      };
    }

    if (optional.description) report.description = optional.description;
    if (optional.evidence) report.evidence = optional.evidence;
    if (optional.severity) report.severity = optional.severity;
    if (optional.confidence !== undefined) report.confidence = optional.confidence;
    if (optional.tags) report.tags = optional.tags;
    if (optional.occurrence) report.occurrence = optional.occurrence;
    if (optional.target) report.target = optional.target;
    if (optional.additionalFields) Object.assign(report, optional.additionalFields);

    return report;
  }

  /**
   * Validate ContactInfo structure
   * @param contactInfo - Contact information to validate
   * @param contactInfo.org - Organization name
   * @param contactInfo.contact - Contact email address
   * @param contactInfo.domain - Domain name
   * @param fieldName - Name of the field for error messages
   * @throws {XARFError} If validation fails
   */
  private validateContactInfo(
    contactInfo: { org: string; contact: string; domain: string },
    fieldName: string
  ): void {
    if (!contactInfo.org || contactInfo.org.trim().length === 0) {
      throw new XARFError(`${fieldName}.org is required and must be non-empty`);
    }
    if (
      !contactInfo.contact ||
      !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(contactInfo.contact)
    ) {
      throw new XARFError(`${fieldName}.contact must be a valid email address`);
    }
    if (
      !contactInfo.domain ||
      !/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(
        contactInfo.domain
      )
    ) {
      throw new XARFError(`${fieldName}.domain must be a valid hostname`);
    }
  }

  /**
   * Validate connection category required fields
   * @param fields - Additional fields to check
   * @throws {XARFError} If required fields are missing
   */
  private validateConnectionRequirements(fields: Record<string, unknown>): void {
    if (!fields.destination_ip) {
      throw new XARFError('destination_ip is required for connection reports');
    }
    if (!fields.protocol) {
      throw new XARFError('protocol is required for connection reports');
    }
  }

  /**
   * Validate messaging category required fields
   * @param fields - Additional fields to check
   * @param reportType - Report type
   * @throws {XARFError} If required fields are missing
   */
  private validateMessagingRequirements(fields: Record<string, unknown>, reportType: string): void {
    if (fields.protocol === 'smtp' && !fields.smtp_from) {
      throw new XARFError('smtp_from is required for SMTP messaging reports');
    }
    if (
      fields.protocol === 'smtp' &&
      (reportType === 'spam' || reportType === 'phishing') &&
      !fields.subject
    ) {
      throw new XARFError(`subject is required for ${reportType} reports with SMTP protocol`);
    }
  }

  /**
   * Validate category-specific required fields
   * @param category - Report category
   * @param reportType - Report type
   * @param additionalFields - Additional fields to check
   * @throws {XARFError} If required fields are missing
   */
  private validateCategoryRequirements(
    category: XARFCategory,
    reportType: string,
    additionalFields?: Record<string, unknown>
  ): void {
    const fields = additionalFields || {};

    switch (category) {
      case 'connection':
        this.validateConnectionRequirements(fields);
        break;
      case 'content':
        if (!fields.url) {
          throw new XARFError('url is required for content reports');
        }
        break;
      case 'messaging':
        this.validateMessagingRequirements(fields, reportType);
        break;
      // Other categories don't have strict required fields beyond base XARF fields
      case 'infrastructure':
      case 'copyright':
      case 'vulnerability':
      case 'reputation':
        // No additional required fields
        break;
    }
  }

  /**
   * Generate random sample evidence for testing purposes
   * @param category - Report category to determine appropriate content type
   * @param description - Custom description (auto-generated if not provided)
   * @returns Sample evidence item
   */
  generateRandomEvidence(category: XARFCategory, description?: string): XARFEvidence {
    // Select appropriate content type for category
    const contentTypes = XARFGenerator.EVIDENCE_CONTENT_TYPES[category] || ['text/plain'];
    const contentType = contentTypes[Math.floor(Math.random() * contentTypes.length)];

    // Generate random payload data
    const randomData = randomBytes(32);
    const payload = randomData.toString('hex');

    // Generate description if not provided
    const finalDescription = description || `Sample ${category} evidence data`;

    return this.addEvidence(contentType, finalDescription, payload);
  }

  /**
   * Generate random sample contact data
   * @returns Sample reporter and sender contact info
   */
  private generateSampleContacts(): {
    reporter: { org: string; contact: string; domain: string };
    sender: { org: string; contact: string; domain: string };
  } {
    const sampleOrgs = [
      'Security Operations Center',
      'Abuse Response Team',
      'Network Security Team',
      'Threat Intelligence Unit',
      'SOC Team',
    ];
    const sampleDomains = ['example.com', 'security.net', 'abuse.org', 'soc.io'];

    const reporterOrg = sampleOrgs[Math.floor(Math.random() * sampleOrgs.length)];
    const senderOrg = sampleOrgs[Math.floor(Math.random() * sampleOrgs.length)];
    const reporterDomain = sampleDomains[Math.floor(Math.random() * sampleDomains.length)];
    const senderDomain = sampleDomains[Math.floor(Math.random() * sampleDomains.length)];

    return {
      reporter: {
        org: reporterOrg,
        contact: `abuse@${reporterDomain}`,
        domain: reporterDomain,
      },
      sender: {
        org: senderOrg,
        contact: `report@${senderDomain}`,
        domain: senderDomain,
      },
    };
  }

  /**
   * Add optional fields to sample report
   * @param options - Generator options to modify
   * @param category - Report category
   * @param reportType - Report type
   */
  private addSampleOptionalFields(
    options: GeneratorOptions,
    category: XARFCategory,
    reportType: string
  ): void {
    const severities = Array.from(XARFGenerator.VALID_SEVERITIES);
    options.severity = severities[Math.floor(Math.random() * severities.length)];
    options.confidence = Math.round((0.7 + Math.random() * 0.3) * 100) / 100;
    options.tags = [`category:${category}`, `type:${reportType}`, 'source:sample'];

    const targetIp = `203.0.113.${Math.floor(Math.random() * 256)}`;
    const ports = [53, 80, 443, 8080, 22, 25];
    options.target = {
      ip: targetIp,
      port: ports[Math.floor(Math.random() * ports.length)],
    };

    const now = new Date();
    const startTime = new Date(now.getTime() - Math.floor(Math.random() * 7200000));
    options.occurrence = {
      start: startTime.toISOString(),
      end: now.toISOString(),
    };
  }

  /**
   * Generate category-specific fields for sample report
   * @param category - Report category
   * @param reportType - Report type
   * @param includeOptional - Whether to include optional fields
   * @returns Additional fields object
   */
  private generateCategorySpecificFields(
    category: XARFCategory,
    reportType: string,
    includeOptional: boolean
  ): Record<string, unknown> {
    const fields: Record<string, unknown> = {};

    switch (category) {
      case 'connection':
        fields.destination_ip = `203.0.113.${Math.floor(Math.random() * 256)}`;
        fields.protocol = ['tcp', 'udp', 'icmp'][Math.floor(Math.random() * 3)];
        if (includeOptional) {
          fields.destination_port = [80, 443, 22, 25, 53][Math.floor(Math.random() * 5)];
        }
        break;

      case 'content':
        fields.url = `http://malicious${Math.floor(Math.random() * 1000)}.example.com`;
        if (includeOptional) {
          fields.content_type = 'text/html';
        }
        break;

      case 'messaging':
        fields.protocol = ['smtp', 'http'][Math.floor(Math.random() * 2)];
        if (fields.protocol === 'smtp') {
          fields.smtp_from = `spammer${Math.floor(Math.random() * 100)}@evil.example.com`;
          if (reportType === 'spam' || reportType === 'phishing') {
            fields.subject = `Sample ${reportType} subject`;
          }
          if (includeOptional) {
            fields.smtp_to = `victim@example.com`;
          }
        }
        break;
    }

    return fields;
  }

  /**
   * Generate a sample XARF report with randomized data for testing
   * @param category - Report category
   * @param reportType - Specific type within category
   * @param includeEvidence - Whether to include sample evidence (default: true)
   * @param includeOptional - Whether to include optional fields (default: true)
   * @returns Complete sample XARF report
   * @throws {XARFError} If category or type is invalid
   */
  generateSampleReport(
    category: XARFCategory,
    reportType: string,
    includeEvidence = true,
    includeOptional = true
  ): XARFReport {
    if (!XARFGenerator.VALID_CATEGORIES.has(category)) {
      throw new XARFError(`Invalid category: ${category}`);
    }

    const validTypes = XARFGenerator.EVENT_TYPES[category] || [];
    if (!validTypes.includes(reportType)) {
      throw new XARFError(`Invalid type '${reportType}' for category '${category}'`);
    }

    const sourceIp = `192.0.2.${Math.floor(Math.random() * 256)}`;
    const contacts = this.generateSampleContacts();

    const options: GeneratorOptions = {
      category,
      type: reportType,
      source_identifier: sourceIp,
      reporter: contacts.reporter,
      sender: contacts.sender,
      description: `Sample ${reportType} report for testing`,
    };

    if (includeEvidence) {
      options.evidence = [this.generateRandomEvidence(category)];
    }

    if (includeOptional) {
      this.addSampleOptionalFields(options, category, reportType);
    }

    options.additionalFields = this.generateCategorySpecificFields(
      category,
      reportType,
      includeOptional
    );

    return this.generateReport(options);
  }
}
