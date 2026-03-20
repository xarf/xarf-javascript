/**
 * XARF v4 Connection Category Type Definitions
 */
import type { XARFReport } from './types';

/**
 * Connection category base report (shared fields across all connection types)
 */
export interface ConnectionBaseReport extends XARFReport {
  category: 'connection';
  first_seen: string;
  protocol: string;
  destination_ip?: string;
  destination_port?: number;
  last_seen?: string;
}

/**
 * Connection - Login Attack
 */
export interface LoginAttackReport extends ConnectionBaseReport {
  type: 'login_attack';
}

/**
 * Connection - Port Scan
 */
export interface PortScanReport extends ConnectionBaseReport {
  type: 'port_scan';
}

/**
 * Connection - DDoS
 */
export interface DdosReport extends ConnectionBaseReport {
  type: 'ddos';
  amplification_factor?: number;
  attack_vector?: string;
  duration_seconds?: number;
  mitigation_applied?: boolean;
  peak_bps?: number;
  peak_pps?: number;
  service_impact?: string;
  threshold_exceeded?: string;
}

/**
 * Connection - Infected Host
 */
export interface InfectedHostReport extends ConnectionBaseReport {
  type: 'infected_host';
  bot_type: string;
  accepts_cookies?: boolean;
  api_endpoints_accessed?: string[];
  behavior_pattern?: string;
  bot_name?: string;
  follows_crawl_delay?: boolean;
  javascript_execution?: boolean;
  request_rate?: number;
  respects_robots_txt?: boolean;
  total_requests?: number;
  user_agent?: string;
  verification_status?: string;
}

/**
 * Connection - Reconnaissance
 */
export interface ReconnaissanceReport extends ConnectionBaseReport {
  type: 'reconnaissance';
  probed_resources: string[];
  automated_tool?: boolean;
  http_methods?: string[];
  resource_categories?: string[];
  response_codes?: number[];
  successful_probes?: string[];
  total_probes?: number;
  user_agent?: string;
}

/**
 * Connection - Scraping
 */
export interface ScrapingReport extends ConnectionBaseReport {
  type: 'scraping';
  total_requests: number;
  bot_signature?: string;
  concurrent_connections?: number;
  data_volume?: number;
  request_rate?: number;
  respects_robots_txt?: boolean;
  scraping_pattern?: string;
  session_duration?: number;
  target_content?: string;
  unique_urls?: number;
  user_agent?: string;
}

/**
 * Connection - SQL Injection
 */
export interface SqlInjectionReport extends ConnectionBaseReport {
  type: 'sql_injection';
  attack_technique?: string;
  attempts_count?: number;
  http_method?: string;
  injection_point?: string;
  payload_sample?: string;
  target_url?: string;
}

/**
 * Connection - Vulnerability Scan
 */
export interface VulnerabilityScanReport extends ConnectionBaseReport {
  type: 'vulnerability_scan';
  scan_type: string;
  scan_rate?: number;
  scanner_signature?: string;
  targeted_ports?: number[];
  targeted_services?: string[];
  total_requests?: number;
  user_agent?: string;
  vulnerabilities_probed?: string[];
}

/**
 * Connection category report (union of all connection types)
 */
export type ConnectionReport =
  | LoginAttackReport
  | PortScanReport
  | DdosReport
  | InfectedHostReport
  | ReconnaissanceReport
  | ScrapingReport
  | SqlInjectionReport
  | VulnerabilityScanReport;
