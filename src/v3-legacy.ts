/**
 * XARF v3 Legacy Support and Conversion
 *
 * Provides backward compatibility with XARF v3 format reports.
 * Automatically converts v3 reports to v4 format.
 */

import type { XARFReport, XARFCategory, XARFEvidence, EvidenceSource } from './types';

/**
 * XARF v3 ReporterInfo structure
 */
export interface XARFv3ReporterInfo {
  ReporterOrg?: string;
  ReporterOrgDomain?: string;
  ReporterOrgEmail: string;
  ReporterContactEmail?: string;
  ReporterContactName?: string;
  ReporterContactPhone?: string;
}

/**
 * XARF v3 Source structure
 */
export interface XARFv3Source {
  IP?: string;
  Port?: number;
  Type?: string;
}

/**
 * XARF v3 Attachment/Evidence structure
 */
export interface XARFv3Attachment {
  ContentType: string;
  Data: string;
  Description?: string;
}

/**
 * XARF v3 Report structure
 */
export interface XARFv3Report {
  Version: string;
  ReporterInfo: XARFv3ReporterInfo;
  Disclosure?: boolean;
  Report: {
    ReportCategory?: string;
    ReportType: string;
    Date: string;
    Source?: XARFv3Source;
    SourceIp?: string;
    SourcePort?: number;
    DestinationIp?: string;
    DestinationPort?: number;
    Protocol?: string;
    SmtpMailFromAddress?: string;
    SmtpRcptToAddress?: string;
    SmtpMessageSubject?: string;
    Url?: string;
    UserAgent?: string;
    AttackDescription?: string;
    AttackCount?: number;
    Attachment?: XARFv3Attachment[];
    Samples?: XARFv3Attachment[];
    AdditionalInfo?: Record<string, unknown>;
  };
  [key: string]: unknown;
}

/**
 * Mapping of v3 report types to v4 category and type
 */
const V3_TYPE_MAPPING: Record<string, { category: XARFCategory; type: string }> = {
  Spam: { category: 'messaging', type: 'spam' },
  spam: { category: 'messaging', type: 'spam' },
  'Login-Attack': { category: 'connection', type: 'login_attack' },
  'login-attack': { category: 'connection', type: 'login_attack' },
  'Port-Scan': { category: 'connection', type: 'port_scan' },
  'port-scan': { category: 'connection', type: 'port_scan' },
  DDoS: { category: 'connection', type: 'ddos' },
  ddos: { category: 'connection', type: 'ddos' },
  Phishing: { category: 'content', type: 'phishing' },
  phishing: { category: 'content', type: 'phishing' },
  Malware: { category: 'content', type: 'malware' },
  malware: { category: 'content', type: 'malware' },
  Botnet: { category: 'infrastructure', type: 'botnet' },
  botnet: { category: 'infrastructure', type: 'botnet' },
  Copyright: { category: 'copyright', type: 'copyright' },
  copyright: { category: 'copyright', type: 'copyright' },
};

/**
 * Detect if a report is XARF v3 format
 * @param data - Parsed JSON data to check for XARF v3 structure
 * @returns True if data contains XARF v3 format indicators
 */
export function isXARFv3(data: Record<string, unknown>): boolean {
  return (
    'Version' in data &&
    typeof data.Version === 'string' &&
    (data.Version === '3' || data.Version === '3.0' || data.Version === '3.0.0') &&
    'ReporterInfo' in data &&
    'Report' in data
  );
}

/**
 * Convert v3 evidence/attachment to v4 format
 * @param v3Attachments - Array of XARF v3 attachment objects
 * @returns Array of XARF v4 evidence objects, or undefined if no attachments
 */
function convertEvidence(v3Attachments?: XARFv3Attachment[]): XARFEvidence[] | undefined {
  if (!v3Attachments || v3Attachments.length === 0) {
    return undefined;
  }

  return v3Attachments.map((attachment) => ({
    content_type: attachment.ContentType,
    description: attachment.Description || 'Evidence from v3 report',
    payload: attachment.Data,
  }));
}

/**
 * Generate a UUID v4 for the converted report
 * @returns UUID v4 string
 */
