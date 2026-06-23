/**
 * Tests for XARF Parser
 */

import { parse } from '../src/parser';
import { XARFParseError } from '../src/errors';
import type { MessagingReport, ConnectionReport, ContentReport } from '../src/types';

const validMessagingReport = {
  xarf_version: '4.2.0',
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
  source_port: 25,
  subject: 'Test Spam',
};

const validConnectionReport = {
  xarf_version: '4.2.0',
  report_id: 'b2c3d4e5-f6a7-8901-bcde-f1234567890a',
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
  source_port: 12345,
  category: 'connection',
  type: 'ddos',
  evidence_source: 'honeypot',
  destination_ip: '203.0.113.10',
  protocol: 'tcp',
  first_seen: '2025-12-16T07:00:00.000Z',
};

const validContentReport = {
  xarf_version: '4.2.0',
  report_id: 'c3d4e5f6-a7b8-9012-cdef-234567890abc',
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
  source_identifier: '192.0.2.50',
  category: 'content',
  type: 'phishing',
  evidence_source: 'user_report',
  url: 'http://phishing.example.com',
};

describe('parse', () => {
  describe('valid reports', () => {
    it('should parse messaging report and cast to MessagingReport', () => {
      const { report, errors } = parse(validMessagingReport);
      const messaging = report as MessagingReport;

      expect(errors).toHaveLength(0);
      expect(messaging.category).toBe('messaging');
      expect(messaging.type).toBe('spam');
      expect(messaging.smtp_from).toBe('spammer@example.com');
    });

    it('should parse connection report and cast to ConnectionReport', () => {
      const { report, errors } = parse(validConnectionReport);
      const connection = report as ConnectionReport;

      expect(errors).toHaveLength(0);
      expect(connection.category).toBe('connection');
      expect(connection.type).toBe('ddos');
      expect(connection.destination_ip).toBe('203.0.113.10');
    });

    it('should parse content report and cast to ContentReport', () => {
      const { report, errors } = parse(validContentReport);
      const content = report as ContentReport;

      expect(errors).toHaveLength(0);
      expect(content.category).toBe('content');
      expect(content.type).toBe('phishing');
      expect(content.url).toBe('http://phishing.example.com');
    });

    it('should accept JSON string input', () => {
      const { report, errors } = parse(JSON.stringify(validConnectionReport));

      expect(errors).toHaveLength(0);
      expect(report.category).toBe('connection');
    });

    it('should accept spam without subject (recommended, not required)', () => {
      const data = { ...validMessagingReport } as any;
      delete data.subject;

      const { errors } = parse(data);

      expect(errors).toHaveLength(0);
    });
  });

  describe('JSON parsing errors', () => {
    it('should throw XARFParseError for malformed JSON string', () => {
      expect(() => parse('{"invalid": json}')).toThrow(XARFParseError);
      expect(() => parse('{"invalid": json}')).toThrow('Invalid JSON');
    });

    it('should throw XARFParseError for non-JSON string', () => {
      expect(() => parse('invalid json string')).toThrow(XARFParseError);
    });
  });

  describe('validation errors', () => {
    it('should return errors for invalid xarf_version', () => {
      const { errors } = parse({ ...validMessagingReport, xarf_version: '3.0.0' });

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.includes('xarf_version'))).toBe(true);
    });

    it('should return errors for invalid xarf_version in JSON string input', () => {
      const data = JSON.stringify({ ...validMessagingReport, xarf_version: '3.0.0' });
      const { errors } = parse(data);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.includes('xarf_version'))).toBe(true);
    });

    it('should return errors for missing required fields', () => {
      const { errors } = parse({ xarf_version: '4.2.0' });

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.includes('required'))).toBe(true);
    });

    it('should return errors for invalid reporter contact email', () => {
      const { errors } = parse({
        ...validMessagingReport,
        reporter: { org: 'Test', contact: 'invalid-email', domain: 'example.com' },
      });

      expect(errors.length).toBeGreaterThan(0);
      expect(
        errors.some((e) => e.includes('valid email address') || e.includes('reporter.contact'))
      ).toBe(true);
    });

    it('should return errors for null reporter', () => {
      const { errors } = parse({ ...validMessagingReport, reporter: null });

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.includes('reporter'))).toBe(true);
    });

    it('should return errors for missing reporter.contact and reporter.domain', () => {
      const { errors } = parse({
        ...validMessagingReport,
        reporter: { org: 'Test' },
      });

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.includes('reporter') && e.includes('required'))).toBe(true);
    });

    it('should return errors for invalid timestamp format', () => {
      const { report, errors } = parse({
        ...validMessagingReport,
        timestamp: 'invalid-timestamp-format',
      });

      // Non-strict: returns the data despite the invalid timestamp
      expect(report.timestamp).toBe('invalid-timestamp-format');
      expect(errors.some((e) => e.includes('timestamp'))).toBe(true);
    });

    it('should return errors in strict mode for missing fields', () => {
      const { errors } = parse({ xarf_version: '4.2.0' }, { strict: true });

      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('category and type validation', () => {
    it('should return errors for invalid category', () => {
      const { report, errors } = parse({
        ...validMessagingReport,
        category: 'invalid_category',
        type: 'test',
      });

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.includes('category'))).toBe(true);
      // Report is still returned with original data
      expect(report.category).toBe('invalid_category');
    });

    it('should return errors for unknown type within valid category', () => {
      const { errors } = parse({
        ...validMessagingReport,
        type: 'invalid_type',
      });

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should require protocol for connection reports', () => {
      const data = { ...validConnectionReport } as any;
      delete data.protocol;

      const { errors } = parse(data);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.includes('protocol') && e.includes('required'))).toBe(true);
    });

    it('should accept bulk_messaging without subject', () => {
      const data = {
        ...validMessagingReport,
        type: 'bulk_messaging',
        evidence_source: 'automated_filter',
        recipient_count: 5000,
      } as any;
      delete data.subject;

      const { errors } = parse(data);

      expect(errors).toHaveLength(0);
    });
  });

  describe('warnings', () => {
    it('should warn about unknown fields', () => {
      const { warnings } = parse({
        ...validContentReport,
        severety: 'high',
        sourcePort: 443,
      });

      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings.some((w) => w.includes('severety') || w.includes('unknown'))).toBe(true);
    });

    it('should warn about camelCase field names (not in XARF spec)', () => {
      const { warnings } = parse({
        ...validContentReport,
        contentType: 'text/html',
      });

      expect(warnings.some((w) => w.includes('contentType') || w.includes('unknown'))).toBe(true);
    });
  });

  describe('maxInputBytes guard', () => {
    it('should parse string input within the limit', () => {
      const json = JSON.stringify(validMessagingReport);
      const { errors } = parse(json, { maxInputBytes: json.length + 100 });
      expect(errors).toHaveLength(0);
    });

    it('should throw XARFParseError when string input exceeds the limit', () => {
      const json = JSON.stringify(validMessagingReport);
      expect(() => parse(json, { maxInputBytes: 10 })).toThrow(XARFParseError);
      expect(() => parse(json, { maxInputBytes: 10 })).toThrow(/maxInputBytes/);
    });

    it('should not apply the limit to already-parsed object input', () => {
      // Object inputs are not measured — the guard only protects string parsing.
      expect(() => parse(validMessagingReport, { maxInputBytes: 1 })).not.toThrow();
    });

    it('should impose no limit when maxInputBytes is omitted', () => {
      const json = JSON.stringify(validMessagingReport);
      expect(() => parse(json)).not.toThrow();
    });

    it('should count UTF-8 bytes, not characters, for multibyte input', () => {
      // A multibyte emoji makes the UTF-8 byte length exceed the UTF-16 length.
      const report = { ...validMessagingReport, subject: '😀😀😀' };
      const json = JSON.stringify(report);
      const byteLen = Buffer.byteLength(json, 'utf8');
      expect(byteLen).toBeGreaterThan(json.length);
      expect(() => parse(json, { maxInputBytes: byteLen - 1 })).toThrow(/maxInputBytes/);
      expect(() => parse(json, { maxInputBytes: byteLen })).not.toThrow();
    });

    it('should enforce the size guard BEFORE JSON.parse (oversized + malformed)', () => {
      // The guard's whole purpose is to reject oversized untrusted input without
      // parsing it. An oversized malformed payload must fail with maxInputBytes,
      // NOT "Invalid JSON" — proving the size check runs first.
      const oversizedMalformed = '{' + 'x'.repeat(200);
      expect(() => parse(oversizedMalformed, { maxInputBytes: 10 })).toThrow(/maxInputBytes/);
      expect(() => parse(oversizedMalformed, { maxInputBytes: 10 })).not.toThrow(/Invalid JSON/);
    });

    it('should use the TextEncoder fallback when Buffer is unavailable (edge runtime)', () => {
      const originalBuffer = globalThis.Buffer;
      // Simulate a Buffer-less runtime (e.g. an edge/serverless environment).
      (globalThis as any).Buffer = undefined;
      try {
        const json = JSON.stringify(validMessagingReport);
        expect(() => parse(json, { maxInputBytes: 5 })).toThrow(/maxInputBytes/);
        expect(() => parse(json, { maxInputBytes: json.length + 100 })).not.toThrow();
      } finally {
        (globalThis as any).Buffer = originalBuffer;
      }
    });
  });

  describe('showMissingOptional info channel', () => {
    it('surfaces missing-optional info through parse() when enabled', () => {
      const { info } = parse(validMessagingReport, { showMissingOptional: true });
      expect(info).toBeDefined();
      expect(Array.isArray(info)).toBe(true);
      expect(info!.length).toBeGreaterThan(0);
    });

    it('omits info when showMissingOptional is not set', () => {
      const { info } = parse(validMessagingReport);
      expect(info).toBeUndefined();
    });
  });
});
