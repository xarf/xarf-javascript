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
        report_id: 'test-id',
        timestamp: '2024-01-15T10:30:00Z',
        reporter: {
          org: 'Test',
          contact: 'test@example.com',
          type: 'automated',
        },
        source_identifier: '192.0.2.1',
        category: 'infrastructure',
        type: 'botnet',
        evidence_source: 'honeypot',
      };

      const parser = new XARFParser(true);

      expect(() => {
        parser.parse(reportData);
      }).toThrow(XARFValidationError);
      expect(() => {
        parser.parse(reportData);
      }).toThrow('Unsupported category');
    });

    it('should return data when try-catch has error in non-strict mode', () => {
      const reportData = {
        xarf_version: '4.0.0',
        report_id: 'test-id',
        timestamp: '2024-01-15T10:30:00Z',
        reporter: {
          org: 'Test',
          contact: 'test@example.com',
          type: 'automated',
        },
        source_identifier: '192.0.2.1',
        category: 'other',
        type: 'unclassified',
        evidence_source: 'manual_analysis',
      };

      const parser = new XARFParser(false);
      const report = parser.parse(reportData);

      expect(report.category).toBe('other');
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
        report_id: 'test-id',
        timestamp: '2024-01-15T10:30:00Z',
        reporter: null,
        source_identifier: '192.0.2.1',
        category: 'messaging',
        type: 'spam',
        evidence_source: 'spamtrap',
      };

      const parser = new XARFParser(false);
      const result = parser.validate(invalidData);

      expect(result).toBe(false);
      expect(parser.getErrors().some((e) => e.includes('Reporter must be an object'))).toBe(true);
    });

    it('should handle invalid timestamp format gracefully', () => {
      const invalidData = {
        xarf_version: '4.0.0',
        report_id: 'test-id',
        timestamp: 'invalid-timestamp-format',
        reporter: {
          org: 'Test',
          contact: 'test@example.com',
          type: 'automated',
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
        report_id: 'test-id',
        timestamp: '2024-01-15T10:30:00Z',
        reporter: {
          org: 'Test',
          contact: 'test@example.com',
          type: 'automated',
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
        report_id: 'test-id',
        timestamp: '2024-01-15T10:30:00Z',
        reporter: {
          org: 'Test',
          contact: 'test@example.com',
          type: 'automated',
        },
        source_identifier: '192.0.2.1',
        category: 'messaging',
        type: 'social_engineering',
        evidence_source: 'spamtrap',
        protocol: 'smtp',
        smtp_from: 'sender@example.com',
      };

      const parser = new XARFParser(false);
      const result = parser.validate(reportData);

      // Should pass because subject is only required for spam/phishing
      expect(result).toBe(true);
    });

    it('should require subject for spam with smtp protocol', () => {
      const invalidData = {
        xarf_version: '4.0.0',
        report_id: 'test-id',
        timestamp: '2024-01-15T10:30:00Z',
        reporter: {
          org: 'Test',
          contact: 'test@example.com',
          type: 'automated',
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

    it('should require subject for phishing with smtp protocol', () => {
      const invalidData = {
        xarf_version: '4.0.0',
        report_id: 'test-id',
        timestamp: '2024-01-15T10:30:00Z',
        reporter: {
          org: 'Test',
          contact: 'test@example.com',
          type: 'automated',
        },
        source_identifier: '192.0.2.1',
        category: 'messaging',
        type: 'phishing',
        evidence_source: 'spamtrap',
        protocol: 'smtp',
        smtp_from: 'phisher@example.com',
      };

      const parser = new XARFParser(false);
      const result = parser.validate(invalidData);

      expect(result).toBe(false);
      expect(parser.getErrors().some((e) => e.includes('subject required'))).toBe(true);
    });

    it('should validate connection report missing protocol', () => {
      const invalidData = {
        xarf_version: '4.0.0',
        report_id: 'test-id',
        timestamp: '2024-01-15T10:30:00Z',
        reporter: {
          org: 'Test',
          contact: 'test@example.com',
          type: 'automated',
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
        report_id: 'test-id',
        timestamp: '2024-01-15T10:30:00Z',
        reporter: {
          org: 'Test',
          contact: 'test@example.com',
          type: 'automated',
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
        report_id: 'test-id',
        timestamp: '2024-01-15T10:30:00Z',
        reporter: {
          org: 'Test',
          contact: 'test@example.com',
          type: 'manual',
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
        report_id: 'test-id',
        timestamp: '2024-01-15T10:30:00Z',
        reporter: {
          org: 'Test',
        },
        source_identifier: '192.0.2.1',
        category: 'messaging',
        type: 'spam',
        evidence_source: 'spamtrap',
      };

      const parser = new XARFParser(false);
      const result = parser.validate(invalidData);

      expect(result).toBe(false);
      expect(parser.getErrors().some((e) => e.includes('Missing reporter fields'))).toBe(true);
    });
  });
});
