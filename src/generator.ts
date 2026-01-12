/**
 * XARF Report Generator
 *
 * This module provides functionality for generating XARF v4.0.0 compliant reports
 * programmatically with proper validation and type safety.
 */

import { randomBytes, randomUUID, createHash } from 'crypto';
import { XARFError } from './errors';
import { schemaRegistry } from './schema-registry';
import { XARFValidator } from './validator';
import { validateContactInfo as validateContactInfoUtil } from './validation-utils';
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
 * Base generator options shared by all categories
 *
 * Supports both camelCase (backward compatibility) and snake_case (XARF spec) field names.
 * Snake_case is preferred and matches the XARF specification.
 */
export interface BaseGeneratorOptions {
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

  // Additional fields for backward compatibility and extra fields
  additionalFields?: Record<string, unknown>;
}

/**
 * Content category options with required url field
 */
export interface ContentGeneratorOptions extends BaseGeneratorOptions {
  category: 'content';
  /** URL of the malicious content (required for content reports) */
  url?: string;
  /** Fully qualified domain name */
  domain?: string;
  /** Domain registrar */
  registrar?: string;
  /** DNS nameservers */
  nameservers?: string[];
  /** Screenshot URL */
  screenshot_url?: string;
  /** When content was verified */
  verified_at?: string;
  /** How content was verified */
  verification_method?: string;
  /** Primary attack vector */
  attack_vector?: string;
  /** Impersonated brand */
  target_brand?: string;
  /** Hosting provider */
  hosting_provider?: string;
  /** Autonomous System Number */
  asn?: number;
  /** ISO country code */
  country_code?: string;
  /** Allow any additional content fields from schema */
  [key: string]: unknown;
}

/**
 * Connection category options with required destination_ip and protocol fields
 */
export interface ConnectionGeneratorOptions extends BaseGeneratorOptions {
  category: 'connection';
  /** Destination IP address (required for connection reports) */
  destination_ip?: string;
  /** Network protocol (required for connection reports) */
  protocol?: string;
  /** Source port number (required when source_identifier is an IP) */
  source_port?: number;
  /** First seen timestamp (required for connection types) */
  first_seen?: string;
  /** Destination port number */
  destination_port?: number;
  /** Attack vector type */
  attack_vector?: string;
  /** Peak packets per second */
  peak_pps?: number;
  /** Peak bits per second */
  peak_bps?: number;
  /** Duration in seconds */
  duration_seconds?: number;
  /** Allow any additional connection fields from schema */
  [key: string]: unknown;
}

/**
 * Messaging category options with protocol-specific fields
 */
export interface MessagingGeneratorOptions extends BaseGeneratorOptions {
  category: 'messaging';
  /** Messaging protocol (smtp, sms, etc.) */
  protocol?: string;
  /** Source port number (required when protocol is smtp) */
  source_port?: number;
  /** SMTP envelope from address */
  smtp_from?: string;
  /** SMTP envelope to address */
  smtp_to?: string;
  /** Email subject line */
  subject?: string;
  /** Message-ID header */
  message_id?: string;
  /** Sender display name */
  sender_name?: string;
  /** Allow any additional messaging fields from schema */
  [key: string]: unknown;
}

/**
 * Infrastructure category options
 */
export interface InfrastructureGeneratorOptions extends BaseGeneratorOptions {
  category: 'infrastructure';
  /** Command and control server details */
  c2_server?: string;
  /** Malware family name */
  malware_family?: string;
  /** Botnet name */
  botnet_name?: string;
  /** Allow any additional infrastructure fields from schema */
  [key: string]: unknown;
}

/**
 * Copyright category options
 */
export interface CopyrightGeneratorOptions extends BaseGeneratorOptions {
  category: 'copyright';
  /** URL of infringing content */
  url?: string;
  /** Title of copyrighted work */
  title?: string;
  /** Copyright holder information */
  copyright_holder?: string;
  /** Allow any additional copyright fields from schema */
  [key: string]: unknown;
}

/**
 * Vulnerability category options
 */
export interface VulnerabilityGeneratorOptions extends BaseGeneratorOptions {
  category: 'vulnerability';
  /** CVE identifier */
  cve_id?: string;
  /** Affected service or software */
  service?: string;
  /** Port number of vulnerable service */
  port?: number;
  /** Allow any additional vulnerability fields from schema */
  [key: string]: unknown;
}

/**
 * Reputation category options
 */
export interface ReputationGeneratorOptions extends BaseGeneratorOptions {
  category: 'reputation';
  /** Name of blocklist */
  blocklist_name?: string;
  /** Threat type classification */
  threat_type?: string;
  /** Allow any additional reputation fields from schema */
  [key: string]: unknown;
}

