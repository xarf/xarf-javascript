/**
 * XARF v3 Legacy Support and Conversion
 *
 * Provides backward compatibility with XARF v3 format reports.
 * Automatically converts v3 reports to v4 format.
 */

import type { XARFReport, XARFCategory, XARFEvidence } from './types';

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
 *
 * @param v3Report - XARF v3 report object
 * @param warnings - Array to collect conversion warnings
 * @returns Converted XARF v4 report
 */
export function convertV3toV4(v3Report: XARFv3Report, warnings?: string[]): XARFReport {
  const report = v3Report.Report;

  // Map v3 ReportType to v4 category and type
  const typeMapping = V3_TYPE_MAPPING[report.ReportType];
  if (!typeMapping) {
    const defaultMapping = { category: 'other' as XARFCategory, type: 'unclassified' };
    warnings?.push(
      `Unknown v3 ReportType '${report.ReportType}', mapping to category='other', type='unclassified'`
    );
    return convertWithMapping(v3Report, defaultMapping, warnings);
  }

  return convertWithMapping(v3Report, typeMapping, warnings);
}

/**
 * Internal conversion helper
 */
function convertWithMapping(
  v3Report: XARFv3Report,
  mapping: { category: XARFCategory; type: string },
  warnings?: string[]
): XARFReport {
  const report = v3Report.Report;
  const reporterInfo = v3Report.ReporterInfo;

  // Determine source identifier
  let sourceIdentifier: string;
  if (report.Source?.IP) {
    sourceIdentifier = report.Source.IP;
  } else if (report.SourceIp) {
    sourceIdentifier = report.SourceIp;
  } else {
    sourceIdentifier = 'unknown';
    warnings?.push('No source IP found in v3 report, using "unknown" as source_identifier');
  }

  // Determine evidence source based on v3 fields
  let evidenceSource: string = 'manual_analysis'; // Default for v3
  if (report.AdditionalInfo?.DetectionMethod) {
    evidenceSource = String(report.AdditionalInfo.DetectionMethod);
  }

  // Convert evidence
  const evidence = convertEvidence(report.Attachment || report.Samples);

  // Build base v4 report
  const v4Report: XARFReport & { _internal?: Record<string, unknown> } = {
    xarf_version: '4.0.0',
    report_id: generateUUID(),
    timestamp: report.Date,
    reporter: {
      org: reporterInfo.ReporterOrg,
      contact: reporterInfo.ReporterContactEmail || reporterInfo.ReporterOrgEmail,
      type: 'manual', // v3 reports are typically manual
    },
    source_identifier: sourceIdentifier,
    category: mapping.category,
    type: mapping.type,
    evidence_source: evidenceSource as any,
    description: report.AttackDescription,
    evidence,
    _internal: {
      legacy_version: '3',
      original_report_type: report.ReportType,
      converted_at: new Date().toISOString(),
    },
  };

  // Add category-specific fields
  if (mapping.category === 'messaging') {
    Object.assign(v4Report, {
      protocol: report.Protocol || report.AdditionalInfo?.Protocol || 'smtp',
      smtp_from: report.SmtpMailFromAddress || report.AdditionalInfo?.SMTPFrom,
      smtp_to: report.SmtpRcptToAddress,
      subject: report.SmtpMessageSubject || report.AdditionalInfo?.Subject,
      source_port: report.Source?.Port || report.SourcePort,
    });
  } else if (mapping.category === 'connection') {
    Object.assign(v4Report, {
      destination_ip: report.DestinationIp || 'unknown',
      protocol: report.Protocol || 'tcp',
      source_port: report.Source?.Port || report.SourcePort,
      destination_port: report.DestinationPort,
      attempt_count: report.AttackCount,
    });
  } else if (mapping.category === 'content') {
    Object.assign(v4Report, {
      url: report.Url || `http://${sourceIdentifier}`,
      content_type: evidence?.[0]?.content_type || 'text/html',
    });
  }

  return v4Report;
}

/**
 * Get deprecation warning message for v3 reports
 */
export function getV3DeprecationWarning(): string {
  return [
    'DEPRECATION WARNING: XARF v3 format detected.',
    'The v3 format has been automatically converted to v4.',
    'Please update your systems to generate v4 reports directly.',
    'v3 support will be removed in a future major version.',
  ].join(' ');
}
