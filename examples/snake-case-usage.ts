/**
 * Example: Using snake_case field names (XARF spec format)
 *
 * This example demonstrates using the XARF spec's snake_case field names
 * when generating reports. This is the preferred approach as it matches
 * the official XARF specification.
 */

import { XARFGenerator } from '../src/generator';

const generator = new XARFGenerator();

// Example 1: Basic report using snake_case (XARF spec format)
console.log('Example 1: Basic connection report with snake_case');
const report1 = generator.generateReport({
  category: 'connection',
  type: 'ddos', // XARF spec field name (not reportType)
  source_identifier: '192.0.2.100', // XARF spec field name (not sourceIdentifier)
  evidence_source: 'honeypot', // XARF spec field name (not evidenceSource)
  reporter: {
    org: 'Security Operations Center',
    contact: 'abuse@security.example.com',
    domain: 'security.example.com',
  },
  sender: {
    org: 'SOC Automated Systems',
    contact: 'reports@security.example.com',
    domain: 'security.example.com',
  },
  description: 'DDoS attack detected from monitoring systems',
  severity: 'high',
  confidence: 0.95,
  additionalFields: {
    destination_ip: '203.0.113.50',
    protocol: 'tcp',
    destination_port: 80,
    packet_count: 150000,
  },
});

console.log(JSON.stringify(report1, null, 2));
console.log('\n---\n');

// Example 2: Report with on_behalf_of using snake_case
console.log('Example 2: Messaging report with on_behalf_of (snake_case)');
const report2 = generator.generateReport({
  category: 'messaging',
  type: 'phishing', // XARF spec
  source_identifier: '198.51.100.25', // XARF spec
  evidence_source: 'user_report', // XARF spec
  on_behalf_of: {
    // XARF spec (not onBehalfOf)
    org: 'Client Corporation',
    contact: 'abuse@client.example.com',
    domain: 'client.example.com',
  },
  reporter: {
    org: 'Abuse Response Team',
    contact: 'abuse@provider.example.com',
    domain: 'provider.example.com',
  },
  sender: {
    org: 'Email Security Division',
    contact: 'phishing@provider.example.com',
    domain: 'provider.example.com',
  },
  description: 'Phishing email reported by end user',
  severity: 'medium',
  confidence: 0.85,
  additionalFields: {
    protocol: 'smtp',
    smtp_from: 'fake-support@evil.example.com',
    smtp_to: 'victim@client.example.com',
    subject: 'Urgent: Verify Your Account',
    message_id: '<1234567890@evil.example.com>',
  },
  evidence: [
    generator.addEvidence(
      'message/rfc822',
      'Original phishing email message',
      'From: fake-support@evil.example.com\nSubject: Urgent: Verify Your Account\n\nClick here to verify...'
    ),
  ],
});

console.log(JSON.stringify(report2, null, 2));
console.log('\n---\n');

console.log('Note: All field names use snake_case, matching the XARF specification.');
