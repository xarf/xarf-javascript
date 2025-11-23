/**
 * XARF v4 JavaScript/TypeScript Parser and Generator
 *
 * A library for parsing, validating, and generating XARF v4
 * (eXtended Abuse Reporting Format) reports.
 */

export { XARFParser } from './parser';
export { XARFGenerator, type GeneratorOptions } from './generator';
export {
  XARFValidator,
  type ValidationResult,
  type ValidationError,
  type ValidationWarning,
} from './validator';
export { XARFError, XARFValidationError, XARFParseError, XARFSchemaError } from './errors';
export type {
  XARFReport,
  XARFCategory,
  ReporterType,
  EvidenceSource,
  SeverityLevel,
  XARFReporter,
  XARFEvidence,
  TimeOccurrence,
  Target,
  MessagingReport,
  ConnectionReport,
  ContentReport,
  InfrastructureReport,
  CopyrightReport,
  VulnerabilityReport,
  ReputationReport,
  OtherReport,
  AnyXARFReport,
} from './types';

export const VERSION = '1.0.0-alpha.1';
export const SPEC_VERSION = '4.0.0';
