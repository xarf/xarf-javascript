/**
 * XARF v4 Type Definitions
 */

/**
 * Valid XARF categories (7 total as per XARF v4.0.0 specification)
 */
export type XARFCategory =
  | 'messaging'
  | 'connection'
  | 'content'
  | 'infrastructure'
  | 'copyright'
  | 'vulnerability'
  | 'reputation';

/**
 * Valid evidence sources.
 * Known values from xarf-core.json examples are listed for autocomplete.
 * Any string is accepted at the base level; type-specific schemas may
 * restrict to an enum which is enforced at runtime via AJV validation.
 */
export type EvidenceSource =
  | 'spamtrap'
  | 'user_complaint'
  | 'automated_filter'
  | 'honeypot'
  | 'crawler'
  | 'user_report'
  | 'automated_scan'
  | 'spam_analysis'
  | 'firewall_logs'
  | 'ids_detection'
  | 'flow_analysis'
  | 'vulnerability_scan'
  | 'researcher_analysis'
  | 'automated_discovery'
  | 'traffic_analysis'
  | 'threat_intelligence'
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  | (string & {}); // Accepts any string while preserving autocomplete for known values

/**
 * Contact information for reporter and sender
 */
export interface ContactInfo {
  org: string;
  contact: string;
  domain: string;
}

/**
 * Evidence item
 */
export interface XARFEvidence {
  content_type: string;
  payload: string;
  description?: string;
  hash?: string;
  size?: number;
}

/**
 * Base XARF Report structure
 */
export interface XARFReport {
  // Required fields
  xarf_version: string;
  report_id: string;
  timestamp: string;
  reporter: ContactInfo;
  sender: ContactInfo;
  source_identifier: string;
  category: XARFCategory;
  type: string;

  // Recommended fields (optional per XARF schema)
  evidence_source?: EvidenceSource;
  source_port?: number;

  // Optional base fields
  description?: string;
  legacy_version?: '3';
  evidence?: XARFEvidence[];
  tags?: string[];
  confidence?: number;
  _internal?: Record<string, unknown>;

  // Allow additional fields
  [key: string]: unknown;
}

// Re-export category types
import { MessagingReport } from './types-messaging';
import { ConnectionReport } from './types-connection';
import { ContentReport } from './types-content';
import { InfrastructureReport } from './types-infrastructure';
import { CopyrightReport } from './types-copyright';
import { VulnerabilityReport } from './types-vulnerability';
import { ReputationReport } from './types-reputation';

export type {
  MessagingBaseReport,
  SpamReport,
  BulkMessagingReport,
  MessagingReport,
} from './types-messaging';

export type {
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
} from './types-connection';

export type {
  ContentBaseReport,
  PhishingReport,
  MalwareReport,
  CsamReport,
  CsemReport,
  ExposedDataReport,
  BrandInfringementReport,
  FraudReport,
  RemoteCompromiseReport,
  SuspiciousRegistrationReport,
  ContentReport,
} from './types-content';

export type {
  InfrastructureBaseReport,
  BotnetReport,
  CompromisedServerReport,
  InfrastructureReport,
} from './types-infrastructure';

export type {
  CopyrightBaseReport,
  CopyrightCopyrightReport,
  SwarmInfo,
  CopyrightP2pReport,
  MessageInfo,
  CopyrightCyberlockerReport,
  CopyrightUgcPlatformReport,
  CopyrightLinkSiteReport,
  CopyrightUsenetReport,
  CopyrightReport,
} from './types-copyright';

export type {
  VulnerabilityBaseReport,
  CveReport,
  OpenServiceReport,
  MisconfigurationReport,
  VulnerabilityReport,
} from './types-vulnerability';

export type {
  ReputationBaseReport,
  BlocklistReport,
  ThreatIntelligenceReport,
  ReputationReport,
} from './types-reputation';

/**
 * Union type for all report types
 */
export type AnyXARFReport =
  | MessagingReport
  | ConnectionReport
  | ContentReport
  | InfrastructureReport
  | CopyrightReport
  | VulnerabilityReport
  | ReputationReport;
