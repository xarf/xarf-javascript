/**
 * Valid report fixtures for all 32 XARF v4 category+type combinations.
 *
 * Each fixture includes only the fields required by the type's JSON schema
 * (plus core required fields). Used by schema-validation tests to verify
 * that every type passes validation.
 */

import type { XARFReport } from '../src/types';

const base = {
  xarf_version: '4.2.0',
  report_id: '550e8400-e29b-41d4-a716-446655440000',
  timestamp: '2024-01-15T14:30:25Z',
  reporter: {
    org: 'Security Corp',
    contact: 'abuse@security.example',
    domain: 'security.example',
  },
  sender: {
    org: 'Security Corp',
    contact: 'abuse@security.example',
    domain: 'security.example',
  },
  source_identifier: '192.0.2.100',
  source_port: 12345,
} as const;

// -- connection (8 types) --------------------------------------------------

const connectionBase = {
  ...base,
  category: 'connection' as const,
  protocol: 'tcp' as const,
  first_seen: '2024-01-15T09:00:00Z',
};

const connectionDdos: XARFReport = { ...connectionBase, type: 'ddos' };
const connectionInfectedHost: XARFReport = {
  ...connectionBase,
  type: 'infected_host',
  bot_type: 'malicious',
};
const connectionLoginAttack: XARFReport = { ...connectionBase, type: 'login_attack' };
const connectionPortScan: XARFReport = { ...connectionBase, type: 'port_scan' };
const connectionReconnaissance: XARFReport = {
  ...connectionBase,
  type: 'reconnaissance',
  probed_resources: ['/.env', '/.git/config'],
};
const connectionScraping: XARFReport = {
  ...connectionBase,
  type: 'scraping',
  total_requests: 5000,
};
const connectionSqlInjection: XARFReport = { ...connectionBase, type: 'sql_injection' };
const connectionVulnerabilityScan: XARFReport = {
  ...connectionBase,
  type: 'vulnerability_scan',
  scan_type: 'port_scan',
  protocol: 'tcp',
};

// -- content (9 types) -----------------------------------------------------

const contentBase = {
  ...base,
  category: 'content' as const,
  url: 'http://malicious.example.com/page',
};

const contentPhishing: XARFReport = { ...contentBase, type: 'phishing' };
const contentMalware: XARFReport = { ...contentBase, type: 'malware' };
const contentCsam: XARFReport = {
  ...contentBase,
  type: 'csam',
  classification: 'baseline',
  detection_method: 'hash_match',
};
const contentCsem: XARFReport = {
  ...contentBase,
  type: 'csem',
  exploitation_type: 'distribution',
  detection_method: 'user_report',
};
const contentExposedData: XARFReport = {
  ...contentBase,
  type: 'exposed_data',
  data_types: ['credentials'],
  exposure_method: 'misconfigured_server',
};
const contentBrandInfringement: XARFReport = {
  ...contentBase,
  type: 'brand_infringement',
  infringement_type: 'typosquatting',
  legitimate_site: 'http://legitimate.example.com',
};
const contentFraud: XARFReport = {
  ...contentBase,
  type: 'fraud',
  fraud_type: 'investment',
};
const contentRemoteCompromise: XARFReport = {
  ...contentBase,
  type: 'remote_compromise',
  compromise_type: 'webshell',
};
const contentSuspiciousRegistration: XARFReport = {
  ...contentBase,
  type: 'suspicious_registration',
  registration_date: '2024-01-10T00:00:00Z',
  suspicious_indicators: ['typosquatting'],
};

// -- messaging (2 types) ---------------------------------------------------

const messagingBase = {
  ...base,
  category: 'messaging' as const,
  protocol: 'smtp' as const,
  smtp_from: 'spammer@evil.example',
  source_port: 25,
};

const messagingSpam: XARFReport = { ...messagingBase, type: 'spam' };
const messagingBulkMessaging: XARFReport = {
  ...messagingBase,
  type: 'bulk_messaging',
  recipient_count: 5000,
};

// -- infrastructure (2 types) ----------------------------------------------

const infrastructureBase = {
  ...base,
  category: 'infrastructure' as const,
};

const infrastructureBotnet: XARFReport = {
  ...infrastructureBase,
  type: 'botnet',
  compromise_evidence: 'C2 communication observed',
};
const infrastructureCompromisedServer: XARFReport = {
  ...infrastructureBase,
  type: 'compromised_server',
  compromise_method: 'Exploited CVE-2024-1234',
};

// -- copyright (6 types) ---------------------------------------------------

const copyrightBase = {
  ...base,
  category: 'copyright' as const,
};

