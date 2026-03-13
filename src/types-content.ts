/**
 * XARF v4 Content Category Type Definitions
 */
import type { XARFReport } from './types';

/**
 * Content category base report (mirrors content-base.json)
 */
export interface ContentBaseReport extends XARFReport {
  category: 'content';
  url: string;
  domain?: string;
  target_brand?: string;
  verified_at?: string;
  verification_method?: string;
}

/**
 * Content - Phishing
 */
export interface PhishingReport extends ContentBaseReport {
  type: 'phishing';
  cloned_site?: string;
  credential_fields?: string[];
  lure_type?: string;
  submission_url?: string;
}

/**
 * Content - Malware
 */
export interface MalwareReport extends ContentBaseReport {
  type: 'malware';
  distribution_method?: string;
  file_hashes?: Record<string, string>;
  malware_family?: string;
  malware_type?: string;
}

/**
 * Content - CSAM
 */
export interface CsamReport extends ContentBaseReport {
  type: 'csam';
  classification: string;
  detection_method: string;
  content_removed?: boolean;
  hash_values?: Record<string, string>;
  media_type?: string;
  ncmec_report_id?: string;
}

/**
 * Content - CSEM
 */
export interface CsemReport extends ContentBaseReport {
  type: 'csem';
  detection_method: string;
  exploitation_type: string;
  evidence_type?: string[];
  platform?: string;
  reporting_obligations?: string[];
  victim_age_range?: string;
}

/**
 * Content - Exposed Data
 */
export interface ExposedDataReport extends ContentBaseReport {
  type: 'exposed_data';
  data_types: string[];
  exposure_method: string;
  affected_organization?: string;
  encryption_status?: string;
  record_count?: number;
  sensitive_fields?: string[];
}

/**
 * Content - Brand Infringement
 */
export interface BrandInfringementReport extends ContentBaseReport {
  type: 'brand_infringement';
  infringement_type: string;
  legitimate_site: string;
  infringing_elements?: string[];
  similarity_score?: number;
}

/**
 * Content - Fraud
 */
export interface FraudReport extends ContentBaseReport {
  type: 'fraud';
  fraud_type: string;
  claimed_entity?: string;
  payment_methods?: string[];
}

/**
 * Content - Remote Compromise
 */
export interface RemoteCompromiseReport extends ContentBaseReport {
  type: 'remote_compromise';
  compromise_type: string;
  affected_cms?: string;
  compromise_indicators?: Array<Record<string, unknown>>;
  malicious_activities?: string[];
  persistence_mechanisms?: string[];
  webshell_details?: Record<string, unknown>;
}

/**
 * Content - Suspicious Registration
 */
export interface SuspiciousRegistrationReport extends ContentBaseReport {
  type: 'suspicious_registration';
  registration_date: string;
  suspicious_indicators: string[];
  days_since_registration?: number;
  predicted_usage?: string[];
  registrant_details?: Record<string, unknown>;
  risk_score?: number;
  targeted_brands?: string[];
}

/**
 * Content category report (union of all content types)
 */
export type ContentReport =
  | PhishingReport
  | MalwareReport
  | CsamReport
  | CsemReport
  | ExposedDataReport
  | BrandInfringementReport
  | FraudReport
  | RemoteCompromiseReport
  | SuspiciousRegistrationReport;
