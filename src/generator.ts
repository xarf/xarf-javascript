/**
 * XARF Report Generator
 *
 * Generates XARF v4.0.0 compliant reports with automatic metadata,
 * validation, and type safety derived from parser types.
 */

import { createHash, randomBytes, randomUUID } from 'crypto';
import { XARFError, XARFValidationError } from './errors';
import { schemaRegistry } from './schema-registry';
import { XARFValidator } from './validator';
import type {
  ContactInfo,
  XARFCategory,
  XARFEvidence,
  XARFReport,
  ConnectionReport,
  MessagingReport,
  ContentReport,
  InfrastructureReport,
  CopyrightReport,
  VulnerabilityReport,
  ReputationReport,
} from './types';

/**
 * A bit of Typescprit magic to derive the generator options from a report
 * type (e.g. ConnectionReport → ConnectionGeneratorOptions).
 *
 * The report interfaces have an index signature ([key: string]: unknown) which causes
 * Omit<T, K> to collapse to just the index signature, losing all named properties.
 * RemoveIndex strips it first so Omit can work on the actual fields, then we:
 *   1. Remove xarf_version, report_id, timestamp (auto-filled by the generator)
 *   2. Add report_id and timestamp back as optional overrides
 *   3. Re-add the index signature for arbitrary spec fields
 */
type RemoveIndex<T> = {
  [K in keyof T as string extends K ? never : K]: T[K];
};
type MakeGeneratorOptions<T extends XARFReport> = Omit<
  RemoveIndex<T>,
  'xarf_version' | 'report_id' | 'timestamp'
> & { report_id?: string; timestamp?: string; [key: string]: unknown };

/**
 * Category-specific generator options, derived from the corresponding report types.
 */
export type ConnectionGeneratorOptions = MakeGeneratorOptions<ConnectionReport>;
export type MessagingGeneratorOptions = MakeGeneratorOptions<MessagingReport>;
export type ContentGeneratorOptions = MakeGeneratorOptions<ContentReport>;
export type InfrastructureGeneratorOptions = MakeGeneratorOptions<InfrastructureReport>;
export type CopyrightGeneratorOptions = MakeGeneratorOptions<CopyrightReport>;
export type VulnerabilityGeneratorOptions = MakeGeneratorOptions<VulnerabilityReport>;
export type ReputationGeneratorOptions = MakeGeneratorOptions<ReputationReport>;

/**
 * Discriminated union of all category-specific generator options.
 * Narrows on `category` to provide autocomplete for category-specific fields.
 */
export type GeneratorOptions =
  | ConnectionGeneratorOptions
  | MessagingGeneratorOptions
  | ContentGeneratorOptions
  | InfrastructureGeneratorOptions
  | CopyrightGeneratorOptions
  | VulnerabilityGeneratorOptions
  | ReputationGeneratorOptions;

/**
 * Options for sample report generation
 */
export interface SampleReportOptions {
  includeEvidence?: boolean;
  includeOptional?: boolean;
}

/**
 * XARF report generator with automatic metadata and validation.
 */
export class XARFGenerator {
  /**
   * Create a validated XARF report with auto-generated metadata fields.
   * @param input - Report data (report_id and timestamp auto-generated if omitted)
   * @returns Complete, validated XARFReport
   * @throws {XARFValidationError} If validation produces errors or warnings
   */
  createReport(input: GeneratorOptions): XARFReport {
    const report = {
      ...input,
      xarf_version: '4.0.0',
      report_id: input.report_id ?? randomUUID(),
      timestamp: input.timestamp ?? new Date().toISOString(),
    } as XARFReport;

    const validator = new XARFValidator();
    const result = validator.validate(report, false);

    if (!result.valid) {
      const messages = result.errors.map((e) => `${e.field}: ${e.message}`);
      throw new XARFValidationError(`Report validation failed: ${messages.join('; ')}`, messages);
    }

    return report;
  }

  /**
   * Create an evidence item with automatic hashing.
   * @param contentType - MIME type of the evidence
   * @param payload - The evidence data
   * @param description - Human-readable description (optional, recommended)
   * @param hashAlgorithm - Hash algorithm (default: sha256)
   * @returns Evidence object with computed hash
   */
  addEvidence(
    contentType: string,
    payload: string | Buffer,
    description?: string,
    hashAlgorithm: 'sha256' | 'sha512' | 'sha1' | 'md5' = 'sha256'
  ): XARFEvidence {
    const payloadStr = typeof payload === 'string' ? payload : payload.toString('utf8');
    const payloadBuffer = typeof payload === 'string' ? Buffer.from(payload, 'utf8') : payload;
    const hashValue = this.generateHash(payloadBuffer, hashAlgorithm);

    const evidence: XARFEvidence = {
      content_type: contentType,
      payload: payloadStr,
      hash: `${hashAlgorithm}:${hashValue}`,
    };
    if (description !== undefined) {
      evidence.description = description;
    }
    return evidence;
  }

