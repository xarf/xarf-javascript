/**
 * XARF v4 Type Definitions
 */

/**
 * Valid XARF categories
 */
export type XARFCategory =
  | 'messaging'
  | 'connection'
  | 'content'
  | 'infrastructure'
  | 'copyright'
  | 'vulnerability'
  | 'reputation'
  | 'other';

/**
 * Valid reporter types
 */
export type ReporterType = 'automated' | 'manual' | 'hybrid';

/**
 * Valid evidence sources
 */
export type EvidenceSource =
  | 'spamtrap'
  | 'honeypot'
  | 'user_report'
  | 'automated_scan'
  | 'manual_analysis'
  | 'vulnerability_scan'
  | 'researcher_analysis'
  | 'threat_intelligence'
  | 'flow_analysis'
  | 'ids_ips'
  | 'siem';

/**
 * Valid severity levels
 */
export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * Contact information for reporter and sender
 */
export interface ContactInfo {
  org: string;
  contact: string;
  domain: string;
}

/**
 * Reporter information (legacy type, deprecated)
 * @deprecated Use ContactInfo instead
 */
export interface XARFReporter {
  org?: string;
  contact: string;
  type: ReporterType;
}

/**
 * Evidence item
 */
export interface XARFEvidence {
  content_type: string;
  description: string;
  payload: string;
  hash?: string;
}

/**
 * Time occurrence range
 */
export interface TimeOccurrence {
  start: string;
  end: string;
}

/**
 * Target information
 */
export interface Target {
  ip?: string;
  port?: number;
  url?: string;
  domain?: string;
  [key: string]: unknown;
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
  evidence_source: EvidenceSource;

  // Optional base fields
  on_behalf_of?: ContactInfo;
  description?: string;
  evidence?: XARFEvidence[];
  tags?: string[];
  severity?: SeverityLevel;
  confidence?: number;
  occurrence?: TimeOccurrence;
  target?: Target;
  _internal?: Record<string, unknown>;

  // Allow additional fields
  [key: string]: unknown;
}

/**
 * Messaging category report
 */
export interface MessagingReport extends XARFReport {
  category: 'messaging';
  protocol?: string;
  smtp_from?: string;
  smtp_to?: string;
  subject?: string;
  message_id?: string;
  sender_display_name?: string;
  target_victim?: string;
  message_content?: string;
}

/**
 * Connection category report
 */
export interface ConnectionReport extends XARFReport {
  category: 'connection';
  destination_ip: string;
  protocol: string;
  destination_port?: number;
  source_port?: number;
  attack_type?: string;
  duration_minutes?: number;
  packet_count?: number;
  byte_count?: number;
  attempt_count?: number;
  successful_logins?: number;
  usernames_attempted?: string[];
  attack_pattern?: string;
}

/**
 * Content category report
 */
export interface ContentReport extends XARFReport {
  category: 'content';
  url: string;
  content_type?: string;
  attack_type?: string;
  affected_pages?: string[];
  cms_platform?: string;
  vulnerability_exploited?: string;
  affected_parameters?: string[];
  payload_detected?: string;
  data_exposed?: string[];
  database_type?: string;
  records_potentially_affected?: number;
}

/**
 * Infrastructure category report
 */
export interface InfrastructureReport extends XARFReport {
  category: 'infrastructure';
  infrastructure_type?: string;
  affected_services?: string[];
}

/**
 * Copyright category report
 */
export interface CopyrightReport extends XARFReport {
  category: 'copyright';
  copyright_holder?: string;
  infringing_content?: string;
  original_content?: string;
}

/**
 * Vulnerability category report
 */
export interface VulnerabilityReport extends XARFReport {
  category: 'vulnerability';
  cve_id?: string;
  vulnerability_type?: string;
  affected_software?: string;
  affected_version?: string;
}

/**
 * Reputation category report
 */
export interface ReputationReport extends XARFReport {
  category: 'reputation';
  reputation_score?: number;
  blocklists?: string[];
}

/**
 * Other category report
 */
export interface OtherReport extends XARFReport {
  category: 'other';
}

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
  | ReputationReport
  | OtherReport;
