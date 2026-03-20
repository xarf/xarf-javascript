/**
 * Tests for XARF Generator
 */

import { createReport, createEvidence } from '../src/generator';
import { SPEC_VERSION } from '../src/version';

const baseInput = {
  reporter: {
    org: 'Test Org',
    contact: 'abuse@example.com',
    domain: 'example.com',
  },
  sender: {
    org: 'Test Org',
    contact: 'abuse@example.com',
    domain: 'example.com',
  },
  source_identifier: '192.0.2.1',
};

describe('createEvidence', () => {
  it('should base64-encode string payload and compute sha256 hash by default', () => {
    const evidence = createEvidence('text/plain', 'Sample data', {
      description: 'Test evidence',
    });

    expect(evidence.content_type).toBe('text/plain');
    expect(evidence.description).toBe('Test evidence');
    expect(evidence.payload).toBe(Buffer.from('Sample data').toString('base64'));
    expect(evidence.size).toBe(Buffer.from('Sample data').length);
    expect(evidence.hash).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it('should base64-encode Buffer payload', () => {
    const buffer = Buffer.from('test data', 'utf8');
    const evidence = createEvidence('application/octet-stream', buffer);

    expect(evidence.payload).toBe(buffer.toString('base64'));
    expect(evidence.size).toBe(buffer.length);
    expect(evidence.hash).toMatch(/^sha256:/);
  });

  it('should use the requested hash algorithm', () => {
    const sha512 = createEvidence('text/plain', 'data', { hashAlgorithm: 'sha512' });
    expect(sha512.hash).toMatch(/^sha512:[0-9a-f]{128}$/);

    const sha1 = createEvidence('text/plain', 'data', { hashAlgorithm: 'sha1' });
    expect(sha1.hash).toMatch(/^sha1:[0-9a-f]{40}$/);

    const md5 = createEvidence('text/plain', 'data', { hashAlgorithm: 'md5' });
    expect(md5.hash).toMatch(/^md5:[0-9a-f]{32}$/);
  });

  it('should include description when provided', () => {
    const evidence = createEvidence('text/plain', 'data', { description: 'Log excerpt' });

    expect(evidence.description).toBe('Log excerpt');
  });
});

describe('createReport', () => {
  describe('auto-generated metadata', () => {
    it('should set xarf_version, report_id, and timestamp automatically', () => {
      const { report } = createReport({
        ...baseInput,
        category: 'connection',
        type: 'ddos',
        protocol: 'tcp',
        first_seen: '2024-01-15T09:00:00Z',
        source_port: 12345,
      });

      expect(report.xarf_version).toBe(SPEC_VERSION);
      expect(report.report_id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
      expect(report.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should use provided report_id and timestamp when given', () => {
      const { report } = createReport({
        ...baseInput,
        category: 'connection',
        type: 'ddos',
        protocol: 'tcp',
        first_seen: '2024-01-15T09:00:00Z',
        source_port: 12345,
        report_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        timestamp: '2024-06-01T00:00:00Z',
      });

      expect(report.report_id).toBe('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
      expect(report.timestamp).toBe('2024-06-01T00:00:00Z');
    });
  });

  describe('validation errors', () => {
    it('should return no errors for a valid report', () => {
      const { errors } = createReport({
        ...baseInput,
        category: 'content',
        type: 'phishing',
        url: 'http://phishing.example.com',
      });

      expect(errors).toHaveLength(0);
    });

    it('should return errors for invalid category', () => {
      const { errors } = createReport({
        ...baseInput,
        category: 'invalid' as any,
        type: 'test',
      } as any);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.field === 'category')).toBe(true);
    });

    it('should return errors for mismatched type and category', () => {
      const { errors } = createReport({
        ...baseInput,
        category: 'connection',
        type: 'spam',
      } as any);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should return errors for missing source_identifier', () => {
      const { errors } = createReport({
        reporter: baseInput.reporter,
        sender: baseInput.sender,
        category: 'connection',
        type: 'ddos',
      } as any);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.message.includes('source_identifier'))).toBe(true);
    });

    it('should return errors for null reporter', () => {
      const { errors } = createReport({
        category: 'connection',
        type: 'ddos',
        source_identifier: '192.0.2.1',
        reporter: null as any,
        sender: baseInput.sender,
      } as any);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.field.includes('reporter'))).toBe(true);
    });

    it('should return errors for invalid reporter contact email', () => {
      const { errors } = createReport({
        ...baseInput,
        category: 'connection',
        type: 'ddos',
        reporter: {
          org: 'Example Org',
          contact: 'invalid-email',
          domain: 'example.com',
        },
      } as any);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.field.includes('contact'))).toBe(true);
    });

    it('should return errors for invalid evidence_source enum value', () => {
      const { errors } = createReport({
        ...baseInput,
        category: 'connection',
        type: 'ddos',
        evidence_source: 'invalid_source' as any,
      } as any);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.field === 'evidence_source')).toBe(true);
    });

    it('should return errors for confidence outside 0-1 range', () => {
      const { errors: tooHigh } = createReport({
        ...baseInput,
        category: 'connection',
        type: 'ddos',
        confidence: 1.5,
      } as any);
      expect(tooHigh.length).toBeGreaterThan(0);

      const { errors: negative } = createReport({
        ...baseInput,
        category: 'connection',
        type: 'ddos',
        confidence: -0.1,
      } as any);
      expect(negative.length).toBeGreaterThan(0);
    });

    it('should return warnings for unknown fields in non-strict mode', () => {
      const { errors, warnings } = createReport({
        ...baseInput,
        category: 'content',
        type: 'phishing',
        url: 'http://phishing.example.com',
        unknown_field: 'test',
      } as any);

      expect(errors).toHaveLength(0);
      expect(warnings.some((w) => w.field === 'unknown_field')).toBe(true);
    });

    it('should promote unknown field warnings to errors in strict mode', () => {
      const { errors } = createReport(
        {
          ...baseInput,
          category: 'content',
          type: 'phishing',
          url: 'http://phishing.example.com',
          unknown_field: 'test',
        } as any,
        { strict: true }
      );

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.field === 'unknown_field')).toBe(true);
    });
  });

  describe('field passthrough', () => {
    it('should preserve core fields in output', () => {
      const { report } = createReport({
        ...baseInput,
        category: 'content',
        type: 'phishing',
        description: 'Test phishing site',
        confidence: 0.95,
        tags: ['type:phishing', 'source:test'],
        url: 'http://phishing.example.com',
      });

      expect(report.source_identifier).toBe('192.0.2.1');
      expect(report.reporter.contact).toBe('abuse@example.com');
      expect(report.sender.org).toBe('Test Org');
      expect(report.description).toBe('Test phishing site');
      expect(report.confidence).toBe(0.95);
      expect(report.tags).toContain('type:phishing');
    });

    it('should preserve evidence array in output', () => {
      const evidence = createEvidence('text/plain', 'data', { description: 'Test' });
      const { report } = createReport({
        ...baseInput,
        category: 'content',
        type: 'phishing',
        url: 'http://phishing.example.com',
        evidence: [evidence],
      });

      expect(report.evidence).toHaveLength(1);
      expect(report.evidence![0].content_type).toBe('text/plain');
    });

    it('should preserve connection-specific fields', () => {
      const { report, errors } = createReport({
        ...baseInput,
        category: 'connection',
        type: 'ddos',
        destination_ip: '203.0.113.10',
        protocol: 'tcp',
        first_seen: '2024-01-15T09:00:00Z',
        source_port: 12345,
        destination_port: 80,
        attack_vector: 'syn_flood',
        peak_pps: 1000000,
      });

      expect(errors).toHaveLength(0);
      expect(report.destination_ip).toBe('203.0.113.10');
      expect(report.protocol).toBe('tcp');
      expect(report.destination_port).toBe(80);
      expect(report.attack_vector).toBe('syn_flood');
      expect(report.peak_pps).toBe(1000000);
    });

    it('should preserve messaging-specific fields', () => {
      const { report, errors } = createReport({
        ...baseInput,
        category: 'messaging',
        type: 'spam',
        protocol: 'smtp',
        smtp_from: 'spammer@evil.example.com',
        source_port: 25,
        smtp_to: 'victim@example.com',
        subject: 'You won!',
        message_id: '<123456@evil.example.com>',
      });

      expect(errors).toHaveLength(0);
      expect(report.protocol).toBe('smtp');
      expect(report.smtp_from).toBe('spammer@evil.example.com');
      expect(report.smtp_to).toBe('victim@example.com');
      expect(report.subject).toBe('You won!');
      expect(report.message_id).toBe('<123456@evil.example.com>');
    });

    it('should preserve content-specific fields', () => {
      const { report, errors } = createReport({
        ...baseInput,
        category: 'content',
        type: 'phishing',
        url: 'http://malicious.example.com',
        domain: 'malicious.example.com',
        target_brand: 'Example Bank',
        verification_method: 'manual',
      });

      expect(errors).toHaveLength(0);
      expect(report.url).toBe('http://malicious.example.com');
      expect(report.domain).toBe('malicious.example.com');
      expect(report.target_brand).toBe('Example Bank');
      expect(report.verification_method).toBe('manual');
    });

    it('should preserve additional/custom fields without dropping them', () => {
      const { report, warnings } = createReport({
        ...baseInput,
        category: 'connection',
        type: 'ddos',
        destination_ip: '203.0.113.10',
        protocol: 'tcp',
        first_seen: '2024-01-15T09:00:00Z',
        source_port: 12345,
        custom_field: 'custom_value',
      } as any);

      expect((report as any).custom_field).toBe('custom_value');
      // Unknown fields produce warnings but are still preserved
      expect(warnings.some((w) => w.field === 'custom_field')).toBe(true);
    });
  });
});
