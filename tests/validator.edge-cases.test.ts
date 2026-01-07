/**
 * Edge Case Tests for XARF Validator
 */

import { XARFValidator } from '../src/validator';
import type { XARFReport } from '../src/types';

describe('XARFValidator Edge Cases', () => {
  let validator: XARFValidator;

  beforeEach(() => {
    validator = new XARFValidator();
  });

  describe('validateRequiredFields edge cases', () => {
    it('should detect missing reporter.contact', async () => {
      const report = {
        xarf_version: '4.0.0',
        report_id: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: '2024-01-15T10:30:00Z',
        reporter: {
          org: 'Test Org',
          type: 'automated',
        },
        source_identifier: '192.0.2.1',
        category: 'messaging',
        type: 'spam',
        evidence_source: 'spamtrap',
      } as unknown as XARFReport;

      const result = await validator.validate(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'reporter.contact')).toBe(true);
    });

    it('should detect missing reporter.domain', async () => {
      const report = {
        xarf_version: '4.0.0',
        report_id: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: '2024-01-15T10:30:00Z',
        reporter: {
          org: 'Test Org',
          contact: 'test@example.com',
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
      } as unknown as XARFReport;

      const result = await validator.validate(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'reporter.domain')).toBe(true);
    });
  });

  describe('validateFormats edge cases', () => {
    it('should handle invalid timestamp that causes exception', async () => {
      const report = {
        xarf_version: '4.0.0',
        report_id: '550e8400-e29b-41d4-a716-446655440000',
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
        source_identifier: '192.0.2.1',
        category: 'messaging',
        type: 'spam',
        evidence_source: 'spamtrap',
      } as unknown as XARFReport;

      const result = await validator.validate(report);

      // Valid timestamp should pass
      expect(result.valid).toBe(true);
    });
  });

  describe('validateValues edge cases', () => {
    it('should validate invalid evidence_source', async () => {
      const report = {
        xarf_version: '4.0.0',
        report_id: '550e8400-e29b-41d4-a716-446655440000',
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
        source_identifier: '192.0.2.1',
        category: 'messaging',
        type: 'spam',
        evidence_source: 'invalid_source',
      } as unknown as XARFReport;

      const result = await validator.validate(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'evidence_source')).toBe(true);
    });

    it('should validate invalid severity', async () => {
      const report = {
        xarf_version: '4.0.0',
        report_id: '550e8400-e29b-41d4-a716-446655440000',
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
        source_identifier: '192.0.2.1',
        category: 'messaging',
        type: 'spam',
        evidence_source: 'spamtrap',
        severity: 'extreme',
      } as unknown as XARFReport;

      const result = await validator.validate(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'severity')).toBe(true);
    });

    it('should detect start time after end time in occurrence', async () => {
      const report = {
        xarf_version: '4.0.0',
        report_id: '550e8400-e29b-41d4-a716-446655440000',
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
        source_identifier: '192.0.2.1',
        category: 'messaging',
        type: 'spam',
        evidence_source: 'spamtrap',
        occurrence: {
          start: '2024-01-15T12:00:00Z',
          end: '2024-01-15T10:00:00Z',
        },
      } as XARFReport;

      const result = await validator.validate(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'occurrence')).toBe(true);
      expect(
        result.errors.some((e) => e.message.includes('start time must be before end time'))
      ).toBe(true);
    });

    it('should detect occurrence without start or end', async () => {
      const report = {
        xarf_version: '4.0.0',
        report_id: '550e8400-e29b-41d4-a716-446655440000',
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
        source_identifier: '192.0.2.1',
        category: 'messaging',
        type: 'spam',
        evidence_source: 'spamtrap',
        occurrence: {} as any,
      } as XARFReport;

      const result = await validator.validate(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'occurrence')).toBe(true);
    });
  });

  describe('validateCategorySpecific edge cases', () => {
    it('should error for invalid connection type', async () => {
      const report = {
        xarf_version: '4.0.0',
        report_id: '550e8400-e29b-41d4-a716-446655440000',
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
        source_identifier: '192.0.2.1',
        category: 'connection',
        type: 'invalid_connection_type',
        evidence_source: 'ids_ips',
        destination_ip: '203.0.113.1',
        protocol: 'tcp',
      } as XARFReport;

      const result = await validator.validate(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'type')).toBe(true);
      expect(result.errors.some((e) => e.message.includes('Invalid type'))).toBe(true);
    });

    it('should error for invalid content type', async () => {
      const report = {
        xarf_version: '4.0.0',
        report_id: '550e8400-e29b-41d4-a716-446655440000',
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
        source_identifier: '192.0.2.1',
        category: 'content',
        type: 'invalid_content_type',
        evidence_source: 'user_report',
        url: 'http://example.com',
      } as XARFReport;

      const result = await validator.validate(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'type')).toBe(true);
      expect(result.errors.some((e) => e.message.includes('Invalid type'))).toBe(true);
    });

    it('should handle infrastructure category with no specific validation', async () => {
      const report = {
        xarf_version: '4.0.0',
        report_id: '550e8400-e29b-41d4-a716-446655440000',
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
        source_identifier: '192.0.2.1',
        category: 'infrastructure',
        type: 'botnet',
        evidence_source: 'honeypot',
      } as XARFReport;

      const result = await validator.validate(report);

      // Should validate without category-specific errors
      expect(result.valid).toBe(true);
    });
  });

  describe('validateConnectionReport edge cases', () => {
    it('should validate invalid port number (non-integer)', async () => {
      const report = {
        xarf_version: '4.0.0',
        report_id: '550e8400-e29b-41d4-a716-446655440000',
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
        source_identifier: '192.0.2.1',
        category: 'connection',
        type: 'ddos',
        evidence_source: 'honeypot',
        destination_ip: '203.0.113.1',
        protocol: 'tcp',
        destination_port: 'not-a-number',
      } as unknown as XARFReport;

      const result = await validator.validate(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'destination_port')).toBe(true);
    });

    it('should validate port number too high', async () => {
      const report = {
        xarf_version: '4.0.0',
        report_id: '550e8400-e29b-41d4-a716-446655440000',
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
        source_identifier: '192.0.2.1',
        category: 'connection',
        type: 'ddos',
        evidence_source: 'honeypot',
        destination_ip: '203.0.113.1',
        protocol: 'tcp',
        destination_port: 70000,
      } as XARFReport;

      const result = await validator.validate(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'destination_port')).toBe(true);
    });

    it('should validate negative port number', async () => {
      const report = {
        xarf_version: '4.0.0',
        report_id: '550e8400-e29b-41d4-a716-446655440000',
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
        source_identifier: '192.0.2.1',
        category: 'connection',
        type: 'ddos',
        evidence_source: 'honeypot',
        destination_ip: '203.0.113.1',
        protocol: 'tcp',
        destination_port: -1,
      } as XARFReport;

      const result = await validator.validate(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'destination_port')).toBe(true);
    });
  });

  describe('validateContentReport edge cases', () => {
    it('should catch URL parsing error', async () => {
      const report = {
        xarf_version: '4.0.0',
        report_id: '550e8400-e29b-41d4-a716-446655440000',
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
        source_identifier: '192.0.2.1',
        category: 'content',
        type: 'phishing',
        evidence_source: 'user_report',
        url: 'not-a-valid-url',
      } as XARFReport;

      const result = await validator.validate(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'url')).toBe(true);
      expect(result.errors.some((e) => e.message.includes('Invalid URL format'))).toBe(true);
    });
  });
});
