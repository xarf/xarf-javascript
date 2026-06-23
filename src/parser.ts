/**
 * XARF v4 Parser Implementation
 */

import { XARFParseError } from './errors';
import { XARFValidator, type ValidationInfo } from './validator';
import type {
  XARFReport,
  MessagingReport,
  ConnectionReport,
  ContentReport,
  InfrastructureReport,
  CopyrightReport,
  VulnerabilityReport,
  ReputationReport,
} from './types';
import { isXARFv3, convertV3toV4, getV3DeprecationWarning, type XARFv3Report } from './v3-legacy';

/**
 * Options for parsing XARF reports
 */
export interface ParseOptions {
  strict?: boolean;
  showMissingOptional?: boolean;
  /**
   * Maximum size, in bytes, of a string `jsonData` input. When set, inputs
   * larger than this are rejected with an `XARFParseError` before `JSON.parse`
   * runs. Use this to bound untrusted input (abuse reports are adversarial by
   * nature and may carry large base64 evidence payloads). Defaults to no limit.
   */
  maxInputBytes?: number;
}

/**
 * Result of parsing a XARF report
 */
export interface ParseResult {
  report: XARFReport;
  errors: string[];
  warnings: string[];
  info?: ValidationInfo[];
}

const validator = new XARFValidator();

/**
 * Compute the UTF-8 byte length of a string, working in both Node and
 * Buffer-less (e.g. edge) runtimes.
 * @param value - The string to measure
 * @returns Byte length in UTF-8
 */
function utf8ByteLength(value: string): number {
  if (typeof Buffer !== 'undefined') {
    return Buffer.byteLength(value, 'utf8');
  }
  return new TextEncoder().encode(value).length;
}

/**
 * Parse JSON data into object
 * @param jsonData - JSON string or already-parsed object
 * @param maxInputBytes - Optional maximum byte size for string input
 * @throws {XARFParseError} If JSON parsing fails or input exceeds maxInputBytes
 */
function parseJSON(
  jsonData: string | Record<string, unknown>,
  maxInputBytes?: number
): Record<string, unknown> {
  if (typeof jsonData !== 'string') {
    return jsonData;
  }

  if (maxInputBytes !== undefined) {
    const bytes = utf8ByteLength(jsonData);
    if (bytes > maxInputBytes) {
      throw new XARFParseError(`Input exceeds maxInputBytes (${bytes} > ${maxInputBytes} bytes)`);
    }
  }

  try {
    return JSON.parse(jsonData) as Record<string, unknown>;
  } catch (error) {
    throw new XARFParseError(
      `Invalid JSON: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Handle v3 to v4 conversion if needed
 * @param data
 * @param warnings
 */
function handleV3Conversion(
  data: Record<string, unknown>,
  warnings: string[]
): Record<string, unknown> {
  if (!isXARFv3(data)) {
    return data;
  }

  const conversionWarnings: string[] = [];
  const v4Report = convertV3toV4(data as XARFv3Report, conversionWarnings);

  warnings.push(getV3DeprecationWarning());
  warnings.push(...conversionWarnings);

  return v4Report as Record<string, unknown>;
}

/**
 * Cast data to appropriate report type based on category
 * @param data
 * @param category
 */
function castToReportType(data: Record<string, unknown>, category: string): XARFReport {
  switch (category) {
    case 'messaging':
      return data as MessagingReport;
    case 'connection':
      return data as ConnectionReport;
    case 'content':
      return data as ContentReport;
    case 'infrastructure':
      return data as InfrastructureReport;
    case 'copyright':
      return data as CopyrightReport;
    case 'vulnerability':
      return data as VulnerabilityReport;
    case 'reputation':
      return data as ReputationReport;
    default:
      return data as XARFReport;
  }
}

/**
 * Parse XARF report from JSON
 *
 * Supports both XARF v4 and v3 (legacy) formats.
 * v3 reports are automatically converted to v4 with a deprecation warning.
 * @param jsonData - JSON string or object containing XARF report
 * @param options - Parse options
 * @returns Parse result with report, errors, and warnings
 * @throws {XARFParseError} If JSON parsing fails (malformed JSON)
 */
export function parse(
  jsonData: string | Record<string, unknown>,
  options?: ParseOptions
): ParseResult {
  const strict = options?.strict ?? false;
  const showMissingOptional = options?.showMissingOptional ?? false;
  const errors: string[] = [];
  const warnings: string[] = [];

  let data = parseJSON(jsonData, options?.maxInputBytes);
  data = handleV3Conversion(data, warnings);

  const result = validator.validate(data as XARFReport, strict, showMissingOptional);
  errors.push(...result.errors.map((e) => `${e.field}: ${e.message}`));
  warnings.push(...result.warnings.map((w) => `${w.field}: ${w.message}`));

  const reportCategory = data.category as string;
  const report = castToReportType(data, reportCategory);

  const parseResult: ParseResult = { report, errors, warnings };

  if (showMissingOptional && result.info) {
    parseResult.info = result.info;
  }

  return parseResult;
}
