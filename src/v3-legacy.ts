/**
 * XARF v3 Legacy Support and Conversion
 *
 * Provides backward compatibility with XARF v3 format reports.
 * Automatically converts v3 reports to v4 format.
 */

import type { XARFReport, XARFCategory, XARFEvidence, EvidenceSource } from './types';
import { XARFParseError } from './errors';
import { generateUUID, generateHash, fromBase64 } from './crypto-utils';

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
  URL?: string;
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
 * @param warnings - Optional array to collect conversion warnings
 * @returns Promise resolving to an array of XARF v4 evidence objects, or undefined if no attachments
 */
async function convertEvidence(
  v3Attachments?: XARFv3Attachment[],
  warnings?: string[]
): Promise<XARFEvidence[] | undefined> {
  if (!v3Attachments || v3Attachments.length === 0) {
    return undefined;
  }

  return Promise.all(
    v3Attachments.map(async (attachment) => {
      if (!attachment.Description) {
        warnings?.push('Evidence attachment has no description, omitting field');
      }
      const attachmentBytes = fromBase64(attachment.Data);
      const hashValue = await generateHash(attachmentBytes, 'sha256');
      return {
        content_type: attachment.ContentType,
        ...(attachment.Description ? { description: attachment.Description } : {}),
        payload: attachment.Data,
        hash: `sha256:${hashValue}`,
        size: attachmentBytes.length,
      };
    })
  );
}

/**
 * Convert XARF v3 report to v4 format
 * @param v3Report - XARF v3 report object
 * @param warnings - Array to collect conversion warnings
 * @returns Promise resolving to the converted XARF v4 report
 */
export async function convertV3toV4(
  v3Report: XARFv3Report,
  warnings?: string[]
): Promise<XARFReport> {
  const report = v3Report.Report;

  // Map v3 ReportType to v4 category and type
  const typeMapping = V3_TYPE_MAPPING[report.ReportType];
  if (!typeMapping) {
    throw new XARFParseError(
      `Cannot convert v3 report: unknown ReportType '${report.ReportType}'. ` +
        `Supported types: ${Object.keys(V3_TYPE_MAPPING).join(', ')}`
    );
  }

  return convertWithMapping(v3Report, typeMapping, warnings);
}

/**
 * Extract source identifier from v3 report
 * @param report - V3 report data
 * @returns Source identifier string
 */
function extractSourceIdentifier(report: XARFv3Report['Report']): string {
  if (report.Source?.IP) {
    return report.Source.IP;
  }
  if (report.SourceIp) {
    return report.SourceIp;
  }
  if (report.Source?.URL) {
    return report.Source.URL;
  }
  if (report.Url) {
    return report.Url;
  }
  throw new XARFParseError(
    'Cannot convert v3 report: no source identifier found (expected Source.IP, SourceIp, Source.URL, or Url)'
  );
}

/**
 * Extract contact info from v3 reporter info
 * @param reporterInfo - V3 reporter info
 * @param warnings - Optional array to collect conversion warnings
 * @returns Contact info object
 */
function extractContactInfo(
  reporterInfo: XARFv3ReporterInfo,
  warnings?: string[]
): {
  org: string;
  contact: string;
  domain: string;
} {
  const contact = reporterInfo.ReporterContactEmail || reporterInfo.ReporterOrgEmail;
  if (!contact) {
    throw new XARFParseError(
      'Cannot convert v3 report: missing reporter email (ReporterContactEmail and ReporterOrgEmail are both absent)'
    );
  }
  const domain = contact.split('@')[1];
  if (!domain) {
    throw new XARFParseError(
      `Cannot convert v3 report: reporter email '${contact}' is not a valid email address`
    );
  }
  const org = reporterInfo.ReporterOrg;
  if (!org) {
    warnings?.push('No ReporterOrg found in v3 report, using "Unknown Organization"');
  }
  return { org: org || 'Unknown Organization', contact, domain };
}

/**
 * Add category-specific fields to v4 report
 * @param v4Report - V4 report to modify
 * @param category - Report category
 * @param v3Report - Original v3 report
 */
function addCategorySpecificFields(
  v4Report: XARFReport,
  category: XARFCategory,
  v3Report: XARFv3Report['Report']
): void {
  if (category === 'messaging') {
    addMessagingFields(v4Report, v3Report);
  } else if (category === 'connection') {
    addConnectionFields(v4Report, v3Report);
  } else if (category === 'content') {
    addContentFields(v4Report, v3Report);
  }
}

