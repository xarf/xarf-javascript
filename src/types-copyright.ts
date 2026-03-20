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
 * P2P peer information
 */
export interface PeerInfo {
  peer_id?: string;
  client_version?: string;
  upload_amount?: number;
  download_amount?: number;
}

/**
 * Copyright - P2P
 */
export interface CopyrightP2pReport extends CopyrightBaseReport {
  type: 'p2p';
  p2p_protocol: string;
  detection_method?: string;
  peer_info?: PeerInfo;
  release_date?: string;
  swarm_info: SwarmInfo;
}

/**
 * Cyberlocker file information
 */
export interface FileInfo {
  filename?: string;
  file_size?: number;
  file_hash?: string;
  upload_date?: string;
  download_count?: number;
}

/**
 * Cyberlocker takedown information
 */
export interface CyberlockerTakedownInfo {
  previous_requests?: number;
  service_response_time?: string;
  automated_removal?: boolean;
}

/**
 * Cyberlocker uploader information
 */
export interface CyberlockerUploaderInfo {
  username?: string;
  user_id?: string;
  account_type?: 'free' | 'premium' | 'business' | 'unknown';
}

/**
 * Copyright - Cyberlocker
 */
export interface CopyrightCyberlockerReport extends CopyrightBaseReport {
  type: 'cyberlocker';
  hosting_service: string;
  infringing_url: string;
  access_method?: string;
  file_info?: FileInfo;
  takedown_info?: CyberlockerTakedownInfo;
  uploader_info?: CyberlockerUploaderInfo;
}

/**
 * UGC platform content information
 */
export interface UgcContentInfo {
  content_id?: string;
  content_title?: string;
  content_description?: string;
  upload_date?: string;
  content_duration?: number;
  view_count?: number;
  like_count?: number;
}

/**
 * UGC platform uploader information
 */
export interface UgcUploaderInfo {
  username?: string;
  user_id?: string;
  account_verified?: boolean;
  subscriber_count?: number;
  account_creation_date?: string;
}

/**
 * UGC platform content match details
 */
export interface UgcMatchDetails {
  match_confidence?: number;
  match_duration?: number;
  match_percentage?: number;
  reference_id?: string;
}

/**
 * UGC platform monetization information
 */
export interface UgcMonetizationInfo {
  monetized?: boolean;
  ad_revenue?: boolean;
  premium_content?: boolean;
}

/**
 * Copyright - UGC Platform
 */
export interface CopyrightUgcPlatformReport extends CopyrightBaseReport {
  type: 'ugc_platform';
  infringing_url: string;
  platform_name: string;
  content_info?: UgcContentInfo;
  infringement_type?: string;
  match_details?: UgcMatchDetails;
  monetization_info?: UgcMonetizationInfo;
  uploader_info?: UgcUploaderInfo;
}

/**
 * Link site link information
 */
export interface LinkSiteLinkInfo {
  page_title?: string;
  posting_date?: string;
  uploader?: string;
  download_count?: number;
  link_count?: number;
  comments_count?: number;
}

/**
 * Link site linked content item
 */
export interface LinkedContentItem {
  target_url: string;
  link_type:
    | 'torrent_file'
    | 'magnet_link'
    | 'direct_download'
    | 'streaming_link'
    | 'usenet_nzb'
    | 'other';
  hosting_service?: string;
  file_size?: number;
}

/**
 * Link site ranking information
 */
export interface LinkSiteRanking {
  alexa_rank?: number;
  popularity_score?: number;
}

/**
 * Copyright - Link Site
 */
export interface CopyrightLinkSiteReport extends CopyrightBaseReport {
  type: 'link_site';
  infringing_url: string;
  site_name: string;
  link_info?: LinkSiteLinkInfo;
  linked_content?: LinkedContentItem[];
  search_terms?: string[];
  site_category?: string;
  site_ranking?: LinkSiteRanking;
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
 * Usenet encoding information
 */
export interface UsenetEncodingInfo {
  encoding_format?: 'yenc' | 'uuencode' | 'base64' | 'other';
  par2_recovery?: boolean;
  rar_compression?: boolean;
}

/**
 * Usenet NZB information
 */
export interface UsenetNzbInfo {
  nzb_name?: string;
  nzb_url?: string;
  indexer_site?: string;
  completion_percentage?: number;
}

/**
 * Usenet server information
 */
export interface UsenetServerInfo {
  nntp_server?: string;
  server_group?: string;
  retention_days?: number;
}

/**
 * Copyright - Usenet
 */
export interface CopyrightUsenetReport extends CopyrightBaseReport {
  type: 'usenet';
  newsgroup: string;
  detection_method?: string;
  encoding_info?: UsenetEncodingInfo;
  message_info: MessageInfo;
  nzb_info?: UsenetNzbInfo;
  server_info?: UsenetServerInfo;
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
