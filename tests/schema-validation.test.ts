/**
 * Tests for SchemaValidator
 *
 * Tests JSON schema validation against the official XARF v4 schemas.
 */

import { SchemaValidator } from '../src/schema-validator';
import { XARFValidator } from '../src/validator';
import type { XARFReport } from '../src/types';
import { validReports, getReport } from './fixtures';

describe('SchemaValidator', () => {
  let schemaValidator: SchemaValidator;

  beforeEach(() => {
    schemaValidator = new SchemaValidator();
  });

  describe('valid reports — all 32 category/type combinations', () => {
    it.each(Object.keys(validReports))('should validate %s', (key) => {
      const result = schemaValidator.validate(validReports[key]);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('valid reports — optional and evidence fields', () => {
    it('should validate report with optional fields', () => {
      const report = getReport('connection/ddos');
      report.description = 'DDoS attack description';
      report.severity = 'high';
      report.confidence = 0.95;
      report.tags = ['malware:botnet', 'attack:ddos'];

      const result = schemaValidator.validate(report);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate report with evidence array', () => {
      const report = getReport('connection/ddos');
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

  describe('invalid reports', () => {
    it('should fail when missing required field (report_id)', () => {
      const report = getReport('connection/ddos');
      delete (report as any).report_id;

      const result = schemaValidator.validate(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes('report_id'))).toBe(true);
    });

    it('should fail when xarf_version has wrong value', () => {
      const report = getReport('connection/ddos');
      report.xarf_version = '3.0.0';

      const result = schemaValidator.validate(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes('xarf_version'))).toBe(true);
    });

    it('should fail when report_id is not a UUID', () => {
      const report = getReport('connection/ddos');
      report.report_id = 'not-a-uuid';

      const result = schemaValidator.validate(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes('report_id'))).toBe(true);
    });

    it('should fail when timestamp is not ISO 8601', () => {
      const report = getReport('connection/ddos');
      report.timestamp = '2024-01-15 10:30:00';

      const result = schemaValidator.validate(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes('timestamp'))).toBe(true);
    });

    it('should fail when reporter.contact is not an email', () => {
      const report = getReport('connection/ddos');
      report.reporter.contact = 'not-an-email';

      const result = schemaValidator.validate(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes('reporter/contact'))).toBe(true);
    });

    it('should fail when reporter.domain is not a hostname', () => {
      const report = getReport('connection/ddos');
      report.reporter.domain = 'invalid domain with spaces';

      const result = schemaValidator.validate(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes('reporter/domain'))).toBe(true);
    });

    it('should fail when category is invalid', () => {
      const report = getReport('connection/ddos');
      (report as any).category = 'invalid_category';

      const result = schemaValidator.validate(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes('category'))).toBe(true);
    });

    it('should fail when confidence is out of range', () => {
      const report = getReport('connection/ddos');
      report.confidence = 1.5;

      const result = schemaValidator.validate(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes('confidence'))).toBe(true);
    });

    it('should fail when tags have wrong format', () => {
      const report = getReport('connection/ddos');
      report.tags = ['invalid-tag-without-colon'];

      const result = schemaValidator.validate(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes('tags'))).toBe(true);
    });

    it('should fail when evidence hash has wrong format', () => {
      const report = getReport('connection/ddos');
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

  describe('constraint violations', () => {
    let validator: XARFValidator;

    beforeEach(() => {
      validator = new XARFValidator();
    });

    it('should reject description exceeding maxLength', () => {
      const report = getReport('connection/ddos');
      report.description = 'x'.repeat(1001);

      const result = validator.validate(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'description')).toBe(true);
    });

    it('should reject tags array exceeding maxItems', () => {
      const report = getReport('connection/ddos');
      report.tags = Array(21).fill('tag:value');

      const result = validator.validate(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'tags')).toBe(true);
    });

    it('should reject evidence array exceeding maxItems', () => {
      const report = getReport('connection/ddos');
      report.evidence = Array(51)
        .fill(null)
        .map(() => ({
          content_type: 'text/plain',
          description: 'Test evidence',
          payload: 'dGVzdA==',
        }));

      const result = validator.validate(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'evidence')).toBe(true);
    });

    it('should reject reporter.org exceeding maxLength', () => {
      const report = getReport('connection/ddos');
      report.reporter.org = 'x'.repeat(201);

      const result = validator.validate(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field.includes('reporter'))).toBe(true);
    });

    it('should reject source_port out of valid range', () => {
      const report = getReport('connection/ddos');
      (report as any).source_port = 70000;

      const result = validator.validate(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'source_port')).toBe(true);
    });

    it('should reject additional properties in ContactInfo', () => {
      const report = getReport('connection/ddos');
      (report.reporter as any).extra_field = 'value';

      const result = validator.validate(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field.includes('reporter'))).toBe(true);
    });

    it('should reject legacy_version other than "3"', () => {
      const report = getReport('connection/ddos');
      (report as any).legacy_version = '2';

      const result = validator.validate(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'legacy_version')).toBe(true);
    });

    it('should reject evidence item missing required payload field', () => {
      const report = getReport('connection/ddos');
      report.evidence = [
        {
          content_type: 'text/plain',
          description: 'Missing payload',
        } as any,
      ];

      const result = validator.validate(report);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('payload'))).toBe(true);
    });
  });

  describe('strict mode (x-recommended promotion)', () => {
    it('should pass in normal mode when recommended fields are missing', () => {
      const report = getReport('messaging/spam');
      delete (report as any).confidence;
      delete (report as any).evidence;

      const result = schemaValidator.validate(report, false);

      expect(result.valid).toBe(true);
    });

    it('should fail in strict mode when core recommended fields are missing', () => {
      const report = getReport('connection/ddos');
      delete (report as any).confidence;

      const result = schemaValidator.validate(report, true);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes('confidence'))).toBe(true);
    });

    it('should pass in strict mode when all recommended fields are present', () => {
      const report: XARFReport = {
        ...getReport('connection/ddos'),
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
      const coreRecommendedErrors = result.errors.filter(
        (e: string) =>
          e.includes('confidence') || e.includes('source_port') || e.includes("'evidence'")
      );
      expect(coreRecommendedErrors).toHaveLength(0);
    });

    it('should fail when nested evidence recommended fields are missing', () => {
      const report = {
        ...getReport('connection/ddos'),
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
      const evidenceErrors = result.errors.filter(
        (e: string) => e.includes('description') || e.includes('hash')
      );
      expect(evidenceErrors.length).toBeGreaterThan(0);
    });

    it('should fail when type-specific recommended fields are missing', () => {
      const report = getReport('messaging/spam');
      report.confidence = 0.9;
      report.evidence = [
        {
          content_type: 'text/plain',
          payload: 'dGVzdA==',
          description: 'spam email',
          hash: 'sha256:abc123',
        },
      ];
      // Missing type-specific recommended: smtp_to, subject, message_id

      const result = schemaValidator.validate(report, true);

      expect(result.valid).toBe(false);
      expect(
        result.errors.some(
          (e: string) => e.includes('smtp_to') || e.includes('subject') || e.includes('message_id')
        )
      ).toBe(true);
    });
  });

  describe('transformSchemaForStrict', () => {
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
