/**
 * Tests for snake_case vs camelCase field naming support
 */

import { XARFGenerator } from '../src/generator';

describe('Field Naming Convention Support', () => {
  let generator: XARFGenerator;

  beforeEach(() => {
    generator = new XARFGenerator();
  });

  describe('snake_case (XARF spec preferred)', () => {
    it('should accept snake_case field names', () => {
      const report = generator.generateReport({
        category: 'connection',
        type: 'ddos', // XARF spec field name
        source_identifier: '192.0.2.100', // XARF spec field name
        evidence_source: 'honeypot', // Valid for connection/ddos schema
        reporter: {
          org: 'Security Team',
          contact: 'security@example.com',
          domain: 'example.com',
        },
        sender: {
          org: 'SOC',
          contact: 'soc@example.com',
          domain: 'example.com',
        },
        additionalFields: {
          destination_ip: '203.0.113.50',
          protocol: 'tcp',
          first_seen: '2024-01-15T09:00:00Z',
          source_port: 12345,
        },
      });

      expect(report.type).toBe('ddos');
      expect(report.source_identifier).toBe('192.0.2.100');
      expect(report.evidence_source).toBe('honeypot');
    });

    it('should accept on_behalf_of in snake_case', () => {
      const report = generator.generateReport({
        category: 'messaging',
        type: 'spam',
        source_identifier: '192.0.2.100',
        on_behalf_of: {
          // XARF spec field name
          org: 'Client Company',
          contact: 'abuse@client.com',
          domain: 'client.com',
        },
        reporter: {
          org: 'Security Team',
          contact: 'security@example.com',
          domain: 'example.com',
        },
        sender: {
          org: 'SOC',
          contact: 'soc@example.com',
          domain: 'example.com',
        },
        additionalFields: {
          protocol: 'smtp',
          smtp_from: 'spammer@evil.com',
          source_port: 25,
          subject: 'Test spam',
        },
      });

      expect(report.on_behalf_of).toBeDefined();
      expect(report.on_behalf_of?.org).toBe('Client Company');
    });
  });

  describe('camelCase (backward compatibility)', () => {
    it('should accept camelCase field names for backward compatibility', () => {
      const report = generator.generateReport({
        category: 'connection',
        reportType: 'ddos', // Backward compatibility
        sourceIdentifier: '192.0.2.100', // Backward compatibility
        evidenceSource: 'honeypot', // Valid for connection/ddos
        reporter: {
          org: 'Security Team',
          contact: 'security@example.com',
          domain: 'example.com',
        },
        sender: {
          org: 'SOC',
          contact: 'soc@example.com',
          domain: 'example.com',
        },
        additionalFields: {
          destination_ip: '203.0.113.50',
          protocol: 'tcp',
          first_seen: '2024-01-15T09:00:00Z',
          source_port: 12345,
        },
      });

      // Output should ALWAYS use snake_case (XARF spec)
      expect(report.type).toBe('ddos');
      expect(report.source_identifier).toBe('192.0.2.100');
      expect(report.evidence_source).toBe('honeypot');
    });

    it('should accept onBehalfOf in camelCase', () => {
      const report = generator.generateReport({
        category: 'messaging',
        reportType: 'spam',
        sourceIdentifier: '192.0.2.100',
        onBehalfOf: {
          // Backward compatibility
          org: 'Client Company',
          contact: 'abuse@client.com',
          domain: 'client.com',
        },
        reporter: {
          org: 'Security Team',
          contact: 'security@example.com',
          domain: 'example.com',
        },
        sender: {
          org: 'SOC',
          contact: 'soc@example.com',
          domain: 'example.com',
        },
        additionalFields: {
          protocol: 'smtp',
          smtp_from: 'spammer@evil.com',
          source_port: 25,
          subject: 'Test spam',
        },
      });

      // Output should ALWAYS use snake_case (XARF spec)
      expect(report.on_behalf_of).toBeDefined();
      expect(report.on_behalf_of?.org).toBe('Client Company');
    });
  });

  describe('snake_case takes precedence', () => {
    it('should prefer snake_case when both are provided', () => {
      const report = generator.generateReport({
        category: 'connection',
        type: 'port_scan', // XARF spec - should be used
        reportType: 'ddos', // Backward compat - should be ignored
        source_identifier: '192.0.2.50', // XARF spec - should be used
        sourceIdentifier: '192.0.2.100', // Backward compat - should be ignored
        evidence_source: 'honeypot', // XARF spec - should be used
        reporter: {
          org: 'Security Team',
          contact: 'security@example.com',
          domain: 'example.com',
        },
        sender: {
          org: 'SOC',
          contact: 'soc@example.com',
          domain: 'example.com',
        },
        additionalFields: {
          destination_ip: '203.0.113.50',
          protocol: 'tcp',
          first_seen: '2024-01-15T09:00:00Z',
          source_port: 12345,
        },
      });

      // snake_case values should win
      expect(report.type).toBe('port_scan');
      expect(report.source_identifier).toBe('192.0.2.50');
      expect(report.evidence_source).toBe('honeypot');
    });

    it('should prefer on_behalf_of over onBehalfOf', () => {
      const report = generator.generateReport({
        category: 'messaging',
        type: 'spam',
        source_identifier: '192.0.2.100',
        on_behalf_of: {
          org: 'Preferred Client',
          contact: 'preferred@client.com',
          domain: 'client.com',
        },
        onBehalfOf: {
          org: 'Ignored Client',
          contact: 'ignored@client.com',
          domain: 'ignored.com',
        },
        reporter: {
          org: 'Security Team',
          contact: 'security@example.com',
          domain: 'example.com',
        },
        sender: {
          org: 'SOC',
          contact: 'soc@example.com',
          domain: 'example.com',
        },
        additionalFields: {
          protocol: 'smtp',
          smtp_from: 'spammer@evil.com',
          source_port: 25,
          subject: 'Test spam',
        },
      });

      expect(report.on_behalf_of?.org).toBe('Preferred Client');
    });
  });

  describe('error messages', () => {
    it('should show both field name options in error messages', () => {
      expect(() => {
        generator.generateReport({
          category: 'connection',
          type: 'ddos',
          // Missing source_identifier/sourceIdentifier
          reporter: {
            org: 'Security Team',
            contact: 'security@example.com',
            domain: 'example.com',
          },
          sender: {
            org: 'SOC',
            contact: 'soc@example.com',
            domain: 'example.com',
          },
          additionalFields: {
            destination_ip: '203.0.113.50',
            protocol: 'tcp',
          },
        });
      }).toThrow('source_identifier (or sourceIdentifier) is required');
    });

    it('should show both field name options when type is missing', () => {
      expect(() => {
        generator.generateReport({
          category: 'connection',
          // Missing type/reportType
          source_identifier: '192.0.2.100',
          reporter: {
            org: 'Security Team',
            contact: 'security@example.com',
            domain: 'example.com',
          },
          sender: {
            org: 'SOC',
            contact: 'soc@example.com',
            domain: 'example.com',
          },
          additionalFields: {
            destination_ip: '203.0.113.50',
            protocol: 'tcp',
          },
        });
      }).toThrow('type (or reportType) is required');
    });
  });

  describe('output always uses snake_case', () => {
    it('should output snake_case even when input uses camelCase', () => {
      const report = generator.generateReport({
        category: 'content',
        reportType: 'phishing', // camelCase input
        sourceIdentifier: '192.0.2.100', // camelCase input
        evidenceSource: 'user_report', // camelCase input
        reporter: {
          org: 'Security Team',
          contact: 'security@example.com',
          domain: 'example.com',
        },
        sender: {
          org: 'SOC',
          contact: 'soc@example.com',
          domain: 'example.com',
        },
        additionalFields: {
          url: 'http://phishing.example.com',
        },
      });

      // Verify output uses snake_case field names
      expect(report).toHaveProperty('type');
      expect(report).toHaveProperty('source_identifier');
      expect(report).toHaveProperty('evidence_source');

      // Verify NO camelCase fields in output
      const reportKeys = Object.keys(report);
      expect(reportKeys).not.toContain('reportType');
      expect(reportKeys).not.toContain('sourceIdentifier');
      expect(reportKeys).not.toContain('evidenceSource');
      expect(reportKeys).not.toContain('onBehalfOf');
    });
  });
});
