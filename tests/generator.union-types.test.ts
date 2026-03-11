/**
 * Tests for discriminated union types in GeneratorOptions
 *
 * These tests verify that category-specific fields can be passed directly
 * to createReport(), providing TypeScript type safety and autocomplete.
 */

import { XARFGenerator } from '../src/generator';
import { XARFValidationError } from '../src/errors';

describe('GeneratorOptions Union Types', () => {
  let generator: XARFGenerator;

  const baseOptions = {
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

  beforeEach(() => {
    generator = new XARFGenerator();
  });

  describe('Content category with direct url field', () => {
    it('should accept url as a direct field', () => {
      const report = generator.createReport({
        ...baseOptions,
        category: 'content',
        type: 'phishing',
        url: 'http://malicious.example.com',
      });

      expect(report.category).toBe('content');
      expect(report.url).toBe('http://malicious.example.com');
    });

    it('should accept multiple content-specific fields directly', () => {
      const report = generator.createReport({
        ...baseOptions,
        category: 'content',
        type: 'phishing',
        url: 'http://malicious.example.com',
        domain: 'malicious.example.com',
        target_brand: 'Example Bank',
        verification_method: 'manual',
      });

      expect(report.url).toBe('http://malicious.example.com');
      expect(report.domain).toBe('malicious.example.com');
      expect(report.target_brand).toBe('Example Bank');
      expect(report.verification_method).toBe('manual');
    });
  });

  describe('Connection category with direct fields', () => {
    it('should accept destination_ip and protocol as direct fields', () => {
      const report = generator.createReport({
        ...baseOptions,
        category: 'connection',
        type: 'ddos',
        destination_ip: '203.0.113.10',
        protocol: 'tcp',
        first_seen: '2024-01-15T09:00:00Z',
        source_port: 12345,
      });

      expect(report.category).toBe('connection');
      expect(report.destination_ip).toBe('203.0.113.10');
      expect(report.protocol).toBe('tcp');
    });

    it('should accept optional connection fields', () => {
      const report = generator.createReport({
        ...baseOptions,
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

      expect(report.destination_port).toBe(80);
      expect(report.attack_vector).toBe('syn_flood');
      expect(report.peak_pps).toBe(1000000);
    });
  });

  describe('Messaging category with direct fields', () => {
    it('should accept protocol and smtp fields directly', () => {
      const report = generator.createReport({
        ...baseOptions,
        category: 'messaging',
        type: 'spam',
        protocol: 'smtp',
        smtp_from: 'spammer@evil.example.com',
        source_port: 25,
        subject: 'You won!',
      });

      expect(report.category).toBe('messaging');
      expect(report.protocol).toBe('smtp');
      expect(report.smtp_from).toBe('spammer@evil.example.com');
      expect(report.subject).toBe('You won!');
    });

    it('should accept optional messaging fields', () => {
      const report = generator.createReport({
        ...baseOptions,
        category: 'messaging',
        type: 'spam',
        protocol: 'smtp',
        smtp_from: 'spammer@evil.example.com',
        source_port: 25,
        smtp_to: 'victim@example.com',
        subject: 'You won!',
        message_id: '<123456@evil.example.com>',
      });

      expect(report.smtp_to).toBe('victim@example.com');
      expect(report.message_id).toBe('<123456@evil.example.com>');
    });
  });

  describe('Unknown field rejection', () => {
    it('should reject unknown fields', () => {
      expect(() =>
        generator.createReport({
          ...baseOptions,
          category: 'connection',
          type: 'ddos',
          destination_ip: '203.0.113.10',
          protocol: 'tcp',
          first_seen: '2024-01-15T09:00:00Z',
          source_port: 12345,
          custom_field: 'custom_value',
        } as any)
      ).toThrow(XARFValidationError);
    });
  });

  describe('Type safety with discriminated unions', () => {
    it('should provide type-safe access to category-specific fields', () => {
      const contentReport = generator.createReport({
        ...baseOptions,
        category: 'content',
        type: 'phishing',
        url: 'http://test.example.com',
      });

      const connectionReport = generator.createReport({
        ...baseOptions,
        category: 'connection',
        type: 'ddos',
        destination_ip: '192.0.2.1',
        protocol: 'tcp',
        first_seen: '2024-01-15T09:00:00Z',
        source_port: 12345,
      });

      expect(contentReport.url).toBeDefined();
      expect(connectionReport.destination_ip).toBeDefined();
      expect(connectionReport.protocol).toBeDefined();
    });
  });

  describe('Schema-derived field extraction', () => {
    it('should extract fields from schema registry for content category', () => {
      const report = generator.createReport({
        ...baseOptions,
        category: 'content',
        type: 'malware',
        url: 'http://malware.example.com',
        verified_at: '2024-01-15T10:00:00Z',
        hosting_provider: 'Example Host',
      });

      expect(report.url).toBe('http://malware.example.com');
      expect(report.verified_at).toBe('2024-01-15T10:00:00Z');
      expect(report.hosting_provider).toBe('Example Host');
    });

    it('should extract fields from schema registry for messaging category', () => {
      const report = generator.createReport({
        ...baseOptions,
        category: 'messaging',
        type: 'spam',
        protocol: 'smtp',
        smtp_from: 'spam@evil.example.com',
        source_port: 25,
        sender_name: 'Nigerian Prince',
        subject: 'Urgent business proposal',
      });

      expect(report.protocol).toBe('smtp');
      expect(report.smtp_from).toBe('spam@evil.example.com');
      expect(report.sender_name).toBe('Nigerian Prince');
    });
  });
});
