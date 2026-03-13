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

  const categoryTypeMap: Record<XARFCategory, string> = {
    messaging: 'spam',
    connection: 'ddos',
    content: 'phishing',
    infrastructure: 'botnet',
    copyright: 'copyright',
    vulnerability: 'cve',
    reputation: 'blocklist',
  };

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
    type: categoryTypeMap[category],
    evidence_source: 'honeypot',
    ...(category === 'connection' && {
      destination_ip: '203.0.113.10',
      protocol: 'tcp',
      first_seen: '2024-01-15T09:00:00Z',
      source_port: 12345,
    }),
    ...(category === 'content' && {
      url: 'http://example.com',
    }),
    ...(category === 'messaging' && {
      protocol: 'smtp',
      smtp_from: 'spammer@evil.com',
      source_port: 25,
    }),
    ...(category === 'infrastructure' && {
      compromise_evidence: 'C2 communication observed',
    }),
    ...(category === 'copyright' && {
      infringing_url: 'http://pirate.example.com/content',
    }),
    ...(category === 'vulnerability' && {
      service: 'Apache HTTP Server',
      service_port: 80,
      cve_id: 'CVE-2021-44228',
      evidence_source: 'vulnerability_scan',
    }),
    ...(category === 'reputation' && {
      threat_type: 'spam_source',
    }),
  });

  describe('1. Valid reports pass schema validation', () => {
    it('should validate basic connection report', () => {
      const report = createValidReport('connection');
      const result = schemaValidator.validate(report);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate messaging report', () => {
      const report = createValidReport('messaging');
      const result = schemaValidator.validate(report);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate content report', () => {
      const report = createValidReport('content');
      const result = schemaValidator.validate(report);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate report with optional fields', () => {
      const report = createValidReport('connection');
      report.description = 'DDoS attack description';
      report.severity = 'high';
      report.confidence = 0.95;
      report.tags = ['malware:botnet', 'attack:ddos'];

      const result = schemaValidator.validate(report);

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

      const result = schemaValidator.validate(report);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('2. Invalid reports fail with proper errors', () => {
    it('should fail when missing required field (report_id)', () => {
      const report = createValidReport();
      delete (report as any).report_id;

      const result = schemaValidator.validate(report);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e: string) => e.includes('report_id'))).toBe(true);
    });

    it('should fail when xarf_version has wrong format', () => {
      const report = createValidReport();
      report.xarf_version = '3.0.0';

      const result = schemaValidator.validate(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes('xarf_version'))).toBe(true);
    });

    it('should fail when report_id is not a UUID', () => {
      const report = createValidReport();
      report.report_id = 'not-a-uuid';

      const result = schemaValidator.validate(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes('report_id'))).toBe(true);
    });

    it('should fail when timestamp is not ISO 8601', () => {
      const report = createValidReport();
      report.timestamp = '2024-01-15 10:30:00';

      const result = schemaValidator.validate(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes('timestamp'))).toBe(true);
    });

    it('should fail when reporter.contact is not an email', () => {
      const report = createValidReport();
      report.reporter.contact = 'not-an-email';

      const result = schemaValidator.validate(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes('reporter/contact'))).toBe(true);
    });

    it('should fail when reporter.domain is not a hostname', () => {
      const report = createValidReport();
      report.reporter.domain = 'invalid domain with spaces';

      const result = schemaValidator.validate(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes('reporter/domain'))).toBe(true);
    });

    it('should fail when category is invalid', () => {
      const report = createValidReport();
      (report as any).category = 'invalid_category';

      const result = schemaValidator.validate(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes('category'))).toBe(true);
    });

    it('should fail when confidence is out of range', () => {
      const report = createValidReport();
      report.confidence = 1.5;

      const result = schemaValidator.validate(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes('confidence'))).toBe(true);
    });

    it('should fail when tags have wrong format', () => {
      const report = createValidReport();
      report.tags = ['invalid-tag-without-colon'];

      const result = schemaValidator.validate(report);

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

      const result = schemaValidator.validate(report);

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
        const result = schemaValidator.validate(report);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it(`should fail ${category} category when missing required fields`, () => {
        const report: any = {
          category,
          type: 'test',
        };

        const result = schemaValidator.validate(report);

        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('4. Schema validation catches constraint violations', () => {
    it('should catch when description exceeds maxLength', () => {
      const report = createValidReport();
      report.description = 'x'.repeat(1001);

      const result = handCodedValidator.validate(report);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'description')).toBe(true);
    });

    it('should catch when tags array exceeds maxItems', () => {
      const report = createValidReport();
      report.tags = Array(21).fill('tag:value');

      const result = handCodedValidator.validate(report);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'tags')).toBe(true);
    });

    it('should catch when evidence array exceeds maxItems', () => {
      const report = createValidReport();
      report.evidence = Array(51)
        .fill(null)
        .map(() => ({
          content_type: 'text/plain',
          description: 'Test evidence',
          payload: 'dGVzdA==',
        }));

      const result = handCodedValidator.validate(report);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'evidence')).toBe(true);
    });

    it('should catch when reporter.org exceeds maxLength', () => {
      const report = createValidReport();
      report.reporter.org = 'x'.repeat(201);

      const result = handCodedValidator.validate(report);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field.includes('reporter'))).toBe(true);
    });

    it('should catch when source_port is out of valid range', () => {
      const report = createValidReport();
      (report as any).source_port = 70000;

      const result = handCodedValidator.validate(report);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'source_port')).toBe(true);
    });

    it('should catch additional properties in ContactInfo', () => {
      const report = createValidReport();
      (report.reporter as any).extra_field = 'value';

      const result = handCodedValidator.validate(report);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field.includes('reporter'))).toBe(true);
    });
  });

  describe('5. Valid reports pass validator', () => {
    it('should validate connection report', () => {
      const report = createValidReport('connection');
      const result = handCodedValidator.validate(report);
      expect(result.valid).toBe(true);
    });

    it('should validate messaging report with all fields', () => {
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
        source_port: 25,
      };

      const result = handCodedValidator.validate(report);
      expect(result.valid).toBe(true);
    });

    it('should validate content report with URL', () => {
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

      const result = handCodedValidator.validate(report);
      expect(result.valid).toBe(true);
    });
  });

  describe('6. Schema catches structural violations', () => {
    it('should catch report with legacy_version other than "3"', () => {
      const report = createValidReport();
      (report as any).legacy_version = '2';

      const result = handCodedValidator.validate(report);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'legacy_version')).toBe(true);
    });

    it('should catch evidence item missing required payload field', () => {
      const report = createValidReport();
      report.evidence = [
        {
          content_type: 'text/plain',
          description: 'Missing payload',
        } as any,
      ];

      const result = handCodedValidator.validate(report);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('payload'))).toBe(true);
    });
  });

  describe('7. Validator uses schema validation for all checks', () => {
    it('should pass for valid report', () => {
      const report = createValidReport();
      const result = handCodedValidator.validate(report);

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should fail for report missing required field', () => {
      const report = createValidReport();
      delete (report as any).timestamp;

      const result = handCodedValidator.validate(report);
      expect(result.valid).toBe(false);
    });

    it('should fail for invalid email format', () => {
      const report = createValidReport();
      report.reporter.contact = 'invalid-email';

      const result = handCodedValidator.validate(report);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'reporter.contact')).toBe(true);
    });

    it('should fail for invalid confidence value', () => {
      const report = createValidReport();
      report.confidence = 2.5;

      const result = handCodedValidator.validate(report);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'confidence')).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should validate 100 reports quickly', () => {
      const reports = Array(100)
        .fill(null)
        .map(() => createValidReport());

      const startTime = performance.now();
      reports.forEach((report) => {
        schemaValidator.validate(report);
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
        schemaValidator.validate(report);
      });
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(1500); // Should still be reasonably fast
    });
  });

  describe('8. Strict mode enforces x-recommended fields as required', () => {
    it('should pass in normal mode when recommended fields are missing', () => {
      const report: XARFReport = {
        ...createValidReport('messaging'),
        // source_port is conditionally required for smtp, so provide it
        source_port: 25,
      };
      // Core recommended fields (confidence, evidence) are not provided
      // These are x-recommended, not required, so non-strict mode should pass
      delete (report as any).confidence;
      delete (report as any).evidence;

      const result = schemaValidator.validate(report, false);
      expect(result.valid).toBe(true);
    });

    it('should fail in strict mode when core recommended fields are missing', () => {
      const report = createValidReport('connection');
      delete (report as any).confidence;

      const result = schemaValidator.validate(report, true);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes('confidence'))).toBe(true);
    });

    it('should pass in strict mode when all recommended fields are present', () => {
      const report: XARFReport = {
        ...createValidReport('connection'),
        source_port: 12345,
        evidence_source: 'honeypot',
        confidence: 0.95,
        evidence: [
          {
            content_type: 'text/plain',
            payload: 'dGVzdA==',
            description: 'Test evidence',
            hash: 'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          },
        ],
      };

      const result = schemaValidator.validate(report, true);
      // May still have type-specific recommended field errors, but core should pass
      const coreRecommendedErrors = result.errors.filter(
        (e: string) =>
          e.includes('confidence') || e.includes('source_port') || e.includes("'evidence'")
      );
      expect(coreRecommendedErrors).toHaveLength(0);
    });

    it('should fail in strict mode when nested evidence_item recommended fields are missing', () => {
      const report = {
        ...createValidReport('connection'),
        source_port: 12345,
        confidence: 0.95,
        evidence: [
          {
            content_type: 'text/plain',
            payload: 'dGVzdA==',
            // Missing recommended: description, hash
          },
        ],
      } as unknown as XARFReport;

      const result = schemaValidator.validate(report, true);
      expect(result.valid).toBe(false);
      // Should flag missing description and/or hash in evidence items
      const evidenceErrors = result.errors.filter(
        (e: string) => e.includes('description') || e.includes('hash')
      );
      expect(evidenceErrors.length).toBeGreaterThan(0);
    });

    it('should fail in strict mode for missing type-specific recommended fields', () => {
      const report: XARFReport = {
        xarf_version: '4.0.0',
        report_id: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: '2024-01-15T14:30:25Z',
        reporter: { org: 'Test', contact: 'abuse@test.com', domain: 'test.com' },
        sender: { org: 'Test', contact: 'abuse@test.com', domain: 'test.com' },
        source_identifier: '192.0.2.1',
        source_port: 25,
        category: 'messaging',
        type: 'spam',
        evidence_source: 'spamtrap',
        confidence: 0.9,
        evidence: [
          {
            content_type: 'text/plain',
            payload: 'dGVzdA==',
            description: 'spam email',
            hash: 'sha256:abc123',
          },
        ],
        protocol: 'smtp',
        smtp_from: 'spammer@evil.com',
        // Missing type-specific recommended: smtp_to, subject, message_id
      };

      const result = schemaValidator.validate(report, true);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some(
          (e: string) => e.includes('smtp_to') || e.includes('subject') || e.includes('message_id')
        )
      ).toBe(true);
    });
  });

  describe('9. transformSchemaForStrict', () => {
    it('should promote x-recommended properties to required', () => {
      const schema = {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' },
          email: { type: 'string', 'x-recommended': true },
        },
      };

      const transformed = schemaValidator.transformSchemaForStrict(schema) as any;
      expect(transformed.required).toContain('name');
      expect(transformed.required).toContain('email');
    });

    it('should handle nested objects in $defs', () => {
      const schema = {
        type: 'object',
        properties: {},
        $defs: {
          nested: {
            type: 'object',
            required: ['id'],
            properties: {
              id: { type: 'string' },
              label: { type: 'string', 'x-recommended': true },
            },
          },
        },
      };

      const transformed = schemaValidator.transformSchemaForStrict(schema) as any;
      expect(transformed.$defs.nested.required).toContain('id');
      expect(transformed.$defs.nested.required).toContain('label');
    });

    it('should handle allOf composition', () => {
      const schema = {
        allOf: [
          { $ref: '../xarf-core.json' },
          {
            required: ['protocol'],
            properties: {
              protocol: { type: 'string' },
              smtp_to: { type: 'string', 'x-recommended': true },
            },
          },
        ],
      };

      const transformed = schemaValidator.transformSchemaForStrict(schema) as any;
      expect(transformed.allOf[1].required).toContain('protocol');
      expect(transformed.allOf[1].required).toContain('smtp_to');
    });

    it('should not mutate the original schema', () => {
      const schema = {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' },
          email: { type: 'string', 'x-recommended': true },
        },
      };

      schemaValidator.transformSchemaForStrict(schema);
      expect(schema.required).toEqual(['name']);
    });
  });
});
