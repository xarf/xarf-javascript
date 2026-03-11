/**
 * Tests for XARF Parser
 */

import { XARFParser } from '../src/parser';
import { XARFParseError, XARFValidationError } from '../src/errors';
import type { MessagingReport, ConnectionReport, ContentReport } from '../src/types';

describe('XARFParser', () => {
  describe('parse', () => {
    it('should parse valid messaging report', () => {
      const reportData = {
        xarf_version: '4.0.0',
        report_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        timestamp: '2024-01-15T10:30:00Z',
        reporter: {
          org: 'Test Org',
          contact: 'test@example.com',
          domain: 'example.com',
        },
        sender: {
          org: 'Test Org',
          contact: 'test@example.com',
          domain: 'example.com',
        },
        source_identifier: '192.0.2.100',
        category: 'messaging',
        type: 'spam',
        evidence_source: 'spamtrap',
        protocol: 'smtp',
        smtp_from: 'spammer@example.com',
        subject: 'Test Spam',
      };

      const parser = new XARFParser();
      const report = parser.parse(reportData) as MessagingReport;

      expect(report.category).toBe('messaging');
      expect(report.type).toBe('spam');
      expect(report.smtp_from).toBe('spammer@example.com');
    });

    it('should parse valid connection report', () => {
      const reportData = {
        xarf_version: '4.0.0',
        report_id: 'b2c3d4e5-f6g7-8901-bcde-f1234567890a',
        timestamp: '2024-01-15T11:00:00Z',
        reporter: {
          org: 'Security Monitor',
          contact: 'security@example.com',
          domain: 'example.com',
        },
        sender: {
          org: 'Security Monitor',
          contact: 'security@example.com',
          domain: 'example.com',
        },
        source_identifier: '192.0.2.200',
        category: 'connection',
        type: 'ddos',
        evidence_source: 'honeypot',
        destination_ip: '203.0.113.10',
        protocol: 'tcp',
        destination_port: 80,
        attack_type: 'syn_flood',
      };

      const parser = new XARFParser();
      const report = parser.parse(reportData) as ConnectionReport;

      expect(report.category).toBe('connection');
      expect(report.type).toBe('ddos');
      expect(report.destination_ip).toBe('203.0.113.10');
    });

    it('should parse valid content report', () => {
      const reportData = {
        xarf_version: '4.0.0',
        report_id: 'c3d4e5f6-g7h8-9012-cdef-234567890abc',
        timestamp: '2024-01-15T12:00:00Z',
        reporter: {
          org: 'Web Security',
          contact: 'web@example.com',
          domain: 'example.com',
        },
        sender: {
          org: 'Web Security',
          contact: 'web@example.com',
          domain: 'example.com',
        },
        source_identifier: '192.0.2.300',
        category: 'content',
        type: 'phishing',
        evidence_source: 'user_report',
        url: 'http://phishing.example.com',
      };

      const parser = new XARFParser();
      const report = parser.parse(reportData) as ContentReport;

      expect(report.category).toBe('content');
      expect(report.type).toBe('phishing');
      expect(report.url).toBe('http://phishing.example.com');
    });

    it('should parse from JSON string', () => {
      const reportData = {
        xarf_version: '4.0.0',
        report_id: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: '2024-01-15T10:30:00Z',
        reporter: {
          org: 'Test',
          contact: 'test@example.com',
          domain: 'example.com',
        },
        sender: {
          org: 'Test',
          contact: 'test@example.com',
          domain: 'example.com',
        },
        source_identifier: '192.0.2.1',
        category: 'messaging',
        type: 'spam',
        evidence_source: 'spamtrap',
      };

      const parser = new XARFParser();
      const report = parser.parse(JSON.stringify(reportData));

      expect(report.category).toBe('messaging');
      expect(report.type).toBe('spam');
    });

    it('should throw error for invalid JSON string', () => {
      const parser = new XARFParser();

      expect(() => {
        parser.parse('{invalid json}');
      }).toThrow(XARFParseError);
    });

    it('should throw validation error in strict mode', () => {
      const invalidData = {
        xarf_version: '4.0.0',
        // Missing required fields
      };

      const parser = new XARFParser(true);

      expect(() => {
        parser.parse(invalidData);
      }).toThrow(XARFValidationError);
    });
  });

  describe('validate', () => {
    it('should return false for invalid version', () => {
      const invalidData = {
        xarf_version: '3.0.0',
        report_id: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: '2024-01-15T10:30:00Z',
        reporter: {
          org: 'Test',
          contact: 'test@example.com',
          domain: 'example.com',
        },
        sender: {
          org: 'Test',
          contact: 'test@example.com',
          domain: 'example.com',
        },
        source_identifier: '192.0.2.1',
        category: 'messaging',
        type: 'spam',
        evidence_source: 'spamtrap',
      };

      const parser = new XARFParser(false);
      const result = parser.validate(invalidData);

      expect(result).toBe(false);
      const errors = parser.getErrors();
      expect(errors.length).toBeGreaterThan(0);
      expect(
        errors.some((e) => e.includes('Unsupported XARF version') || e.includes('xarf_version'))
      ).toBe(true);
    });

    it('should return false for missing required fields', () => {
      const invalidData = {
        xarf_version: '4.0.0',
        // Missing most required fields
      };

      const parser = new XARFParser(false);
      const result = parser.validate(invalidData);

      expect(result).toBe(false);
      const errors = parser.getErrors();
      expect(errors.some((e) => e.includes('Required field is missing'))).toBe(true);
    });

    it('should return false for invalid reporter contact', () => {
      const invalidData = {
        xarf_version: '4.0.0',
        report_id: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: '2024-01-15T10:30:00Z',
        reporter: {
          org: 'Test',
          contact: 'invalid-email',
          domain: 'example.com',
        },
        sender: {
          org: 'Test',
          contact: 'test@example.com',
          domain: 'example.com',
        },
        source_identifier: '192.0.2.1',
        category: 'messaging',
        type: 'spam',
        evidence_source: 'spamtrap',
      };

      const parser = new XARFParser(false);
      const result = parser.validate(invalidData);

      expect(result).toBe(false);
      const errors = parser.getErrors();
      expect(
        errors.some((e) => e.includes('valid email address') || e.includes('reporter.contact'))
      ).toBe(true);
    });

    it('should handle unsupported category', () => {
      const reportData = {
        xarf_version: '4.0.0',
        report_id: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: '2024-01-15T10:30:00Z',
        reporter: {
          org: 'Test',
          contact: 'test@example.com',
          domain: 'example.com',
        },
        sender: {
          org: 'Test',
          contact: 'test@example.com',
          domain: 'example.com',
        },
        source_identifier: '192.0.2.1',
        category: 'invalid_category',
        type: 'test',
        evidence_source: 'honeypot',
      };

      const parser = new XARFParser(false);
      const report = parser.parse(reportData);

      expect(report.category).toBe('invalid_category');
      const errors = parser.getErrors();
      expect(errors.length).toBeGreaterThan(0);
      // Schema validation catches invalid category as enum violation
      expect(errors.some((e) => e.includes('category'))).toBe(true);
    });
  });

  describe('category-specific validation', () => {
    it('should validate messaging reports', () => {
      const invalidMessaging = {
        xarf_version: '4.0.0',
        report_id: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: '2024-01-15T10:30:00Z',
        reporter: {
          org: 'Test',
          contact: 'test@example.com',
          domain: 'example.com',
        },
        sender: {
          org: 'Test',
          contact: 'test@example.com',
          domain: 'example.com',
        },
        source_identifier: '192.0.2.1',
        category: 'messaging',
        type: 'invalid_type',
        evidence_source: 'spamtrap',
      };

      const parser = new XARFParser(false);
      const result = parser.validate(invalidMessaging);

      expect(result).toBe(false);
      expect(parser.getErrors().some((e) => e.includes('Invalid type'))).toBe(true);
    });

    it('should validate connection reports require destination_ip', () => {
      const invalidConnection = {
        xarf_version: '4.0.0',
        report_id: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: '2024-01-15T10:30:00Z',
        reporter: {
          org: 'Test',
          contact: 'test@example.com',
          domain: 'example.com',
        },
        sender: {
          org: 'Test',
          contact: 'test@example.com',
          domain: 'example.com',
        },
        source_identifier: '192.0.2.1',
        category: 'connection',
        type: 'ddos',
        evidence_source: 'honeypot',
        protocol: 'tcp',
      };

      const parser = new XARFParser(false);
      const result = parser.validate(invalidConnection);

      expect(result).toBe(false);
      expect(
        parser.getErrors().some((e) => e.includes('destination_ip') && e.includes('required'))
      ).toBe(true);
    });

    it('should validate content reports require url', () => {
      const invalidContent = {
        xarf_version: '4.0.0',
        report_id: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: '2024-01-15T10:30:00Z',
        reporter: {
          org: 'Test',
          contact: 'test@example.com',
          domain: 'example.com',
        },
        sender: {
          org: 'Test',
          contact: 'test@example.com',
          domain: 'example.com',
        },
        source_identifier: '192.0.2.1',
        category: 'content',
        type: 'phishing',
        evidence_source: 'user_report',
      };

      const parser = new XARFParser(false);
      const result = parser.validate(invalidContent);

      expect(result).toBe(false);
      expect(parser.getErrors().some((e) => e.includes('url') && e.includes('required'))).toBe(
        true
      );
    });
  });

  describe('getErrors', () => {
    it('should return copy of errors array', () => {
      const parser = new XARFParser(false);
      parser.validate({});

      const errors1 = parser.getErrors();
      const errors2 = parser.getErrors();

      expect(errors1).toEqual(errors2);
      expect(errors1).not.toBe(errors2); // Different array instances
    });
  });
});