function generateUUID(): string {
  // Simple UUID v4 generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Convert XARF v3 report to v4 format
 * @param v3Report - XARF v3 report object
 * @param warnings - Array to collect conversion warnings
 * @returns Converted XARF v4 report
 */
export function convertV3toV4(v3Report: XARFv3Report, warnings?: string[]): XARFReport {
  const report = v3Report.Report;

  // Map v3 ReportType to v4 category and type
  const typeMapping = V3_TYPE_MAPPING[report.ReportType];
  if (!typeMapping) {
    // Unknown v3 types map to 'content' category with 'unclassified' type
    const defaultMapping = { category: 'content' as XARFCategory, type: 'unclassified' };
    warnings?.push(
      `Unknown v3 ReportType '${report.ReportType}', mapping to category='content', type='unclassified'`
    );
    return convertWithMapping(v3Report, defaultMapping, warnings);
  }

  return convertWithMapping(v3Report, typeMapping, warnings);
}

/**
 * Extract source identifier from v3 report
 * @param report - V3 report data
 * @param warnings - Optional warnings array
 * @returns Source identifier string
 */
function extractSourceIdentifier(report: XARFv3Report['Report'], warnings?: string[]): string {
  if (report.Source?.IP) {
    return report.Source.IP;
  }
  if (report.SourceIp) {
    return report.SourceIp;
  }
  warnings?.push('No source IP found in v3 report, using "unknown" as source_identifier');
  return 'unknown';
}

/**
 * Extract contact info from v3 reporter info
 * @param reporterInfo - V3 reporter info
 * @returns Contact info object
 */
function extractContactInfo(reporterInfo: XARFv3ReporterInfo): {
  org: string;
  contact: string;
  domain: string;
} {
  const contact = reporterInfo.ReporterContactEmail || reporterInfo.ReporterOrgEmail;
  const domain = contact.split('@')[1] || 'unknown.com';
  const org = reporterInfo.ReporterOrg || 'Unknown Organization';
  return { org, contact, domain };
}

/**
 * Add category-specific fields to v4 report
 * @param v4Report - V4 report to modify
 * @param category - Report category
 * @param v3Report - Original v3 report
 * @param sourceIdentifier - Source identifier
 * @param evidence - Converted evidence array
 */
function addCategorySpecificFields(
  v4Report: XARFReport,
  category: XARFCategory,
  v3Report: XARFv3Report['Report'],
  sourceIdentifier: string,
  evidence?: XARFEvidence[]
): void {
  if (category === 'messaging') {
    addMessagingFields(v4Report, v3Report);
  } else if (category === 'connection') {
    addConnectionFields(v4Report, v3Report);
  } else if (category === 'content') {
    addContentFields(v4Report, v3Report, sourceIdentifier, evidence);
  }
}

/**
 * Add messaging-specific fields to v4 report
 * @param v4Report - V4 report to modify
 * @param v3Report - Original v3 report
 */
function addMessagingFields(v4Report: XARFReport, v3Report: XARFv3Report['Report']): void {
  Object.assign(v4Report, {
    protocol: v3Report.Protocol || v3Report.AdditionalInfo?.Protocol || 'smtp',
    smtp_from: v3Report.SmtpMailFromAddress || v3Report.AdditionalInfo?.SMTPFrom,
    smtp_to: v3Report.SmtpRcptToAddress,
    subject: v3Report.SmtpMessageSubject || v3Report.AdditionalInfo?.Subject,
    source_port: v3Report.Source?.Port || v3Report.SourcePort,
  });
}

/**
 * Add connection-specific fields to v4 report
 * @param v4Report - V4 report to modify
 * @param v3Report - Original v3 report
 */
function addConnectionFields(v4Report: XARFReport, v3Report: XARFv3Report['Report']): void {
  Object.assign(v4Report, {
    destination_ip: v3Report.DestinationIp || 'unknown',
    protocol: v3Report.Protocol || 'tcp',
    // source_port is required when source_identifier is an IP (min value is 1)
    source_port: v3Report.Source?.Port || v3Report.SourcePort || 1,
    destination_port: v3Report.DestinationPort,
    attempt_count: v3Report.AttackCount,
    // first_seen is required for connection types in v4
    first_seen: v3Report.Date,
  });
}

/**
 * Add content-specific fields to v4 report
 * @param v4Report - V4 report to modify
 * @param v3Report - Original v3 report
 * @param sourceIdentifier - Source identifier for URL fallback
 * @param evidence - Converted evidence array for content type
 */
function addContentFields(
  v4Report: XARFReport,
  v3Report: XARFv3Report['Report'],
  sourceIdentifier: string,
  evidence?: XARFEvidence[]
): void {
  Object.assign(v4Report, {
    url: v3Report.Url || `http://${sourceIdentifier}`,
    content_type: evidence?.[0]?.content_type || 'text/html',
  });
}

/**
 * Internal conversion helper
 * @param v3Report - XARF v3 report object to convert
 * @param mapping - Category and type mapping configuration
 * @param mapping.category - XARF v4 category to map to
 * @param mapping.type - XARF v4 type to map to
 * @param warnings - Optional array to collect conversion warnings
 * @returns Converted XARF v4 report
 */
function convertWithMapping(
  v3Report: XARFv3Report,
  mapping: { category: XARFCategory; type: string },
  warnings?: string[]
): XARFReport {
  const report = v3Report.Report;
  const reporterInfo = v3Report.ReporterInfo;

  const sourceIdentifier = extractSourceIdentifier(report, warnings);
  // Only set evidence_source if explicitly provided in v3 report - it's optional in v4
  const evidenceSource = report.AdditionalInfo?.DetectionMethod as string | undefined;
  const evidence = convertEvidence(report.Attachment || report.Samples);
  const contactInfo = extractContactInfo(reporterInfo);

  const v4Report: XARFReport & { _internal?: Record<string, unknown> } = {
    xarf_version: '4.0.0',
    report_id: generateUUID(),
    timestamp: report.Date,
    reporter: contactInfo,
    sender: contactInfo,
    source_identifier: sourceIdentifier,
    category: mapping.category,
    type: mapping.type,
    description: report.AttackDescription,
    evidence,
    _internal: {
      legacy_version: '3',
      original_report_type: report.ReportType,
      converted_at: new Date().toISOString(),
    },
  };

  // Only add evidence_source if explicitly provided
  if (evidenceSource) {
    v4Report.evidence_source = evidenceSource as EvidenceSource;
  }

  addCategorySpecificFields(v4Report, mapping.category, report, sourceIdentifier, evidence);

  return v4Report;
}

/**
 * Get deprecation warning message for v3 reports
 * @returns Formatted deprecation warning message
 */
export function getV3DeprecationWarning(): string {
  return [
    'DEPRECATION WARNING: XARF v3 format detected.',
    'The v3 format has been automatically converted to v4.',
    'Please update your systems to generate v4 reports directly.',
    'v3 support will be removed in a future major version.',
  ].join(' ');
}