/**
 * Discriminated union type for all generator options
 *
 * Provides type-safe, category-specific fields while maintaining
 * backward compatibility through additionalFields.
 */
export type GeneratorOptions =
  | ContentGeneratorOptions
  | ConnectionGeneratorOptions
  | MessagingGeneratorOptions
  | InfrastructureGeneratorOptions
  | CopyrightGeneratorOptions
  | VulnerabilityGeneratorOptions
  | ReputationGeneratorOptions;

/**
 * Generator for creating XARF v4.0.0 compliant reports
 *
 * This class provides methods to generate complete XARF reports with all
 * required fields, proper validation, and support for all 7 report categories.
 */
export class XARFGenerator {
  // XARF v4.0.0 specification constants
  static readonly XARF_VERSION = '4.0.0';

  /**
   * Valid categories as per XARF spec (from schema registry)
   * @returns Set of valid XARF categories
   */
  static get VALID_CATEGORIES(): Set<XARFCategory> {
    return schemaRegistry.getCategories();
  }

  /**
   * Valid types per category (from schema registry)
   * @returns Record mapping categories to their valid types
   */
  static get EVENT_TYPES(): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    const allTypes = schemaRegistry.getAllTypes();
    for (const [category, types] of allTypes) {
      result[category] = Array.from(types);
    }
    return result;
  }

  /**
   * Valid evidence sources (from schema registry)
   * @returns Set of valid evidence sources
   */
  static get VALID_EVIDENCE_SOURCES(): Set<string> {
    return schemaRegistry.getEvidenceSources();
  }

  // Valid reporter types
  static readonly VALID_REPORTER_TYPES = new Set<ReporterType>(['automated', 'manual', 'hybrid']);

  /**
   * Valid severity levels (from schema registry)
   * @returns Set of valid severity levels
   */
  static get VALID_SEVERITIES(): Set<SeverityLevel> {
    return schemaRegistry.getSeverities();
  }

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
    const evidenceSource = options.evidence_source ?? options.evidenceSource;
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

    // Extract category-specific fields from options using schema registry
    const categoryFields = this.extractCategoryFields(options, validatedReportType);

    // Merge category fields with additionalFields (additionalFields takes precedence for overrides)
    const mergedFields = { ...categoryFields, ...additionalFields };

    // Build the report
    const report = this.buildCompleteReport(
      {
        category,
        reportType: validatedReportType,
        sourceIdentifier: validatedSourceIdentifier,
        evidenceSource,
        reporter: validatedReporter,
        sender: validatedSender,
        onBehalfOf,
      },
      {
        description,
        evidence,
        severity,
        confidence,
        tags,
        occurrence,
        target,
        additionalFields: mergedFields,
      }
    );

    // Validate against schema to ensure the report is valid
    // This catches any missing required fields defined in type-specific schemas
    // and warns about unknown fields that were passed in
    const xarfValidator = new XARFValidator();
    const validationResult = xarfValidator.validate(report, false);
    if (!validationResult.valid || validationResult.warnings.length > 0) {
      const allIssues = [...validationResult.errors, ...validationResult.warnings];
      const messages = allIssues.map((e) => `${e.field}: ${e.message}`);
      throw new XARFError(`Generated report is invalid: ${messages.join('; ')}`);
    }

    return report;
  }

  /**
   * Base fields that are handled explicitly by the generator.
   * Any fields not in this set will be passed through to the report,
   * where XARFValidator will catch unknown fields.
   */
  private static readonly BASE_FIELDS = new Set([
    'category',
    'reporter',
    'sender',
    'description',
    'evidence',
    'severity',
    'confidence',
    'tags',
    'occurrence',
    'target',
    'additionalFields',
    'type',
    'reportType',
    'source_identifier',
    'sourceIdentifier',
    'evidence_source',
    'evidenceSource',
    'on_behalf_of',
    'onBehalfOf',
  ]);

  /**
   * Extract category-specific fields from generator options.
   * Passes through all fields that aren't base generator options,
   * allowing XARFValidator to detect unknown fields.
   * @param options - Generator options containing category-specific fields
   * @param _reportType - The validated report type (unused, kept for API compatibility)
   * @returns Object containing category-specific and any unknown fields
   */
  private extractCategoryFields(
    options: GeneratorOptions,
    _reportType: string
  ): Record<string, unknown> {
    const fields: Record<string, unknown> = {};

    // Extract all fields that aren't base fields
    // This allows unknown fields to pass through to the report
    // where XARFValidator will catch them
    const optionsRecord = options as unknown as Record<string, unknown>;
    for (const fieldName of Object.keys(optionsRecord)) {
      if (!XARFGenerator.BASE_FIELDS.has(fieldName) && optionsRecord[fieldName] !== undefined) {
        fields[fieldName] = optionsRecord[fieldName];
      }
    }

    // Also extract source_port if provided (it's in core schema but commonly needed)
    if (optionsRecord['source_port'] !== undefined) {
      fields['source_port'] = optionsRecord['source_port'];
    }

    return fields;
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
    evidenceSource?: EvidenceSource
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

    if (evidenceSource !== undefined && !XARFGenerator.VALID_EVIDENCE_SOURCES.has(evidenceSource)) {
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
   * @param required.category - Report category (messaging, connection, content, etc.)
   * @param required.reportType - Specific report type within the category
   * @param required.sourceIdentifier - Source IP address or identifier
   * @param required.evidenceSource - How the abuse was detected
   * @param required.reporter - Reporter contact information
   * @param required.reporter.org - Reporter organization name
   * @param required.reporter.contact - Reporter contact email address
   * @param required.reporter.domain - Reporter organization domain
   * @param required.sender - Sender/ISP contact information
   * @param required.sender.org - Sender organization name
   * @param required.sender.contact - Sender contact email address
   * @param required.sender.domain - Sender organization domain
   * @param required.onBehalfOf - Optional on-behalf-of contact information
   * @param required.onBehalfOf.org - On-behalf-of organization name
   * @param required.onBehalfOf.contact - On-behalf-of contact email address
   * @param required.onBehalfOf.domain - On-behalf-of organization domain
   * @param optional - Optional report fields (typed object with nested properties)
   * @param optional.description - Human-readable description of the abuse
   * @param optional.evidence - Array of evidence objects with payloads
   * @param optional.severity - Severity level (low, medium, high, critical)
   * @param optional.confidence - Confidence score (0.0 to 1.0)
   * @param optional.tags - Additional classification tags
   * @param optional.occurrence - Time range when abuse occurred
   * @param optional.occurrence.start - Start time of abuse occurrence
   * @param optional.occurrence.end - End time of abuse occurrence
   * @param optional.target - Target information (victim)
   * @param optional.target.ip - Target IP address
   * @param optional.target.domain - Target domain name
   * @param optional.target.url - Target URL
   * @param optional.target.email - Target email address
   * @param optional.additionalFields - Additional category-specific fields
   * @returns Complete XARF report
   */
  private buildCompleteReport(
    required: {
      category: XARFCategory;
      reportType: string;
      sourceIdentifier: string;
      evidenceSource?: EvidenceSource;
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
    };

    if (required.evidenceSource) {
      report.evidence_source = required.evidenceSource;
    }

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
   * @param contactInfo.domain - Organization domain
   * @param fieldName - Name of the field for error messages
   * @throws {XARFError} If validation fails
   */
  private validateContactInfo(
    contactInfo: { org: string; contact: string; domain: string },
    fieldName: string
  ): void {
    const result = validateContactInfoUtil(contactInfo as Record<string, unknown>, fieldName);
    if (!result.valid) {
      throw new XARFError(result.errors[0]);
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
        // first_seen is required for connection types
        fields.first_seen = new Date(
          Date.now() - Math.floor(Math.random() * 3600000)
        ).toISOString();
        // source_port is required when source_identifier is an IP
        fields.source_port = 1024 + Math.floor(Math.random() * 64000);
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
        // Use valid protocol values from messaging schema
        fields.protocol = ['smtp', 'sms', 'chat'][Math.floor(Math.random() * 3)];
        if (fields.protocol === 'smtp') {
          fields.smtp_from = `spammer${Math.floor(Math.random() * 100)}@evil.example.com`;
          // source_port is required when protocol is smtp
          fields.source_port = 25 + Math.floor(Math.random() * 100);
          if (reportType === 'spam' || reportType === 'phishing') {
            fields.subject = `Sample ${reportType} subject`;
          }
          if (includeOptional) {
            fields.smtp_to = `victim@example.com`;
          }
        }
        break;

      case 'infrastructure':
        // compromise_evidence is required for botnet type
        if (reportType === 'botnet') {
          fields.compromise_evidence = 'C2 communication observed';
        }
        // compromise_method is required for compromised_server type
        if (reportType === 'compromised_server') {
          fields.compromise_method = 'unauthorized_access';
        }
        break;

      case 'copyright':
        // infringing_url is required for most copyright types
        fields.infringing_url = `http://pirate${Math.floor(Math.random() * 1000)}.example.com/content`;
        break;

      case 'vulnerability':
        // service is required for all vulnerability types
        fields.service = 'http';
        if (reportType === 'cve') {
          fields.service_port = 80;
          fields.cve_id = 'CVE-2024-12345';
        }
        break;

      case 'reputation':
        // threat_type is required for reputation types
        fields.threat_type = 'spam_source';
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
