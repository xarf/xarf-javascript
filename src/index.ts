/**
 * XARF v4 JavaScript/TypeScript Parser and Generator
 *
 * A library for parsing, validating, and generating XARF v4
 * (eXtended Abuse Reporting Format) reports.
 */

export { SPEC_VERSION } from './version';
export { parse, type ParseOptions, type ParseResult } from './parser';
export {
  createReport,
  createEvidence,
  type ReportInput,
  type CreateReportOptions,
  type CreateReportResult,
  type EvidenceOptions,
  type ConnectionReportInput,
  type MessagingReportInput,
  type ContentReportInput,
  type InfrastructureReportInput,
  type CopyrightReportInput,
  type VulnerabilityReportInput,
  type ReputationReportInput,
} from './generator';
export {
  type ValidationResult,
  type ValidationError,
  type ValidationWarning,
  type ValidationInfo,
} from './validator';
export { SchemaValidator, validator } from './schema-validator';
export { SchemaRegistry, schemaRegistry, type FieldMetadata } from './schema-registry';
export { XARFError, XARFValidationError, XARFParseError } from './errors';
export type {
  // Core types
  XARFReport,
  XARFCategory,
  EvidenceSource,
  XARFEvidence,
  ContactInfo,
  AnyXARFReport,
  // Messaging
  MessagingBaseReport,
  SpamIndicators,
  SpamReport,
  BulkIndicators,
  BulkMessagingReport,
  MessagingReport,
  // Connection
  ConnectionBaseReport,
  LoginAttackReport,
  PortScanReport,
  DdosReport,
  InfectedHostReport,
  ReconnaissanceReport,
  ScrapingReport,
  SqlInjectionReport,
  VulnerabilityScanReport,
  ConnectionReport,
  // Content
  ContentBaseReport,
  PhishingReport,
  MalwareReport,
  CsamReport,
  CsemReport,
  ExposedDataReport,
  BrandInfringementReport,
  FraudReport,
  CompromiseIndicator,
  WebshellDetails,
  RemoteCompromiseReport,
  RegistrantDetails,
  SuspiciousRegistrationReport,
  ContentReport,
  // Infrastructure
  InfrastructureBaseReport,
  BotnetReport,
  CompromisedServerReport,
  InfrastructureReport,
  // Copyright
  CopyrightBaseReport,
  CopyrightCopyrightReport,
  SwarmInfo,
  PeerInfo,
  CopyrightP2pReport,
  FileInfo,
  CyberlockerTakedownInfo,
  CyberlockerUploaderInfo,
  CopyrightCyberlockerReport,
  UgcContentInfo,
  UgcUploaderInfo,
  UgcMatchDetails,
  UgcMonetizationInfo,
  CopyrightUgcPlatformReport,
  LinkSiteLinkInfo,
  LinkedContentItem,
  LinkSiteRanking,
  CopyrightLinkSiteReport,
  MessageInfo,
  UsenetEncodingInfo,
  UsenetNzbInfo,
  UsenetServerInfo,
  CopyrightUsenetReport,
  CopyrightReport,
  // Vulnerability
  VulnerabilityBaseReport,
  ImpactAssessment,
  CveReport,
  OpenServiceReport,
  MisconfigurationReport,
  VulnerabilityReport,
  // Reputation
  ReputationBaseReport,
  BlocklistReport,
  ThreatIntelligenceReport,
  ReputationReport,
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
