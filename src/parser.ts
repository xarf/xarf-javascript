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
 * Parse JSON data into object
 * @param jsonData
 * @throws {XARFParseError} If JSON parsing fails
 */
function parseJSON(jsonData: string | Record<string, unknown>): Record<string, unknown> {
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
 * @param data
 * @param warnings
 */
async function handleV3Conversion(
  data: Record<string, unknown>,
  warnings: string[]
): Promise<Record<string, unknown>> {
  if (!isXARFv3(data)) {
    return data;
  }

  const conversionWarnings: string[] = [];
  const v4Report = await convertV3toV4(data as XARFv3Report, conversionWarnings);

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
 * @returns Promise resolving to a parse result with report, errors, and warnings
 * @throws {XARFParseError} If JSON parsing fails (malformed JSON)
 */
export async function parse(
  jsonData: string | Record<string, unknown>,
  options?: ParseOptions
): Promise<ParseResult> {
  const strict = options?.strict ?? false;
  const showMissingOptional = options?.showMissingOptional ?? false;
  const errors: string[] = [];
  const warnings: string[] = [];

  let data = parseJSON(jsonData);
  data = await handleV3Conversion(data, warnings);

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
