/**
 * Bundled XARF schemas — browser-compatible static imports.
 *
 * All schemas are imported at build time and exported as a keyed map,
 * eliminating any runtime filesystem access.
 *
 * To update schemas to a newer spec version, run:
 *   npm run fetch-schemas
 * then commit the updated files under src/schemas/.
 */

import xarfCore from './schemas/xarf-core.json';
import xarfMaster from './schemas/xarf-v4-master.json';
import connectionDdos from './schemas/types/connection-ddos.json';
import connectionInfectedHost from './schemas/types/connection-infected-host.json';
import connectionLoginAttack from './schemas/types/connection-login-attack.json';
import connectionPortScan from './schemas/types/connection-port-scan.json';
import connectionReconnaissance from './schemas/types/connection-reconnaissance.json';
import connectionScraping from './schemas/types/connection-scraping.json';
import connectionSqlInjection from './schemas/types/connection-sql-injection.json';
import connectionVulnerabilityScan from './schemas/types/connection-vulnerability-scan.json';
import contentBase from './schemas/types/content-base.json';
import contentBrandInfringement from './schemas/types/content-brand_infringement.json';
import contentCsam from './schemas/types/content-csam.json';
import contentCsem from './schemas/types/content-csem.json';
import contentExposedData from './schemas/types/content-exposed-data.json';
import contentFraud from './schemas/types/content-fraud.json';
import contentMalware from './schemas/types/content-malware.json';
import contentPhishing from './schemas/types/content-phishing.json';
import contentRemoteCompromise from './schemas/types/content-remote_compromise.json';
import contentSuspiciousRegistration from './schemas/types/content-suspicious_registration.json';
import copyrightCopyright from './schemas/types/copyright-copyright.json';
import copyrightCyberlocker from './schemas/types/copyright-cyberlocker.json';
import copyrightLinkSite from './schemas/types/copyright-link-site.json';
import copyrightP2p from './schemas/types/copyright-p2p.json';
import copyrightUgcPlatform from './schemas/types/copyright-ugc-platform.json';
import copyrightUsenet from './schemas/types/copyright-usenet.json';
import infrastructureBotnet from './schemas/types/infrastructure-botnet.json';
import infrastructureCompromisedServer from './schemas/types/infrastructure-compromised-server.json';
import messagingBulkMessaging from './schemas/types/messaging-bulk-messaging.json';
import messagingSpam from './schemas/types/messaging-spam.json';
import reputationBlocklist from './schemas/types/reputation-blocklist.json';
import reputationThreatIntelligence from './schemas/types/reputation-threat-intelligence.json';
import vulnerabilityCve from './schemas/types/vulnerability-cve.json';
import vulnerabilityMisconfiguration from './schemas/types/vulnerability-misconfiguration.json';
import vulnerabilityOpenService from './schemas/types/vulnerability-open-service.json';

/**
 * All bundled schemas keyed by path relative to the schemas root.
 * Core schemas use keys like 'xarf-core.json'.
 * Type schemas use keys like 'types/messaging-spam.json'.
 */
export const bundledSchemas: Record<string, Record<string, unknown>> = {
  'xarf-core.json': xarfCore as Record<string, unknown>,
  'xarf-v4-master.json': xarfMaster as Record<string, unknown>,
  'types/connection-ddos.json': connectionDdos as Record<string, unknown>,
  'types/connection-infected-host.json': connectionInfectedHost as Record<string, unknown>,
  'types/connection-login-attack.json': connectionLoginAttack as Record<string, unknown>,
  'types/connection-port-scan.json': connectionPortScan as Record<string, unknown>,
  'types/connection-reconnaissance.json': connectionReconnaissance as Record<string, unknown>,
  'types/connection-scraping.json': connectionScraping as Record<string, unknown>,
  'types/connection-sql-injection.json': connectionSqlInjection as Record<string, unknown>,
  'types/connection-vulnerability-scan.json': connectionVulnerabilityScan as Record<
    string,
    unknown
  >,
  'types/content-base.json': contentBase as Record<string, unknown>,
  'types/content-brand_infringement.json': contentBrandInfringement as Record<string, unknown>,
  'types/content-csam.json': contentCsam as Record<string, unknown>,
  'types/content-csem.json': contentCsem as Record<string, unknown>,
  'types/content-exposed-data.json': contentExposedData as Record<string, unknown>,
  'types/content-fraud.json': contentFraud as Record<string, unknown>,
  'types/content-malware.json': contentMalware as Record<string, unknown>,
  'types/content-phishing.json': contentPhishing as Record<string, unknown>,
  'types/content-remote_compromise.json': contentRemoteCompromise as Record<string, unknown>,
  'types/content-suspicious_registration.json': contentSuspiciousRegistration as Record<
    string,
    unknown
  >,
  'types/copyright-copyright.json': copyrightCopyright as Record<string, unknown>,
  'types/copyright-cyberlocker.json': copyrightCyberlocker as Record<string, unknown>,
  'types/copyright-link-site.json': copyrightLinkSite as Record<string, unknown>,
  'types/copyright-p2p.json': copyrightP2p as Record<string, unknown>,
  'types/copyright-ugc-platform.json': copyrightUgcPlatform as Record<string, unknown>,
  'types/copyright-usenet.json': copyrightUsenet as Record<string, unknown>,
  'types/infrastructure-botnet.json': infrastructureBotnet as Record<string, unknown>,
  'types/infrastructure-compromised-server.json': infrastructureCompromisedServer as Record<
    string,
    unknown
  >,
  'types/messaging-bulk-messaging.json': messagingBulkMessaging as Record<string, unknown>,
  'types/messaging-spam.json': messagingSpam as Record<string, unknown>,
  'types/reputation-blocklist.json': reputationBlocklist as Record<string, unknown>,
  'types/reputation-threat-intelligence.json': reputationThreatIntelligence as Record<
    string,
    unknown
  >,
  'types/vulnerability-cve.json': vulnerabilityCve as Record<string, unknown>,
  'types/vulnerability-misconfiguration.json': vulnerabilityMisconfiguration as Record<
    string,
    unknown
  >,
  'types/vulnerability-open-service.json': vulnerabilityOpenService as Record<string, unknown>,
};
