/**
 * XARF v4 JavaScript/TypeScript Parser and Generator
 *
 * A library for parsing, validating, and generating XARF v4
 * (eXtended Abuse Reporting Format) reports.
 */

export { XARFParser } from './parser';
export {
  XARFGenerator,
  type GeneratorOptions,
  type ConnectionGeneratorOptions,
  type MessagingGeneratorOptions,
  type ContentGeneratorOptions,
  type InfrastructureGeneratorOptions,
  type CopyrightGeneratorOptions,
  type VulnerabilityGeneratorOptions,
  type ReputationGeneratorOptions,
  type SampleReportOptions,
} from './generator';
export {
  XARFValidator,
  type ValidationResult,
  type ValidationError,
  type ValidationWarning,
  type ValidationInfo,
} from './validator';
export { SchemaValidator, validator } from './schema-validator';
export { SchemaRegistry, schemaRegistry, type FieldMetadata } from './schema-registry';
export { XARFError, XARFValidationError, XARFParseError, XARFSchemaError } from './errors';
export type {
  XARFReport,
  XARFCategory,
  EvidenceSource,
  XARFEvidence,
  ContactInfo,
  MessagingReport,
  ConnectionReport,
  ContentReport,
  InfrastructureReport,
  CopyrightReport,
  VulnerabilityReport,
  ReputationReport,
  AnyXARFReport,
} from './types';

export {
  isXARFv3,
  convertV3toV4,
  getV3DeprecationWarning,
  type XARFv3Report,
  type XARFv3ReporterInfo,
  type XARFv3Attachment,
} from './v3-legacy';

export const VERSION = '1.0.0';
export const SPEC_VERSION = '4.0.0';
