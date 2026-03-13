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
 * Messaging - Spam
 */
export interface SpamReport extends MessagingBaseReport {
  type: 'spam';
  language?: string;
  message_id?: string;
  recipient_count?: number;
  smtp_to?: string;
  spam_indicators?: Record<string, unknown>;
  user_agent?: string;
}

/**
 * Messaging - Bulk Messaging
 */
export interface BulkMessagingReport extends MessagingBaseReport {
  type: 'bulk_messaging';
  recipient_count: number;
  bulk_indicators?: Record<string, unknown>;
  opt_in_evidence?: boolean;
  unsubscribe_provided?: boolean;
}

/**
 * Messaging category report (union of all messaging types)
 */
export type MessagingReport = SpamReport | BulkMessagingReport;
