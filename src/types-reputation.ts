/**
 * XARF v4 Reputation Category Type Definitions
 */
import type { XARFReport } from './types';

/**
 * Reputation category base report (shared fields across all reputation types)
 */
export interface ReputationBaseReport extends XARFReport {
  category: 'reputation';
  threat_type: string;
}

/**
 * Reputation - Blocklist
 */
export interface BlocklistReport extends ReputationBaseReport {
  type: 'blocklist';
}

/**
 * Reputation - Threat Intelligence
 */
export interface ThreatIntelligenceReport extends ReputationBaseReport {
  type: 'threat_intelligence';
}

/**
 * Reputation category report (union of all reputation types)
 */
export type ReputationReport = BlocklistReport | ThreatIntelligenceReport;
