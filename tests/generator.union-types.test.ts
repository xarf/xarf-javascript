/**
 * Tests for discriminated union types in GeneratorOptions
 *
 * These tests verify that category-specific fields can be passed directly
 * to generateReport() instead of using additionalFields, providing better
 * TypeScript type safety and autocomplete.
 */

import { XARFGenerator } from '../src/generator';
import type {
  ContentGeneratorOptions,
  ConnectionGeneratorOptions,
  MessagingGeneratorOptions,
} from '../src/generator';

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
      const options: ContentGeneratorOptions = {
        ...baseOptions,
        category: 'content',
        type: 'phishing',
        url: 'http://malicious.example.com',
      };

      const report = generator.generateReport(options);

      expect(report.category).toBe('content');
      expect(report.url).toBe('http://malicious.example.com');
    });

    it('should accept multiple content-specific fields directly', () => {
      const options: ContentGeneratorOptions = {
        ...baseOptions,
        category: 'content',
        type: 'phishing',
        url: 'http://malicious.example.com',
        domain: 'malicious.example.com',
        target_brand: 'Example Bank',
        verification_method: 'manual',
      };

      const report = generator.generateReport(options);

      expect(report.url).toBe('http://malicious.example.com');
      expect(report.domain).toBe('malicious.example.com');
      expect(report.target_brand).toBe('Example Bank');
      expect(report.verification_method).toBe('manual');
    });

    it('should still work with additionalFields for backward compatibility', () => {
      const report = generator.generateReport({
        ...baseOptions,
        category: 'content',
        type: 'phishing',
        additionalFields: {
          url: 'http://legacy.example.com',
        },
      });

      expect(report.url).toBe('http://legacy.example.com');
    });

    it('should allow additionalFields to override direct fields', () => {
      const options: ContentGeneratorOptions = {
        ...baseOptions,
        category: 'content',
        type: 'phishing',
        url: 'http://direct.example.com',
        additionalFields: {
          url: 'http://override.example.com',
        },
      };

      const report = generator.generateReport(options);

      expect(report.url).toBe('http://override.example.com');
    });
  });

  describe('Connection category with direct fields', () => {
    it('should accept destination_ip and protocol as direct fields', () => {
      const options: ConnectionGeneratorOptions = {
        ...baseOptions,
        category: 'connection',
        type: 'ddos',
        destination_ip: '203.0.113.10',
        protocol: 'tcp',
        first_seen: '2024-01-15T09:00:00Z',
        source_port: 12345,
      };

      const report = generator.generateReport(options);

      expect(report.category).toBe('connection');
      expect(report.destination_ip).toBe('203.0.113.10');
      expect(report.protocol).toBe('tcp');
    });

    it('should accept optional connection fields', () => {
      const options: ConnectionGeneratorOptions = {
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
      };

      const report = generator.generateReport(options);

      expect(report.destination_port).toBe(80);
      expect(report.attack_vector).toBe('syn_flood');
      expect(report.peak_pps).toBe(1000000);
    });

    it('should still work with additionalFields for backward compatibility', () => {
      const report = generator.generateReport({
        ...baseOptions,
        category: 'connection',
        type: 'ddos',
        additionalFields: {
          destination_ip: '203.0.113.20',
          protocol: 'udp',
          first_seen: '2024-01-15T09:00:00Z',
          source_port: 12345,
        },
      });

      expect(report.destination_ip).toBe('203.0.113.20');
      expect(report.protocol).toBe('udp');
    });
  });

  describe('Messaging category with direct fields', () => {
    it('should accept protocol and smtp fields directly', () => {
      const options: MessagingGeneratorOptions = {
        ...baseOptions,
        category: 'messaging',
        type: 'spam',
        protocol: 'smtp',
        smtp_from: 'spammer@evil.example.com',
        source_port: 25,
        subject: 'You won!',
      };

      const report = generator.generateReport(options);

      expect(report.category).toBe('messaging');
      expect(report.protocol).toBe('smtp');
      expect(report.smtp_from).toBe('spammer@evil.example.com');
      expect(report.subject).toBe('You won!');
    });

    it('should accept optional messaging fields', () => {
      const options: MessagingGeneratorOptions = {
        ...baseOptions,
        category: 'messaging',
        type: 'spam',
        protocol: 'smtp',
        smtp_from: 'spammer@evil.example.com',
        source_port: 25,
        smtp_to: 'victim@example.com',
        subject: 'You won!',
        message_id: '<123456@evil.example.com>',
      };

      const report = generator.generateReport(options);

      expect(report.smtp_to).toBe('victim@example.com');
      expect(report.message_id).toBe('<123456@evil.example.com>');
    });
  });

  describe('Mixed direct fields and additionalFields', () => {
    it('should merge direct fields with additionalFields', () => {
      const options: ConnectionGeneratorOptions = {
        ...baseOptions,
        category: 'connection',
        type: 'ddos',
        destination_ip: '203.0.113.10',
        protocol: 'tcp',
        first_seen: '2024-01-15T09:00:00Z',
        source_port: 12345,
        additionalFields: {
          destination_port: 443,
          peak_pps: 1000000,
        },
      };

      const report = generator.generateReport(options);

      expect(report.destination_ip).toBe('203.0.113.10');
      expect(report.protocol).toBe('tcp');
      expect(report.destination_port).toBe(443);
      expect(report.peak_pps).toBe(1000000);
    });

    it('should reject unknown fields in additionalFields', () => {
      const options: ConnectionGeneratorOptions = {
        ...baseOptions,
        category: 'connection',
        type: 'ddos',
        destination_ip: '203.0.113.10',
        protocol: 'tcp',
        additionalFields: {
          custom_field: 'custom_value',
        },
      };

      expect(() => generator.generateReport(options)).toThrow(/custom_field.*Unknown field/);
    });
  });

  describe('Type safety with discriminated unions', () => {
    it('should provide type-safe access to category-specific fields', () => {
      // This test verifies TypeScript compile-time type checking
      // The ContentGeneratorOptions type enforces url is available
      const contentOptions: ContentGeneratorOptions = {
        ...baseOptions,
        category: 'content',
        type: 'phishing',
        url: 'http://test.example.com',
      };

      // The ConnectionGeneratorOptions type enforces destination_ip and protocol are available
      const connectionOptions: ConnectionGeneratorOptions = {
        ...baseOptions,
        category: 'connection',
        type: 'ddos',
        destination_ip: '192.0.2.1',
        protocol: 'tcp',
        first_seen: '2024-01-15T09:00:00Z',
        source_port: 12345,
      };

      const contentReport = generator.generateReport(contentOptions);
      const connectionReport = generator.generateReport(connectionOptions);

      expect(contentReport.url).toBeDefined();
      expect(connectionReport.destination_ip).toBeDefined();
      expect(connectionReport.protocol).toBeDefined();
    });
  });

  describe('Schema-derived field extraction', () => {
    it('should extract fields from schema registry for content category', () => {
      // Fields defined in content-base.json should be extracted
      const options: ContentGeneratorOptions = {
        ...baseOptions,
        category: 'content',
        type: 'malware',
        url: 'http://malware.example.com',
        verified_at: '2024-01-15T10:00:00Z',
        hosting_provider: 'Example Host',
      };

      const report = generator.generateReport(options);

      expect(report.url).toBe('http://malware.example.com');
      expect(report.verified_at).toBe('2024-01-15T10:00:00Z');
      expect(report.hosting_provider).toBe('Example Host');
    });

    it('should extract fields from schema registry for messaging category', () => {
      const options: MessagingGeneratorOptions = {
        ...baseOptions,
        category: 'messaging',
        type: 'spam',
        protocol: 'smtp',
        smtp_from: 'spam@evil.example.com',
        source_port: 25,
        sender_name: 'Nigerian Prince',
      };

      const report = generator.generateReport(options);

      expect(report.protocol).toBe('smtp');
      expect(report.smtp_from).toBe('spam@evil.example.com');
      expect(report.sender_name).toBe('Nigerian Prince');
    });
  });
});
