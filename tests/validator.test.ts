/**
 * Tests for XARF Validator
 */

import { XARFValidator } from '../src/validator';
import { XARFValidationError } from '../src/errors';
import type { XARFReport } from '../src/types';

describe('XARFValidator', () => {
  let validator: XARFValidator;

  beforeEach(() => {
    validator = new XARFValidator();
  });

  const createValidReport = (): XARFReport => ({
    xarf_version: '4.0.0',
    report_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    timestamp: '2024-01-15T10:30:00Z',
    reporter: {
      org: 'Example Security',
      contact: 'abuse@example.com',
      domain: 'example.com',
    },
    sender: {
      org: 'Example Security',
      contact: 'abuse@example.com',
      domain: 'example.com',
    },
    source_identifier: '192.0.2.100',
    category: 'connection',
    type: 'ddos',
    evidence_source: 'honeypot',
    destination_ip: '203.0.113.10',
    protocol: 'tcp',
  });

  describe('validate', () => {
    it('should validate correct report', () => {
      const report = createValidReport();
      const result = validator.validate(report);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const report: any = {
        xarf_version: '4.0.0',
        // Missing other required fields
      };

      const result = validator.validate(report);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect invalid XARF version', () => {
      const report = createValidReport();
      report.xarf_version = '3.0.0';

      const result = validator.validate(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'xarf_version')).toBe(true);
    });

    it('should detect invalid category', () => {
      const report = createValidReport();
      (report as any).category = 'invalid';

      const result = validator.validate(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'category')).toBe(true);
    });

    it('should detect invalid reporter domain', () => {
      const report = createValidReport();
      (report.reporter as any).domain = 'invalid domain with spaces';

      const result = validator.validate(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'reporter.domain')).toBe(true);
    });

    it('should detect invalid confidence', () => {
      const report = createValidReport();
      report.confidence = 1.5;

      const result = validator.validate(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'confidence')).toBe(true);
    });

    it('should validate occurrence time range', () => {
      const report = createValidReport();
      report.occurrence = {
        start: '2024-01-15T12:00:00Z',
        end: '2024-01-15T10:00:00Z', // End before start
      };

      const result = validator.validate(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'occurrence')).toBe(true);
    });

    it('should throw in strict mode', () => {
      const report = createValidReport();
      report.xarf_version = '3.0.0';

      expect(() => {
        validator.validate(report, true);
      }).toThrow(XARFValidationError);
    });

    it('should convert warnings to errors in strict mode', () => {
      const report = createValidReport();
      report.report_id = 'not-a-uuid';

      expect(() => {
        validator.validate(report, true);
      }).toThrow(XARFValidationError);
    });
  });

  describe('format validation', () => {
    it('should warn about invalid UUID format', () => {
      const report = createValidReport();
      report.report_id = 'not-a-valid-uuid';

      const result = validator.validate(report);

      expect(result.warnings.some((w) => w.field === 'report_id')).toBe(true);
    });

    it('should error on invalid email format', () => {
      const report = createValidReport();
      report.reporter.contact = 'not-an-email';

      const result = validator.validate(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'reporter.contact')).toBe(true);
    });

    it('should detect invalid timestamp', () => {
      const report = createValidReport();
      report.timestamp = 'invalid-timestamp';

      const result = validator.validate(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'timestamp')).toBe(true);
    });

    it('should detect invalid version format', () => {
      const report = createValidReport();
      report.xarf_version = '4.0';

      const result = validator.validate(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'xarf_version')).toBe(true);
    });
  });

  describe('category-specific validation', () => {
    it('should validate messaging reports', () => {
      const report: XARFReport = {
        ...createValidReport(),
        category: 'messaging',
        type: 'spam',
        protocol: 'smtp',
        smtp_from: 'spammer@example.com',
      };

      const result = validator.validate(report);
      expect(result.valid).toBe(true);
    });

    it('should detect invalid messaging type', () => {
      const report: XARFReport = {
        ...createValidReport(),
        category: 'messaging',
        type: 'invalid_type',
      };

      const result = validator.validate(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'type')).toBe(true);
    });

    it('should require smtp_from for SMTP messaging', () => {
      const report: XARFReport = {
        ...createValidReport(),
        category: 'messaging',
        type: 'spam',
        protocol: 'smtp',
      };

      const result = validator.validate(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'smtp_from')).toBe(true);
    });

    it('should validate connection reports', () => {
      const report = createValidReport();

      const result = validator.validate(report);
      expect(result.valid).toBe(true);
    });

    it('should require destination_ip for connection reports', () => {
      const report: any = createValidReport();
      delete report.destination_ip;

      const result = validator.validate(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'destination_ip')).toBe(true);
    });

    it('should validate port numbers', () => {
      const report = createValidReport();
      (report as any).destination_port = 70000;

      const result = validator.validate(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'destination_port')).toBe(true);
    });

    it('should validate content reports', () => {
      const report: XARFReport = {
        ...createValidReport(),
        category: 'content',
        type: 'phishing_site',
        url: 'http://phishing.example.com',
      };
      delete (report as any).destination_ip;
      delete (report as any).protocol;

      const result = validator.validate(report);
      expect(result.valid).toBe(true);
    });

    it('should require url for content reports', () => {
      const report: XARFReport = {
        ...createValidReport(),
        category: 'content',
        type: 'phishing_site',
      };
      delete (report as any).destination_ip;
      delete (report as any).protocol;

      const result = validator.validate(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'url')).toBe(true);
    });

    it('should validate URL format', () => {
      const report: XARFReport = {
        ...createValidReport(),
        category: 'content',
        type: 'phishing_site',
        url: 'not-a-valid-url',
      };
      delete (report as any).destination_ip;
      delete (report as any).protocol;

      const result = validator.validate(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'url')).toBe(true);
    });
  });

  describe('on_behalf_of validation', () => {
    it('should accept valid on_behalf_of', () => {
      const report = createValidReport();
      report.on_behalf_of = {
        org: 'Client Org',
        contact: 'client@example.com',
        domain: 'client.example.com',
      };

      const result = validator.validate(report);
      expect(result.valid).toBe(true);
    });
  });

  describe('evidence validation', () => {
    it('should accept valid evidence', () => {
      const report = createValidReport();
      report.evidence = [
        {
          content_type: 'text/plain',
          description: 'Sample evidence',
          payload: 'evidence data',
          hash: 'abc123',
        },
      ];

      const result = validator.validate(report);
      expect(result.valid).toBe(true);
    });
  });
});
