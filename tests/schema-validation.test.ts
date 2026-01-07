/**
 * JSON Schema Validation Tests
 *
 * Tests comprehensive JSON schema validation and compares with hand-coded validator.
 * Ensures schema validation catches all errors and validates backward compatibility.
 */

import { SchemaValidator } from '../src/schema-validator';
import { XARFValidator } from '../src/validator';
import type { XARFReport, XARFCategory } from '../src/types';

describe('JSON Schema Validation', () => {
  let schemaValidator: SchemaValidator;
  let handCodedValidator: XARFValidator;

  beforeEach(() => {
    schemaValidator = new SchemaValidator();
    handCodedValidator = new XARFValidator();
  });

  const createValidReport = (category: XARFCategory = 'connection'): XARFReport => ({
    xarf_version: '4.0.0',
    report_id: '550e8400-e29b-41d4-a716-446655440000',
    timestamp: '2024-01-15T14:30:25Z',
    reporter: {
      org: 'Security Corp',
      contact: 'abuse@security.com',
      domain: 'security.com',
    },
    sender: {
      org: 'Security Corp',
      contact: 'abuse@security.com',
      domain: 'security.com',
    },
    source_identifier: '192.0.2.100',
    category,
    type: category === 'messaging' ? 'spam' : category === 'connection' ? 'ddos' : 'phishing',
    evidence_source: 'honeypot',
    ...(category === 'connection' && {
      destination_ip: '203.0.113.10',
      protocol: 'tcp',
    }),
    ...(category === 'content' && {
      url: 'http://example.com',
    }),
    ...(category === 'messaging' && {
      protocol: 'smtp',
      smtp_from: 'spammer@evil.com',
    }),
  });

  describe('1. Valid reports pass schema validation', () => {
    it('should validate basic connection report', () => {
      const report = createValidReport('connection');
      const result = schemaValidator.validateCore(report);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate messaging report', () => {
      const report = createValidReport('messaging');
      const result = schemaValidator.validateCore(report);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate content report', () => {
      const report = createValidReport('content');
      const result = schemaValidator.validateCore(report);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate report with optional fields', () => {
      const report = createValidReport('connection');
      report.description = 'DDoS attack description';
      report.severity = 'high';
      report.confidence = 0.95;
      report.tags = ['malware:botnet', 'attack:ddos'];

      const result = schemaValidator.validateCore(report);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate report with evidence array', () => {
      const report = createValidReport('connection');
      report.evidence = [
        {
          content_type: 'text/plain',
          description: 'Network logs',
          payload: Buffer.from('test data').toString('base64'),
          hash: 'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        },
      ];

      const result = schemaValidator.validateCore(report);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('2. Invalid reports fail with proper errors', () => {
    it('should fail when missing required field (report_id)', () => {
      const report = createValidReport();
      delete (report as any).report_id;

      const result = schemaValidator.validateCore(report);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e: string) => e.includes('report_id'))).toBe(true);
    });

    it('should fail when xarf_version has wrong format', () => {
      const report = createValidReport();
      report.xarf_version = '3.0.0';

      const result = schemaValidator.validateCore(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes('xarf_version'))).toBe(true);
    });

    it('should fail when report_id is not a UUID', () => {
      const report = createValidReport();
      report.report_id = 'not-a-uuid';

      const result = schemaValidator.validateCore(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes('report_id'))).toBe(true);
    });

    it('should fail when timestamp is not ISO 8601', () => {
      const report = createValidReport();
      report.timestamp = '2024-01-15 10:30:00';

      const result = schemaValidator.validateCore(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes('timestamp'))).toBe(true);
    });

    it('should fail when reporter.contact is not an email', () => {
      const report = createValidReport();
      report.reporter.contact = 'not-an-email';

      const result = schemaValidator.validateCore(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes('reporter/contact'))).toBe(true);
    });

    it('should fail when reporter.domain is not a hostname', () => {
      const report = createValidReport();
      report.reporter.domain = 'invalid domain with spaces';

      const result = schemaValidator.validateCore(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes('reporter/domain'))).toBe(true);
    });

    it('should fail when category is invalid', () => {
      const report = createValidReport();
      (report as any).category = 'invalid_category';

      const result = schemaValidator.validateCore(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes('category'))).toBe(true);
    });

    it('should fail when confidence is out of range', () => {
      const report = createValidReport();
      report.confidence = 1.5;

      const result = schemaValidator.validateCore(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes('confidence'))).toBe(true);
    });

    it('should fail when tags have wrong format', () => {
      const report = createValidReport();
      report.tags = ['invalid-tag-without-colon'];

      const result = schemaValidator.validateCore(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes('tags'))).toBe(true);
    });

    it('should fail when evidence hash has wrong format', () => {
      const report = createValidReport();
      report.evidence = [
        {
          content_type: 'text/plain',
          description: 'Test',
          payload: 'dGVzdA==',
          hash: 'invalid-hash-format',
        },
      ];

      const result = schemaValidator.validateCore(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes('hash'))).toBe(true);
    });
  });

  describe('3. All 7 categories with schema validation', () => {
    const categories: XARFCategory[] = [
      'messaging',
      'connection',
      'content',
      'infrastructure',
      'copyright',
      'vulnerability',
      'reputation',
    ];

    categories.forEach((category) => {
      it(`should validate ${category} category against schema`, () => {
        const report = createValidReport(category);
        const result = schemaValidator.validateCore(report);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it(`should fail ${category} category when missing required fields`, () => {
        const report: any = {
          category,
          type: 'test',
        };

        const result = schemaValidator.validateCore(report);

        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('4. Schema validation catches errors hand-coded validator misses', () => {
    it('should catch when description exceeds maxLength', async () => {
      const report = createValidReport();
      report.description = 'x'.repeat(1001);

      const schemaResult = schemaValidator.validateCore(report);
      const handCodedResult = await handCodedValidator.validate(report);

      // Schema catches length violation
      expect(schemaResult.valid).toBe(false);
      expect(schemaResult.errors.some((e: string) => e.includes('description'))).toBe(true);
      // Hand-coded validator doesn't check this
      expect(handCodedResult.valid).toBe(true);
    });

    it('should catch when tags array exceeds maxItems', async () => {
      const report = createValidReport();
      report.tags = Array(21).fill('tag:value');

      const schemaResult = schemaValidator.validateCore(report);
      const handCodedResult = await handCodedValidator.validate(report);

      // Schema catches array length violation
      expect(schemaResult.valid).toBe(false);
      expect(schemaResult.errors.some((e: string) => e.includes('tags'))).toBe(true);
      // Hand-coded validator doesn't check this
      expect(handCodedResult.valid).toBe(true);
    });

    it('should catch when evidence array exceeds maxItems', async () => {
      const report = createValidReport();
      report.evidence = Array(51)
        .fill(null)
        .map(() => ({
          content_type: 'text/plain',
          description: 'Test evidence',
          payload: 'dGVzdA==',
        }));

      const schemaResult = schemaValidator.validateCore(report);
      const handCodedResult = await handCodedValidator.validate(report);

      // Schema catches array length violation
      expect(schemaResult.valid).toBe(false);
      expect(schemaResult.errors.some((e: string) => e.includes('evidence'))).toBe(true);
      // Hand-coded validator doesn't check this
      expect(handCodedResult.valid).toBe(true);
    });

    it('should catch when reporter.org exceeds maxLength', async () => {
      const report = createValidReport();
      report.reporter.org = 'x'.repeat(201);

      const schemaResult = schemaValidator.validateCore(report);
      const handCodedResult = await handCodedValidator.validate(report);

      // Schema catches length violation
      expect(schemaResult.valid).toBe(false);
      expect(schemaResult.errors.some((e: string) => e.includes('reporter/org'))).toBe(true);
      // Hand-coded validator doesn't check this
      expect(handCodedResult.valid).toBe(true);
    });

    it('should catch when source_port is out of valid range', async () => {
      const report = createValidReport();
      (report as any).source_port = 70000;

      const schemaResult = schemaValidator.validateCore(report);
      const handCodedResult = await handCodedValidator.validate(report);

      // Schema catches port range violation
      expect(schemaResult.valid).toBe(false);
      expect(schemaResult.errors.some((e: string) => e.includes('source_port'))).toBe(true);
      // Hand-coded validator doesn't validate source_port
      expect(handCodedResult.valid).toBe(true);
    });

    it('should catch additional properties in ContactInfo', async () => {
      const report = createValidReport();
      (report.reporter as any).extra_field = 'value';

      const schemaResult = schemaValidator.validateCore(report);
      const handCodedResult = await handCodedValidator.validate(report);

      // Schema has additionalProperties: false for ContactInfo
      expect(schemaResult.valid).toBe(false);
      expect(schemaResult.errors.some((e: string) => e.includes('reporter'))).toBe(true);
      // Hand-coded allows additional properties
      expect(handCodedResult.valid).toBe(true);
    });
  });

  describe('5. Backward compatibility - existing tests still pass', () => {
    it('should validate reports that pass hand-coded validator', async () => {
      const report = createValidReport('connection');
      const handCodedResult = await handCodedValidator.validate(report);

      expect(handCodedResult.valid).toBe(true);

      const schemaResult = schemaValidator.validateCore(report);

      expect(schemaResult.valid).toBe(true);
    });

    it('should validate messaging report with all fields', async () => {
      const report: XARFReport = {
        xarf_version: '4.0.0',
        report_id: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: '2024-01-15T14:30:25Z',
        reporter: {
          org: 'Security Corp',
          contact: 'abuse@security.com',
          domain: 'security.com',
        },
        sender: {
          org: 'Security Corp',
          contact: 'abuse@security.com',
          domain: 'security.com',
        },
        source_identifier: '192.0.2.100',
        category: 'messaging',
        type: 'spam',
        evidence_source: 'spamtrap',
        protocol: 'smtp',
        smtp_from: 'spammer@evil.com',
        smtp_to: 'victim@example.com',
        subject: 'Get rich quick!',
      };

      const handCodedResult = await handCodedValidator.validate(report);
      expect(handCodedResult.valid).toBe(true);

      const schemaResult = schemaValidator.validateCore(report);
      expect(schemaResult.valid).toBe(true);
    });

    it('should validate content report with URL', async () => {
      const report: XARFReport = {
        xarf_version: '4.0.0',
        report_id: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: '2024-01-15T14:30:25Z',
        reporter: {
          org: 'Security Corp',
          contact: 'abuse@security.com',
          domain: 'security.com',
        },
        sender: {
          org: 'Security Corp',
          contact: 'abuse@security.com',
          domain: 'security.com',
        },
        source_identifier: '192.0.2.100',
        category: 'content',
        type: 'phishing',
        evidence_source: 'automated_scan',
        url: 'http://phishing.example.com',
      };

      const handCodedResult = await handCodedValidator.validate(report);
      expect(handCodedResult.valid).toBe(true);

      const schemaResult = schemaValidator.validateCore(report);
      expect(schemaResult.valid).toBe(true);
    });
  });

  describe('6. Reports that violate schema but not hand-coded rules', () => {
    it('should catch report with legacy_version other than "3"', async () => {
      const report = createValidReport();
      (report as any).legacy_version = '2';

      const schemaResult = schemaValidator.validateCore(report);
      const handCodedResult = await handCodedValidator.validate(report);

      // Schema enforces legacy_version must be "3" if present
      expect(schemaResult.valid).toBe(false);
      expect(schemaResult.errors.some((e: string) => e.includes('legacy_version'))).toBe(true);
      // Hand-coded doesn't validate legacy_version
      expect(handCodedResult.valid).toBe(true);
    });

    it('should catch evidence item missing required payload field', async () => {
      const report = createValidReport();
      report.evidence = [
        {
          content_type: 'text/plain',
          description: 'Missing payload',
        } as any,
      ];

      const schemaResult = schemaValidator.validateCore(report);
      const handCodedResult = await handCodedValidator.validate(report);

      // Schema enforces required payload field
      expect(schemaResult.valid).toBe(false);
      expect(schemaResult.errors.some((e: string) => e.includes('payload'))).toBe(true);
      // Hand-coded doesn't validate evidence structure deeply
      expect(handCodedResult.valid).toBe(true);
    });
  });

  describe('7. Compare schema vs hand-coded validator results', () => {
    it('should both pass for valid report', async () => {
      const report = createValidReport();

      const schemaResult = schemaValidator.validateCore(report);
      const handCodedResult = await handCodedValidator.validate(report);

      expect(schemaResult.valid).toBe(true);
      expect(handCodedResult.valid).toBe(true);
      expect(handCodedResult.errors.length).toBe(0);
    });

    it('should both fail for report missing required field', async () => {
      const report = createValidReport();
      delete (report as any).timestamp;

      const schemaResult = schemaValidator.validateCore(report);
      const handCodedResult = await handCodedValidator.validate(report);

      // Both should fail
      expect(schemaResult.valid).toBe(false);
      expect(handCodedResult.valid).toBe(false);
    });

    it('should both fail for invalid email format', async () => {
      const report = createValidReport();
      report.reporter.contact = 'invalid-email';

      const schemaResult = schemaValidator.validateCore(report);
      const handCodedResult = await handCodedValidator.validate(report);

      // Both should fail
      expect(schemaResult.valid).toBe(false);
      expect(handCodedResult.valid).toBe(false);
      expect(handCodedResult.errors.some((e) => e.field === 'reporter.contact')).toBe(true);
    });

    it('should both fail for invalid confidence value', async () => {
      const report = createValidReport();
      report.confidence = 2.5;

      const schemaResult = schemaValidator.validateCore(report);
      const handCodedResult = await handCodedValidator.validate(report);

      // Both should fail
      expect(schemaResult.valid).toBe(false);
      expect(handCodedResult.valid).toBe(false);
      expect(handCodedResult.errors.some((e) => e.field === 'confidence')).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should validate 100 reports quickly', () => {
      const reports = Array(100)
        .fill(null)
        .map(() => createValidReport());

      const startTime = performance.now();
      reports.forEach((report) => {
        schemaValidator.validateCore(report);
      });
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(1000); // Should be fast even with 100 reports
    });

    it('should handle validation errors efficiently', () => {
      const invalidReports = Array(100)
        .fill(null)
        .map(() => {
          const report = createValidReport();
          delete (report as any).report_id;
          return report;
        });

      const startTime = performance.now();
      invalidReports.forEach((report) => {
        schemaValidator.validateCore(report);
      });
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(1500); // Should still be reasonably fast
    });
  });
});
