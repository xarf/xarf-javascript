/**
 * Edge Case Tests for XARF Parser
 */

import { XARFParser } from '../src/parser';
import { XARFParseError, XARFValidationError } from '../src/errors';

describe('XARFParser Edge Cases', () => {
  describe('parse error handling', () => {
    it('should handle parse error when category is unsupported in strict mode', () => {
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
        type: 'botnet',
        evidence_source: 'honeypot',
      };

      const parser = new XARFParser(true);

      // Should throw XARFValidationError when category is invalid
      // Schema validation catches this as an enum violation
      expect(() => {
        parser.parse(reportData);
      }).toThrow(XARFValidationError);
    });

    it('should return data when try-catch has error in non-strict mode', () => {
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
        category: 'content',
        type: 'unclassified',
        evidence_source: 'manual_analysis',
      };

      const parser = new XARFParser(false);
      const report = parser.parse(reportData);

      expect(report.category).toBe('content');
    });

    it('should handle invalid JSON string parse error', () => {
      const parser = new XARFParser();

      expect(() => {
        parser.parse('{"invalid": json}');
      }).toThrow(XARFParseError);
      expect(() => {
        parser.parse('{"invalid": json}');
      }).toThrow('Invalid JSON');
    });

    it('should handle reporter not being an object', () => {
      const invalidData = {
        xarf_version: '4.0.0',
        report_id: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: '2024-01-15T10:30:00Z',
        reporter: null,
        sender: {
          org: 'Test Org',
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
      expect(parser.getErrors().some((e) => e.includes('reporter is required'))).toBe(true);
    });

    it('should handle invalid timestamp format gracefully', () => {
      const invalidData = {
        xarf_version: '4.0.0',
        report_id: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: 'invalid-timestamp-format',
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
      const report = parser.parse(invalidData);

      // Parser accepts the data but validator would catch it
      expect(report.category).toBe('messaging');
    });

    it('should validate JSON string input', () => {
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
      const result = parser.validate(JSON.stringify(invalidData));

      expect(result).toBe(false);
      expect(parser.getErrors().some((e) => e.includes('Unsupported XARF version'))).toBe(true);
    });

    it('should handle validate with invalid JSON string', () => {
      const parser = new XARFParser(false);
      const result = parser.validate('invalid json string');

      expect(result).toBe(false);
      expect(parser.getErrors().some((e) => e.includes('Invalid JSON'))).toBe(true);
    });
  });

  describe('category-specific edge cases', () => {
    it('should validate messaging with protocol smtp but no subject for social_engineering', () => {
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
        type: 'bulk_messaging',
        evidence_source: 'spamtrap',
        protocol: 'smtp',
        smtp_from: 'sender@example.com',
      };

      const parser = new XARFParser(false);
      const result = parser.validate(reportData);

      // Should pass because subject is only required for spam
      expect(result).toBe(true);
    });

    it('should require subject for spam with smtp protocol', () => {
      const invalidData = {
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
        protocol: 'smtp',
        smtp_from: 'spammer@example.com',
      };

      const parser = new XARFParser(false);
      const result = parser.validate(invalidData);

      expect(result).toBe(false);
      expect(parser.getErrors().some((e) => e.includes('subject required'))).toBe(true);
    });

    it('should reject invalid messaging type', () => {
      const invalidData = {
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
        protocol: 'smtp',
        smtp_from: 'test@example.com',
      };

      const parser = new XARFParser(false);
      const result = parser.validate(invalidData);

      expect(result).toBe(false);
      expect(parser.getErrors().some((e) => e.includes('Invalid messaging type'))).toBe(true);
    });

    it('should validate connection report missing protocol', () => {
      const invalidData = {
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
        destination_ip: '203.0.113.1',
      };

      const parser = new XARFParser(false);
      const result = parser.validate(invalidData);

      expect(result).toBe(false);
      expect(parser.getErrors().some((e) => e.includes('protocol required'))).toBe(true);
    });

    it('should validate invalid connection type', () => {
      const invalidData = {
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
        type: 'invalid_connection_type',
        evidence_source: 'honeypot',
        destination_ip: '203.0.113.1',
        protocol: 'tcp',
      };

      const parser = new XARFParser(false);
      const result = parser.validate(invalidData);

      expect(result).toBe(false);
      expect(parser.getErrors().some((e) => e.includes('Invalid connection type'))).toBe(true);
    });

    it('should validate invalid content type', () => {
      const invalidData = {
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
        type: 'invalid_content_type',
        evidence_source: 'user_report',
        url: 'http://example.com',
      };

      const parser = new XARFParser(false);
      const result = parser.validate(invalidData);

      expect(result).toBe(false);
      expect(parser.getErrors().some((e) => e.includes('Invalid content type'))).toBe(true);
    });
  });

  describe('reporter validation edge cases', () => {
    it('should detect missing reporter fields', () => {
      const invalidData = {
        xarf_version: '4.0.0',
        report_id: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: '2024-01-15T10:30:00Z',
        reporter: {
          org: 'Test',
        },
        sender: {
          org: 'Test Org',
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
      expect(
        parser
          .getErrors()
          .some((e) => e.includes('reporter.contact') || e.includes('reporter.domain'))
      ).toBe(true);
    });
  });
});
