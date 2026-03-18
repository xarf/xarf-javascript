/**
 * Tests for XARF Validator
 */

import { XARFValidator } from '../src/validator';
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
    source_port: 12345,
    category: 'connection',
    type: 'ddos',
    evidence_source: 'honeypot',
    destination_ip: '203.0.113.10',
    protocol: 'tcp',
    first_seen: '2024-01-15T09:00:00Z',
  });

  describe('validate', () => {
    it('should detect missing required fields', () => {
      const report: any = {
        xarf_version: '4.0.0',
        // Missing other required fields
      };

      const result = validator.validate(report);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect invalid category', () => {
      const report = createValidReport();
      (report as any).category = 'invalid';

      const result = validator.validate(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'category')).toBe(true);
    });

    it('should return invalid result in strict mode', () => {
      const report = createValidReport();
      report.xarf_version = '3.0.0';

      const result = validator.validate(report, true);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should convert warnings to errors in strict mode', () => {
      const report = createValidReport();
      (report as any).unknownField = 'some value';

      // Non-strict: valid with warning
      const nonStrictResult = validator.validate(report, false);
      expect(nonStrictResult.valid).toBe(true);
      expect(nonStrictResult.warnings.some((w) => w.field === 'unknownField')).toBe(true);

      // Strict: warning becomes error
      const strictResult = validator.validate(report, true);
      expect(strictResult.valid).toBe(false);
      expect(strictResult.errors.some((e) => e.field === 'unknownField')).toBe(true);
    });
  });

  describe('format validation', () => {
    it('should error on invalid UUID format', () => {
      const report = createValidReport();
      report.report_id = 'not-a-valid-uuid';

      const result = validator.validate(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'report_id')).toBe(true);
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

    it('should reject invalid timestamp string', () => {
      const report = {
        xarf_version: '4.0.0',
        report_id: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: 'foo',
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
        category: 'content',
        type: 'phishing',
        evidence_source: 'honeypot',
        url: 'http://phishing.example.com',
      } as any;

      const result = validator.validate(report);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'timestamp')).toBe(true);
    });

    it('should pass with valid timestamp', () => {
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
        protocol: 'chat',
      } as unknown as XARFReport;

      const result = validator.validate(report);

      expect(result.valid).toBe(true);
    });
  });

  describe('required fields edge cases', () => {
    it('should detect missing reporter.contact', () => {
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

      const result = validator.validate(report);

      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.field.includes('reporter') && e.message.includes('contact'))
      ).toBe(true);
    });

    it('should detect missing reporter.domain', () => {
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

      const result = validator.validate(report);

      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.field.includes('reporter') && e.message.includes('domain'))
      ).toBe(true);
    });
  });

  describe('value validation', () => {
    it('should validate invalid evidence_source', () => {
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

      const result = validator.validate(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'evidence_source')).toBe(true);
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
        subject: 'Buy now!',
      };

      const result = validator.validate(report);
      expect(result.valid).toBe(true);
    });

    it('should reject unknown type', () => {
      const report: XARFReport = {
        ...createValidReport(),
        category: 'messaging',
        type: 'invalid_type',
      };

      const result = validator.validate(report);

      expect(result.valid).toBe(false);
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
      expect(result.errors.some((e) => e.message.includes('smtp_from'))).toBe(true);
    });

    it('should validate connection reports', () => {
      const report = createValidReport();

      const result = validator.validate(report);
      expect(result.valid).toBe(true);
    });

    it('should accept missing destination_ip (recommended, not required)', () => {
      const report: any = createValidReport();
      delete report.destination_ip;

      const result = validator.validate(report);

      expect(result.valid).toBe(true);
    });

    it('should reject unknown connection type', () => {
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

      const result = validator.validate(report);

      expect(result.valid).toBe(false);
    });

    it('should reject unknown content type', () => {
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

      const result = validator.validate(report);

      expect(result.valid).toBe(false);
    });

    it('should handle infrastructure category', () => {
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
        compromise_evidence: 'C2 communication observed',
      } as XARFReport;

      const result = validator.validate(report);

      expect(result.valid).toBe(true);
    });

    it('should validate content reports', () => {
      const report: XARFReport = {
        ...createValidReport(),
        category: 'content',
        type: 'phishing',
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
        type: 'phishing',
      };
      delete (report as any).destination_ip;
      delete (report as any).protocol;

      const result = validator.validate(report);

      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.message.includes('url') && e.message.includes('required'))
      ).toBe(true);
    });

    it('should validate URL format', () => {
      const report: XARFReport = {
        ...createValidReport(),
        category: 'content',
        type: 'phishing',
        url: 'not-a-valid-url',
      };
      delete (report as any).destination_ip;
      delete (report as any).protocol;

      const result = validator.validate(report);

      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.message.includes('url') || e.message.includes('format'))
      ).toBe(true);
    });

    it('should catch URL parsing error with field check', () => {
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

      const result = validator.validate(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'url')).toBe(true);
      expect(result.errors.some((e) => e.message.includes('format'))).toBe(true);
    });
  });

  describe('connection port validation', () => {
    it('should validate invalid port number (non-integer)', () => {
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

      const result = validator.validate(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'destination_port')).toBe(true);
    });

    it('should validate port number too high', () => {
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

      const result = validator.validate(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'destination_port')).toBe(true);
    });

    it('should validate negative port number', () => {
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

      const result = validator.validate(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'destination_port')).toBe(true);
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
          hash: 'sha256:abc123def456',
        },
      ];

      const result = validator.validate(report);
      expect(result.valid).toBe(true);
    });
  });

  describe('showMissingOptional flag', () => {
    it('should not include info when showMissingOptional is false', () => {
      const report = createValidReport();

      const result = validator.validate(report, false, false);

      expect(result.valid).toBe(true);
      expect(result.info).toBeUndefined();
    });

    it('should include info array when showMissingOptional is true', () => {
      const report = createValidReport();

      const result = validator.validate(report, false, true);

      expect(result.valid).toBe(true);
      expect(result.info).toBeDefined();
      expect(Array.isArray(result.info)).toBe(true);
    });

    it('should list missing optional fields from core schema', () => {
      const report = createValidReport();

      const result = validator.validate(report, false, true);

      expect(result.info).toBeDefined();
      const infoFields = result.info!.map((i) => i.field);
      expect(infoFields).toContain('description');
      expect(infoFields).toContain('confidence');
      expect(infoFields).toContain('tags');
    });

    it('should include type-specific optional fields', () => {
      const report = createValidReport();

      const result = validator.validate(report, false, true);

      expect(result.info).toBeDefined();
      const infoFields = result.info!.map((i) => i.field);
      expect(infoFields).toContain('destination_port');
    });

    it('should not list fields that are present in the report', () => {
      const report = createValidReport();
      report.description = 'This is a test description';
      report.confidence = 0.95;

      const result = validator.validate(report, false, true);

      expect(result.info).toBeDefined();
      const infoFields = result.info!.map((i) => i.field);
      expect(infoFields).not.toContain('description');
      expect(infoFields).not.toContain('confidence');
    });

    it('should include description from schema in info message', () => {
      const report = createValidReport();

      const result = validator.validate(report, false, true);

      expect(result.info).toBeDefined();
      const descriptionInfo = result.info!.find((i) => i.field === 'description');
      expect(descriptionInfo).toBeDefined();
      expect(descriptionInfo!.message).toContain('OPTIONAL');
    });

    it('should include optional fields from content-base.json via $ref', () => {
      const report = {
        xarf_version: '4.0.0',
        report_id: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: '2024-01-15T10:30:00Z',
        reporter: { org: 'Test', contact: 'test@example.com', domain: 'example.com' },
        sender: { org: 'Test', contact: 'test@example.com', domain: 'example.com' },
        source_identifier: '192.0.2.1',
        category: 'content',
        type: 'phishing',
        url: 'https://phishing.example.com/login',
        confidence: 0.95,
        evidence: [{ content_type: 'text/plain', payload: 'dGVzdA==', description: 'test' }],
        verified_at: '2024-01-15T10:30:00Z',
        verification_method: 'manual',
        target_brand: 'TestBrand',
        domain: 'phishing.example.com',
      } as XARFReport;

      const result = validator.validate(report, false, true);

      expect(result.info).toBeDefined();
      const infoFields = result.info!.map((i) => i.field);
      expect(infoFields).toContain('registrar');
      expect(infoFields).toContain('hosting_provider');
      expect(infoFields).toContain('country_code');
    });

    it('should mark recommended fields appropriately', () => {
      const report = createValidReport();

      const result = validator.validate(report, false, true);

      expect(result.info).toBeDefined();
      const confidenceInfo = result.info!.find((i) => i.field === 'confidence');
      expect(confidenceInfo).toBeDefined();
      expect(confidenceInfo!.message).toContain('RECOMMENDED');
    });
  });

  describe('unknown fields detection', () => {
    it('should warn about unknown fields in report', () => {
      const report = createValidReport();
      (report as any).unknownField = 'some value';
      (report as any).anotherUnknown = 123;

      const result = validator.validate(report);

      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThanOrEqual(2);
      const unknownFieldWarnings = result.warnings.filter((w) =>
        w.message.includes('Unknown field')
      );
      expect(unknownFieldWarnings.length).toBe(2);
      expect(unknownFieldWarnings.map((w) => w.field)).toContain('unknownField');
      expect(unknownFieldWarnings.map((w) => w.field)).toContain('anotherUnknown');
    });

    it('should include the unknown field value in warning', () => {
      const report = createValidReport();
      (report as any).customField = 'test value';

      const result = validator.validate(report);

      const warning = result.warnings.find((w) => w.field === 'customField');
      expect(warning).toBeDefined();
      expect(warning!.value).toBe('test value');
    });

    it('should not warn about known core schema fields', () => {
      const report = createValidReport();
      report.description = 'This is a description';
      report.confidence = 0.95;
      report.tags = ['test'];

      const result = validator.validate(report);

      const unknownFieldWarnings = result.warnings.filter((w) =>
        w.message.includes('Unknown field')
      );
      expect(unknownFieldWarnings.map((w) => w.field)).not.toContain('description');
      expect(unknownFieldWarnings.map((w) => w.field)).not.toContain('confidence');
      expect(unknownFieldWarnings.map((w) => w.field)).not.toContain('tags');
    });

    it('should not warn about known category-specific fields', () => {
      const report = createValidReport();
      report.destination_port = 443;

      const result = validator.validate(report);

      const unknownFieldWarnings = result.warnings.filter((w) =>
        w.message.includes('Unknown field')
      );
      expect(unknownFieldWarnings.map((w) => w.field)).not.toContain('destination_port');
    });

    it('should treat unknown fields as errors in strict mode', () => {
      const report = createValidReport();
      (report as any).unknownField = 'some value';

      const result = validator.validate(report, true);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'unknownField')).toBe(true);
    });
  });
});
