/**
 * XARF Report Generator
 *
 * Generates XARF v4.0.0 compliant reports with automatic metadata,
 * validation, and type safety derived from parser types.
 */

import { createHash, randomUUID } from 'crypto';
import { XARFValidationError } from './errors';
import { XARFValidator } from './validator';
import type {
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
    const payloadBuffer = typeof payload === 'string' ? Buffer.from(payload, 'utf8') : payload;
    const hashValue = this.generateHash(payloadBuffer, hashAlgorithm);

    const evidence: XARFEvidence = {
      content_type: contentType,
      payload: payloadBuffer.toString('base64'),
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
}