/**
 * Add messaging-specific fields to v4 report
 * @param v4Report - V4 report to modify
 * @param v3Report - Original v3 report
 */
function addMessagingFields(v4Report: XARFReport, v3Report: XARFv3Report['Report']): void {
  const protocol = v3Report.Protocol || (v3Report.AdditionalInfo?.Protocol as string | undefined);
  if (!protocol) {
    throw new XARFParseError('Cannot convert v3 report: missing protocol for messaging type');
  }
  Object.assign(v4Report, {
    protocol,
    smtp_from: v3Report.SmtpMailFromAddress || v3Report.AdditionalInfo?.SMTPFrom,
    smtp_to: v3Report.SmtpRcptToAddress,
    subject: v3Report.SmtpMessageSubject || v3Report.AdditionalInfo?.Subject,
    ...(v3Report.Source?.Port || v3Report.SourcePort
      ? { source_port: v3Report.Source?.Port || v3Report.SourcePort }
      : {}),
  });
}

/**
 * Add connection-specific fields to v4 report
 * @param v4Report - V4 report to modify
 * @param v3Report - Original v3 report
 */
function addConnectionFields(v4Report: XARFReport, v3Report: XARFv3Report['Report']): void {
  if (!v3Report.Protocol) {
    throw new XARFParseError('Cannot convert v3 report: missing protocol for connection type');
  }
  Object.assign(v4Report, {
    ...(v3Report.DestinationIp ? { destination_ip: v3Report.DestinationIp } : {}),
    protocol: v3Report.Protocol,
    ...(v3Report.Source?.Port || v3Report.SourcePort
      ? { source_port: v3Report.Source?.Port || v3Report.SourcePort }
      : {}),
    ...(v3Report.DestinationPort != null ? { destination_port: v3Report.DestinationPort } : {}),
    // first_seen is required for connection types in v4
    first_seen: v3Report.Date,
    // there is no equivalent to v3's AttackCount that's general across Connection types,
    // so we let it pass through as an additional property
    ...(v3Report.AttackCount != null ? { attack_count: v3Report.AttackCount } : {}),
  });
}

/**
 * Add content-specific fields to v4 report
 * @param v4Report - V4 report to modify
 * @param v3Report - Original v3 report
 */
function addContentFields(v4Report: XARFReport, v3Report: XARFv3Report['Report']): void {
  const url =
    v3Report.Url || (v3Report.AdditionalInfo?.URL as string | undefined) || v3Report.Source?.URL;
  if (!url) {
    throw new XARFParseError(
      `Cannot convert v3 report: missing URL for content type '${v4Report.type}'. Content reports require a URL field`
    );
  }
  Object.assign(v4Report, { url });
}

/**
 * Internal conversion helper
 * @param v3Report - XARF v3 report object to convert
 * @param mapping - Category and type mapping configuration
 * @param mapping.category - XARF v4 category to map to
 * @param mapping.type - XARF v4 type to map to
 * @param warnings - Optional array to collect conversion warnings
 * @returns Promise resolving to the converted XARF v4 report
 */
async function convertWithMapping(
  v3Report: XARFv3Report,
  mapping: { category: XARFCategory; type: string },
  warnings?: string[]
): Promise<XARFReport> {
  const report = v3Report.Report;
  const reporterInfo = v3Report.ReporterInfo;

  const sourceIdentifier = extractSourceIdentifier(report);
  // Only set evidence_source if explicitly provided in v3 report - it's optional in v4
  const evidenceSource = report.AdditionalInfo?.DetectionMethod as string | undefined;
  const evidence = await convertEvidence(report.Attachment || report.Samples, warnings);
  const contactInfo = extractContactInfo(reporterInfo, warnings);

  const v4Report: XARFReport & { _internal?: Record<string, unknown> } = {
    xarf_version: '4.2.0',
    report_id: generateUUID(),
    timestamp: report.Date,
    reporter: contactInfo,
    sender: contactInfo,
    source_identifier: sourceIdentifier,
    category: mapping.category,
    type: mapping.type,
    description: report.AttackDescription,
    evidence,
    legacy_version: '3',
    _internal: {
      original_report_type: report.ReportType,
      converted_at: new Date().toISOString(),
    },
  };

  // Only add evidence_source if explicitly provided
  if (evidenceSource) {
    v4Report.evidence_source = evidenceSource as EvidenceSource;
  }

  addCategorySpecificFields(v4Report, mapping.category, report);

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
