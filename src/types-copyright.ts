/**
 * XARF v4 Copyright Category Type Definitions
 */
import type { XARFReport } from './types';

/**
 * Copyright category base report (shared fields across all copyright types)
 */
export interface CopyrightBaseReport extends XARFReport {
  category: 'copyright';
  rights_holder?: string;
  work_category?: string;
  work_title?: string;
}

/**
 * Copyright - Copyright (direct infringement / DMCA)
 */
export interface CopyrightCopyrightReport extends CopyrightBaseReport {
  type: 'copyright';
  infringing_url: string;
  infringement_type?: string;
  original_url?: string;
}

/**
 * P2P swarm information (info_hash or magnet_uri required at runtime via AJV)
 */
export interface SwarmInfo {
  info_hash?: string;
  magnet_uri?: string;
  torrent_name?: string;
  file_count?: number;
  total_size?: number;
}

/**
 * Copyright - P2P
 */
export interface CopyrightP2pReport extends CopyrightBaseReport {
  type: 'p2p';
  p2p_protocol: string;
  detection_method?: string;
  peer_info?: Record<string, unknown>;
  release_date?: string;
  swarm_info: SwarmInfo;
}

/**
 * Copyright - Cyberlocker
 */
export interface CopyrightCyberlockerReport extends CopyrightBaseReport {
  type: 'cyberlocker';
  hosting_service: string;
  infringing_url: string;
  access_method?: string;
  file_info?: Record<string, unknown>;
  takedown_info?: Record<string, unknown>;
  uploader_info?: Record<string, unknown>;
}

/**
 * Copyright - UGC Platform
 */
export interface CopyrightUgcPlatformReport extends CopyrightBaseReport {
  type: 'ugc_platform';
  infringing_url: string;
  platform_name: string;
  content_info?: Record<string, unknown>;
  infringement_type?: string;
  match_details?: Record<string, unknown>;
  monetization_info?: Record<string, unknown>;
  uploader_info?: Record<string, unknown>;
}

/**
 * Copyright - Link Site
 */
export interface CopyrightLinkSiteReport extends CopyrightBaseReport {
  type: 'link_site';
  infringing_url: string;
  site_name: string;
  link_info?: Record<string, unknown>;
  linked_content?: Array<Record<string, unknown>>;
  search_terms?: string[];
  site_category?: string;
  site_ranking?: Record<string, unknown>;
}

/**
 * Usenet message information
 */
export interface MessageInfo {
  message_id: string;
  subject?: string;
  from_header?: string;
  posting_date?: string;
  part_number?: number;
  total_parts?: number;
  file_size?: number;
}

/**
 * Copyright - Usenet
 */
export interface CopyrightUsenetReport extends CopyrightBaseReport {
  type: 'usenet';
  newsgroup: string;
  detection_method?: string;
  encoding_info?: Record<string, unknown>;
  message_info: MessageInfo;
  nzb_info?: Record<string, unknown>;
  server_info?: Record<string, unknown>;
}

/**
 * Copyright category report (union of all copyright types)
 */
export type CopyrightReport =
  | CopyrightCopyrightReport
  | CopyrightP2pReport
  | CopyrightCyberlockerReport
  | CopyrightUgcPlatformReport
  | CopyrightLinkSiteReport
  | CopyrightUsenetReport;