const copyrightCopyright: XARFReport = {
  ...copyrightBase,
  type: 'copyright',
  infringing_url: 'http://pirate.example.com/content',
};
const copyrightCyberlocker: XARFReport = {
  ...copyrightBase,
  type: 'cyberlocker',
  infringing_url: 'http://cyberlocker.example.com/file/123',
  hosting_service: 'MegaUpload',
};
const copyrightLinkSite: XARFReport = {
  ...copyrightBase,
  type: 'link_site',
  infringing_url: 'http://links.example.com/movie',
  site_name: 'PirateLinks',
};
const copyrightP2p: XARFReport = {
  ...copyrightBase,
  type: 'p2p',
  p2p_protocol: 'bittorrent',
  swarm_info: {
    info_hash: 'aabbccddee11223344556677889900aabbccddee',
  },
};
const copyrightUgcPlatform: XARFReport = {
  ...copyrightBase,
  type: 'ugc_platform',
  infringing_url: 'http://video.example.com/watch/456',
  platform_name: 'VideoShare',
};
const copyrightUsenet: XARFReport = {
  ...copyrightBase,
  type: 'usenet',
  newsgroup: 'alt.binaries.test',
  message_info: {
    message_id: '<abc123@news.example.com>',
  },
};

// -- vulnerability (3 types) -----------------------------------------------

const vulnerabilityBase = {
  ...base,
  category: 'vulnerability' as const,
};

const vulnerabilityCve: XARFReport = {
  ...vulnerabilityBase,
  type: 'cve',
  service: 'Apache HTTP Server',
  service_port: 80,
  cve_id: 'CVE-2021-44228',
};
const vulnerabilityMisconfiguration: XARFReport = {
  ...vulnerabilityBase,
  type: 'misconfiguration',
  service: 'nginx',
};
const vulnerabilityOpenService: XARFReport = {
  ...vulnerabilityBase,
  type: 'open_service',
  service: 'memcached',
};

// -- reputation (2 types) --------------------------------------------------

const reputationBase = {
  ...base,
  category: 'reputation' as const,
};

const reputationBlocklist: XARFReport = {
  ...reputationBase,
  type: 'blocklist',
  threat_type: 'spam_source',
};
const reputationThreatIntelligence: XARFReport = {
  ...reputationBase,
  type: 'threat_intelligence',
  threat_type: 'malware_distribution',
};

// -- exports ---------------------------------------------------------------

/**
 * All 32 valid report fixtures keyed by "category/type".
 */
export const validReports: Record<string, XARFReport> = {
  'connection/ddos': connectionDdos,
  'connection/infected_host': connectionInfectedHost,
  'connection/login_attack': connectionLoginAttack,
  'connection/port_scan': connectionPortScan,
  'connection/reconnaissance': connectionReconnaissance,
  'connection/scraping': connectionScraping,
  'connection/sql_injection': connectionSqlInjection,
  'connection/vulnerability_scan': connectionVulnerabilityScan,
  'content/phishing': contentPhishing,
  'content/malware': contentMalware,
  'content/csam': contentCsam,
  'content/csem': contentCsem,
  'content/exposed_data': contentExposedData,
  'content/brand_infringement': contentBrandInfringement,
  'content/fraud': contentFraud,
  'content/remote_compromise': contentRemoteCompromise,
  'content/suspicious_registration': contentSuspiciousRegistration,
  'messaging/spam': messagingSpam,
  'messaging/bulk_messaging': messagingBulkMessaging,
  'infrastructure/botnet': infrastructureBotnet,
  'infrastructure/compromised_server': infrastructureCompromisedServer,
  'copyright/copyright': copyrightCopyright,
  'copyright/cyberlocker': copyrightCyberlocker,
  'copyright/link_site': copyrightLinkSite,
  'copyright/p2p': copyrightP2p,
  'copyright/ugc_platform': copyrightUgcPlatform,
  'copyright/usenet': copyrightUsenet,
  'vulnerability/cve': vulnerabilityCve,
  'vulnerability/misconfiguration': vulnerabilityMisconfiguration,
  'vulnerability/open_service': vulnerabilityOpenService,
  'reputation/blocklist': reputationBlocklist,
  'reputation/threat_intelligence': reputationThreatIntelligence,
};

/**
 * Helper to get a deep copy of a fixture (safe to mutate in tests).
 * @param key
 */
export function getReport(key: string): XARFReport {
  const report = validReports[key];
  if (!report) {
    throw new Error(`Unknown fixture key: ${key}`);
  }
  return JSON.parse(JSON.stringify(report)) as XARFReport;
}
