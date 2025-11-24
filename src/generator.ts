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
 */
export interface GeneratorOptions {
  category: XARFCategory;
  reportType: string;
  sourceIdentifier: string;
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
  evidenceSource?: EvidenceSource;
  onBehalfOf?: ContactInfo;
  description?: string;
  evidence?: XARFEvidence[];
  severity?: SeverityLevel;
  confidence?: number;
  tags?: string[];
  occurrence?: TimeOccurrence;
  target?: Target;
  additionalFields?: Record<string, unknown>;
}

/**
 * Generator for creating XARF v4.0.0 compliant reports
 *
 * This class provides methods to generate complete XARF reports with all
 * required fields, proper validation, and support for all 8 report categories.
 */
export class XARFGenerator {
  // XARF v4.0.0 specification constants
  static readonly XARF_VERSION = '4.0.0';

  // Valid categories as per XARF spec
  static readonly VALID_CATEGORIES = new Set<XARFCategory>([
    'messaging',
    'connection',
    'content',
    'infrastructure',
    'copyright',
    'vulnerability',
    'reputation',
    'other',
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
    other: ['unclassified'],
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
   *
   * @returns A string representation of a UUID v4
   */
  generateUUID(): string {
    return randomUUID();
  }

  /**
   * Generate an ISO 8601 formatted timestamp with UTC timezone
   *
   * @returns ISO 8601 formatted timestamp string with UTC timezone
   */
  generateTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * Generate a cryptographic hash of the provided data
   *
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
   *
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

    const hash = this.generateHash(payloadBuffer, hashAlgorithm);

    return {
      content_type: contentType,
      description,
      payload: payloadStr,
      hash,
    };
  }

  /**
   * Generate a complete XARF v4.0.0 report
   *
   * @param options - Report generation options
   * @returns Complete XARF report object
   * @throws {XARFError} If validation fails or required fields are missing
   */
  generateReport(options: GeneratorOptions): XARFReport {
    const {
      category,
      reportType,
      sourceIdentifier,
      reporter,
      sender,
      evidenceSource = 'automated_scan',
      onBehalfOf,
      description,
      evidence,
      severity,
      confidence,
      tags,
      occurrence,
      target,
      additionalFields,
    } = options;

    // Validate required parameters
    if (!sourceIdentifier) {
      throw new XARFError('sourceIdentifier is required');
    }
    if (!reporter) {
      throw new XARFError('reporter is required');
    }
    if (!sender) {
      throw new XARFError('sender is required');
    }

    // Validate reporter ContactInfo
    this.validateContactInfo(reporter, 'reporter');

    // Validate sender ContactInfo
    this.validateContactInfo(sender, 'sender');

    // Validate category
    if (!XARFGenerator.VALID_CATEGORIES.has(category)) {
      throw new XARFError(
        `Invalid category '${category}'. Must be one of: ${Array.from(XARFGenerator.VALID_CATEGORIES).join(', ')}`
      );
    }

    // Validate type for category
    const validTypes = XARFGenerator.EVENT_TYPES[category] || [];
    if (!validTypes.includes(reportType)) {
      throw new XARFError(
        `Invalid type '${reportType}' for category '${category}'. Must be one of: ${validTypes.join(', ')}`
      );
    }

    // Validate evidence_source
    if (!XARFGenerator.VALID_EVIDENCE_SOURCES.has(evidenceSource)) {
      throw new XARFError(
        `Invalid evidence_source '${evidenceSource}'. Must be one of: ${Array.from(XARFGenerator.VALID_EVIDENCE_SOURCES).join(', ')}`
      );
    }

    // Validate severity if provided
    if (severity && !XARFGenerator.VALID_SEVERITIES.has(severity)) {
      throw new XARFError(
        `Invalid severity '${severity}'. Must be one of: ${Array.from(XARFGenerator.VALID_SEVERITIES).join(', ')}`
      );
    }

    // Validate confidence if provided
    if (confidence !== undefined && (confidence < 0.0 || confidence > 1.0)) {
      throw new XARFError('confidence must be between 0.0 and 1.0');
    }

    // Build base report structure
    const report: XARFReport = {
      xarf_version: XARFGenerator.XARF_VERSION,
      report_id: this.generateUUID(),
      timestamp: this.generateTimestamp(),
      reporter: {
        org: reporter.org,
        contact: reporter.contact,
        domain: reporter.domain,
      },
      sender: {
        org: sender.org,
        contact: sender.contact,
        domain: sender.domain,
      },
      source_identifier: sourceIdentifier,
      category,
      type: reportType,
      evidence_source: evidenceSource,
    };

    // Add on_behalf_of if provided
    if (onBehalfOf) {
      if (!onBehalfOf.org || !onBehalfOf.contact || !onBehalfOf.domain) {
        throw new XARFError("on_behalf_of must contain 'org', 'contact', and 'domain' fields");
      }
      report.on_behalf_of = {
        org: onBehalfOf.org,
        contact: onBehalfOf.contact,
        domain: onBehalfOf.domain,
      };
    }

    // Add optional fields
    if (description) report.description = description;
    if (evidence) report.evidence = evidence;
    if (severity) report.severity = severity;
    if (confidence !== undefined) report.confidence = confidence;
    if (tags) report.tags = tags;

    if (occurrence) {
      if (!occurrence.start || !occurrence.end) {
        throw new XARFError("occurrence must contain 'start' and 'end' keys");
      }
      report.occurrence = occurrence;
    }

    if (target) report.target = target;

    // Add any additional category-specific fields
    if (additionalFields) {
      Object.assign(report, additionalFields);
    }

    return report;
  }

  /**
   * Validate ContactInfo structure
   *
   * @param contactInfo - Contact information to validate
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
    if (!contactInfo.contact || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactInfo.contact)) {
      throw new XARFError(`${fieldName}.contact must be a valid email address`);
    }
    if (!contactInfo.domain || !/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(contactInfo.domain)) {
      throw new XARFError(`${fieldName}.domain must be a valid hostname`);
    }
  }

  /**
   * Generate random sample evidence for testing purposes
   *
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
   * Generate a sample XARF report with randomized data for testing
   *
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
    // Validate inputs
    if (!XARFGenerator.VALID_CATEGORIES.has(category)) {
      throw new XARFError(`Invalid category: ${category}`);
    }

    const validTypes = XARFGenerator.EVENT_TYPES[category] || [];
    if (!validTypes.includes(reportType)) {
      throw new XARFError(`Invalid type '${reportType}' for category '${category}'`);
    }

    // Generate random test data
    const sourceIp = `192.0.2.${Math.floor(Math.random() * 256)}`;

    const sampleOrgs = [
      'Security Operations Center',
      'Abuse Response Team',
      'Network Security Team',
      'Threat Intelligence Unit',
      'SOC Team',
    ];
    const reporterOrg = sampleOrgs[Math.floor(Math.random() * sampleOrgs.length)];
    const senderOrg = sampleOrgs[Math.floor(Math.random() * sampleOrgs.length)];

    const sampleDomains = ['example.com', 'security.net', 'abuse.org', 'soc.io'];
    const reporterDomain = sampleDomains[Math.floor(Math.random() * sampleDomains.length)];
    const senderDomain = sampleDomains[Math.floor(Math.random() * sampleDomains.length)];
    const reporterContact = `abuse@${reporterDomain}`;
    const senderContact = `report@${senderDomain}`;

    // Build report parameters
    const options: GeneratorOptions = {
      category,
      reportType,
      sourceIdentifier: sourceIp,
      reporter: {
        org: reporterOrg,
        contact: reporterContact,
        domain: reporterDomain,
      },
      sender: {
        org: senderOrg,
        contact: senderContact,
        domain: senderDomain,
      },
      description: `Sample ${reportType} report for testing`,
    };

    // Add evidence if requested
    if (includeEvidence) {
      options.evidence = [this.generateRandomEvidence(category)];
    }

    // Add optional fields if requested
    if (includeOptional) {
      const severities = Array.from(XARFGenerator.VALID_SEVERITIES);
      options.severity = severities[Math.floor(Math.random() * severities.length)];
      options.confidence = Math.round((0.7 + Math.random() * 0.3) * 100) / 100;
      options.tags = [category, reportType, 'sample'];

      // Add target information
      const targetIp = `203.0.113.${Math.floor(Math.random() * 256)}`;
      const ports = [53, 80, 443, 8080, 22, 25];
      options.target = {
        ip: targetIp,
        port: ports[Math.floor(Math.random() * ports.length)],
      };

      // Add occurrence time range
      const now = new Date();
      const startTime = new Date(now.getTime() - Math.floor(Math.random() * 7200000));
      options.occurrence = {
        start: startTime.toISOString(),
        end: now.toISOString(),
      };
    }

    return this.generateReport(options);
  }
}