  /**
   * Generate a hash of the given data.
   * @param data - Data to hash
   * @param algorithm - Hash algorithm (default: sha256)
   * @returns Hex-encoded hash string
   */
  generateHash(
    data: string | Buffer,
    algorithm: 'sha256' | 'sha512' | 'sha1' | 'md5' = 'sha256'
  ): string {
    const buffer = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
    return createHash(algorithm).update(buffer).digest('hex');
  }

  /**
   * Generate a sample XARF report with randomized data for testing.
   * @param category - Report category
   * @param reportType - Specific type within category
   * @param options - Whether to include evidence and optional fields
   * @returns Complete sample XARFReport
   * @throws {XARFError} If category or type is invalid
   */
  generateSampleReport(
    category: XARFCategory,
    reportType: string,
    options?: SampleReportOptions
  ): XARFReport {
    const includeEvidence = options?.includeEvidence ?? true;
    const includeOptional = options?.includeOptional ?? true;

    if (!schemaRegistry.isValidCategory(category)) {
      throw new XARFError(`Invalid category: ${category}`);
    }
    if (!schemaRegistry.isValidType(category, reportType)) {
      throw new XARFError(`Invalid type '${reportType}' for category '${category}'`);
    }

    const sourceIp = `192.0.2.${Math.floor(Math.random() * 256)}`;

    // category is XARFCategory (union), not a specific literal, so TypeScript
    // can't narrow to the correct GeneratorOptions variant. The assertion is safe
    // because we validated category/type against the schema registry above.
    const input = {
      category,
      type: reportType,
      source_identifier: sourceIp,
      reporter: this.sampleContact('abuse'),
      sender: this.sampleContact('report'),
      description: `Sample ${reportType} report for testing`,
      ...this.categorySpecificFields(category, reportType, includeOptional),
    } as GeneratorOptions;

    if (includeEvidence) {
      input.evidence = [this.sampleEvidence(category)];
    }

    if (includeOptional) {
      input.confidence = Math.round((0.7 + Math.random() * 0.3) * 100) / 100;
      input.tags = [`category:${category}`, `type:${reportType}`, 'source:sample'];
    }

    return this.createReport(input);
  }

  private sampleContact(prefix: string): ContactInfo {
    const orgs = ['Security Operations Center', 'Abuse Response Team', 'Network Security Team'];
    const domains = ['example.com', 'security.net', 'abuse.org'];
    const org = orgs[Math.floor(Math.random() * orgs.length)];
    const domain = domains[Math.floor(Math.random() * domains.length)];
    return { org, contact: `${prefix}@${domain}`, domain };
  }

  private sampleEvidence(category: XARFCategory): XARFEvidence {
    const payload = randomBytes(32).toString('hex');
    return this.addEvidence('text/plain', payload, `Sample ${category} evidence`);
  }

  private categorySpecificFields(
    category: XARFCategory,
    reportType: string,
    includeOptional: boolean
  ): Record<string, unknown> {
    const fields: Record<string, unknown> = {};

    switch (category) {
      case 'connection':
        fields.destination_ip = `203.0.113.${Math.floor(Math.random() * 256)}`;
        fields.protocol = ['tcp', 'udp', 'icmp'][Math.floor(Math.random() * 3)];
        fields.first_seen = new Date(
          Date.now() - Math.floor(Math.random() * 3600000)
        ).toISOString();
        fields.source_port = 1024 + Math.floor(Math.random() * 64000);
        if (includeOptional) {
          fields.destination_port = [80, 443, 22, 25, 53][Math.floor(Math.random() * 5)];
        }
        break;

      case 'content':
        fields.url = `http://malicious${Math.floor(Math.random() * 1000)}.example.com`;
        if (includeOptional) fields.content_type = 'text/html';
        break;

      case 'messaging':
        fields.protocol = ['smtp', 'sms', 'chat'][Math.floor(Math.random() * 3)];
        if (fields.protocol === 'smtp') {
          fields.smtp_from = `spammer${Math.floor(Math.random() * 100)}@evil.example.com`;
          fields.source_port = 25 + Math.floor(Math.random() * 100);
          if (reportType === 'spam' || reportType === 'phishing') {
            fields.subject = `Sample ${reportType} subject`;
          }
          if (includeOptional) fields.smtp_to = 'victim@example.com';
        }
        break;

      case 'infrastructure':
        if (reportType === 'botnet') fields.compromise_evidence = 'C2 communication observed';
        if (reportType === 'compromised_server') fields.compromise_method = 'unauthorized_access';
        break;

      case 'copyright':
        fields.infringing_url = `http://pirate${Math.floor(Math.random() * 1000)}.example.com/content`;
        break;

      case 'vulnerability':
        fields.service = 'http';
        if (reportType === 'cve') {
          fields.service_port = 80;
          fields.cve_id = 'CVE-2024-12345';
        }
        break;

      case 'reputation':
        fields.threat_type = 'spam_source';
        break;
    }

    return fields;
  }
}
