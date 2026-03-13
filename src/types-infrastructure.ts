/**
 * XARF v4 Infrastructure Category Type Definitions
 */
import type { XARFReport } from './types';

/**
 * Infrastructure category base report
 */
export interface InfrastructureBaseReport extends XARFReport {
  category: 'infrastructure';
}

/**
 * Infrastructure - Botnet
 */
export interface BotnetReport extends InfrastructureBaseReport {
  type: 'botnet';
  compromise_evidence: string;
  bot_capabilities?: string[];
  c2_protocol?: string;
  c2_server?: string;
  malware_family?: string;
}

/**
 * Infrastructure - Compromised Server
 */
export interface CompromisedServerReport extends InfrastructureBaseReport {
  type: 'compromised_server';
  compromise_method: string;
}

/**
 * Infrastructure category report (union of all infrastructure types)
 */
export type InfrastructureReport = BotnetReport | CompromisedServerReport;
