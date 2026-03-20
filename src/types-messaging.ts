/**
 * XARF v4 Messaging Category Type Definitions
 */
import type { XARFReport } from './types';

/**
 * Messaging category base report (shared fields across all messaging types)
 */
export interface MessagingBaseReport extends XARFReport {
  category: 'messaging';
  protocol: string;
  sender_name?: string;
  smtp_from?: string;
  subject?: string;
}

/**
 * Spam analysis indicators
 */
export interface SpamIndicators {
  suspicious_links?: string[];
  commercial_content?: boolean;
  bulk_characteristics?: boolean;
}

/**
 * Messaging - Spam
 */
export interface SpamReport extends MessagingBaseReport {
  type: 'spam';
  language?: string;
  message_id?: string;
  recipient_count?: number;
  smtp_to?: string;
  spam_indicators?: SpamIndicators;
  user_agent?: string;
}

/**
 * Bulk messaging indicators
 */
export interface BulkIndicators {
  high_volume?: boolean;
  template_based?: boolean;
  commercial_sender?: boolean;
}

/**
 * Messaging - Bulk Messaging
 */
export interface BulkMessagingReport extends MessagingBaseReport {
  type: 'bulk_messaging';
  recipient_count: number;
  bulk_indicators?: BulkIndicators;
  opt_in_evidence?: boolean;
  unsubscribe_provided?: boolean;
}

/**
 * Messaging category report (union of all messaging types)
 */
export type MessagingReport = SpamReport | BulkMessagingReport;
