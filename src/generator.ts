/**
 * XARF Report Generator
 *
 * Generates XARF v4.2.0 compliant reports with automatic metadata,
 * validation, and type safety derived from parser types.
 */

import { createHash, randomUUID } from 'crypto';
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
import type { ValidationError, ValidationWarning, ValidationInfo } from './validator';
import { SPEC_VERSION } from './version';

/**
 * A bit of Typescprit magic to derive the generator options from a report
 * type (e.g. ConnectionReport → ConnectionReportInput).
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
type MakeReportInput<T extends XARFReport> = Omit<
  RemoveIndex<T>,
  'xarf_version' | 'report_id' | 'timestamp'
> & { report_id?: string; timestamp?: string; [key: string]: unknown };

/**
 * Category-specific report input types, derived from the corresponding report types.
 */
export type ConnectionReportInput = MakeReportInput<ConnectionReport>;
export type MessagingReportInput = MakeReportInput<MessagingReport>;
export type ContentReportInput = MakeReportInput<ContentReport>;
export type InfrastructureReportInput = MakeReportInput<InfrastructureReport>;
export type CopyrightReportInput = MakeReportInput<CopyrightReport>;
export type VulnerabilityReportInput = MakeReportInput<VulnerabilityReport>;
export type ReputationReportInput = MakeReportInput<ReputationReport>;

/**
 * Discriminated union of all category-specific report inputs.
 * Narrows on `category` to provide autocomplete for category-specific fields.
 */
export type ReportInput =
  | ConnectionReportInput
  | MessagingReportInput
  | ContentReportInput
  | InfrastructureReportInput
  | CopyrightReportInput
  | VulnerabilityReportInput
  | ReputationReportInput;

/**
 * Options for createReport()
 */
export interface CreateReportOptions {
  strict?: boolean;
  showMissingOptional?: boolean;
}

/**
 * Result of createReport()
 */
export interface CreateReportResult {
  report: XARFReport;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  info?: ValidationInfo[];
}

/**
 * Options for createEvidence()
 */
export interface EvidenceOptions {
  description?: string;
  hashAlgorithm?: 'sha256' | 'sha512' | 'sha1' | 'md5';
}

const validator = new XARFValidator();

/**
 * Generate a hash of the given data.
 * @param data
 * @param algorithm
 */
function generateHash(
  data: string | Buffer,
  algorithm: 'sha256' | 'sha512' | 'sha1' | 'md5' = 'sha256'
): string {
  const buffer = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
  return createHash(algorithm).update(buffer).digest('hex');
}

/**
 * Create a validated XARF report with auto-generated metadata fields.
 *
 * Auto-generates `xarf_version`, `report_id`, and `timestamp` if not provided.
 * Validation runs internally — errors and warnings are returned alongside the report.
 * @param input - Report data (report_id and timestamp auto-generated if omitted)
 * @param options - Options controlling validation behavior
 * @returns Result with report, errors, and warnings
 */
export function createReport(
  input: ReportInput,
  options?: CreateReportOptions
): CreateReportResult {
  const strict = options?.strict ?? false;
  const showMissingOptional = options?.showMissingOptional ?? false;

  const report = {
    ...input,
    xarf_version: SPEC_VERSION,
    report_id: input.report_id ?? randomUUID(),
    timestamp: input.timestamp ?? new Date().toISOString(),
  } as XARFReport;

  const result = validator.validate(report, strict, showMissingOptional);

  const createReportResult: CreateReportResult = {
    report,
    errors: result.errors,
    warnings: result.warnings,
  };

  if (showMissingOptional && result.info) {
    createReportResult.info = result.info;
  }

  return createReportResult;
}

/**
 * Create an evidence object with automatic base64 encoding, hashing, and size calculation.
 * @param contentType - MIME type of the evidence
 * @param payload - The evidence data
 * @param options - Optional description and hash algorithm
 * @returns Evidence object with computed hash
 */
export function createEvidence(
  contentType: string,
  payload: string | Buffer,
  options?: EvidenceOptions
): XARFEvidence {
  const hashAlgorithm = options?.hashAlgorithm ?? 'sha256';
  const payloadBuffer = typeof payload === 'string' ? Buffer.from(payload, 'utf8') : payload;
  const hashValue = generateHash(payloadBuffer, hashAlgorithm);

  const evidence: XARFEvidence = {
    content_type: contentType,
    payload: payloadBuffer.toString('base64'),
    hash: `${hashAlgorithm}:${hashValue}`,
    size: payloadBuffer.length,
  };
  if (options?.description !== undefined) {
    evidence.description = options.description;
  }
  return evidence;
}
