/**
 * Tests for XARF Generator
 */

import { XARFGenerator } from '../src/generator';
import { XARFError, XARFValidationError } from '../src/errors';

describe('XARFGenerator', () => {
  let generator: XARFGenerator;

  beforeEach(() => {
    generator = new XARFGenerator();
  });

  describe('generateHash', () => {
    it('should generate SHA256 hash by default', () => {
      const hash = generator.generateHash('test data');
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should generate consistent hashes', () => {
      const hash1 = generator.generateHash('test data');
      const hash2 = generator.generateHash('test data');
      expect(hash1).toBe(hash2);
    });

    it('should support different algorithms', () => {
      const sha256 = generator.generateHash('test', 'sha256');
      const sha512 = generator.generateHash('test', 'sha512');
      const sha1 = generator.generateHash('test', 'sha1');
      const md5 = generator.generateHash('test', 'md5');

      expect(sha256).toHaveLength(64);
      expect(sha512).toHaveLength(128);
      expect(sha1).toHaveLength(40);
      expect(md5).toHaveLength(32);
    });
  });

  describe('addEvidence', () => {
    it('should create evidence with hash', () => {
      const evidence = generator.addEvidence('text/plain', 'Test evidence', 'Sample data');

      expect(evidence.content_type).toBe('text/plain');
      expect(evidence.description).toBe('Test evidence');
      expect(evidence.payload).toBe('Sample data');
      expect(evidence.hash).toBeDefined();
      expect(evidence.hash).toMatch(/^sha256:[0-9a-f]{64}$/); // Format: algorithm:hexvalue
    });

    it('should handle buffer payloads', () => {
      const buffer = Buffer.from('test data', 'utf8');
      const evidence = generator.addEvidence('application/octet-stream', 'Binary data', buffer);

      expect(evidence.payload).toBe('test data');
      expect(evidence.hash).toBeDefined();
    });
  });

  describe('createReport', () => {
    it('should generate valid connection report', () => {
      const report = generator.createReport({
        category: 'connection',
        type: 'ddos',
        source_identifier: '192.0.2.100',
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
        destination_ip: '203.0.113.10',
        protocol: 'tcp',
        first_seen: '2024-01-15T09:00:00Z',
        source_port: 12345,
      });

      expect(report.xarf_version).toBe('4.0.0');
      expect(report.category).toBe('connection');
      expect(report.type).toBe('ddos');
      expect(report.source_identifier).toBe('192.0.2.100');
      expect(report.reporter.contact).toBe('abuse@example.com');
      expect(report.reporter.org).toBe('Example Security');
      expect(report.reporter.domain).toBe('example.com');
      expect(report.sender.contact).toBe('abuse@example.com');
      expect(report.sender.org).toBe('Example Security');
      expect(report.sender.domain).toBe('example.com');
      expect(report.report_id).toBeDefined();
      expect(report.timestamp).toBeDefined();
    });

    it('should include optional fields', () => {
      const evidence = generator.addEvidence('text/plain', 'Test', 'data');
      const report = generator.createReport({
        category: 'content',
        type: 'phishing',
        source_identifier: '192.0.2.100',
        reporter: {
          org: 'Example Org',
          contact: 'abuse@example.com',
          domain: 'example.com',
        },
        sender: {
          org: 'Example Org',
          contact: 'abuse@example.com',
          domain: 'example.com',
        },
        description: 'Test phishing site',
        evidence: [evidence],
        confidence: 0.95,
        tags: ['type:phishing', 'source:test'],
        url: 'http://phishing.example.com',
      });

      expect(report.description).toBe('Test phishing site');
      expect(report.evidence).toHaveLength(1);
      expect(report.confidence).toBe(0.95);
      expect(report.tags).toContain('type:phishing');
      expect(report.url).toBe('http://phishing.example.com');
    });

    it('should throw error for missing source identifier', () => {
      expect(() => {
        generator.createReport({
          category: 'connection',
          type: 'ddos',
          source_identifier: '',
          reporter: {
            org: 'Example Org',
            contact: 'abuse@example.com',
            domain: 'example.com',
          },
          sender: {
            org: 'Example Org',
            contact: 'abuse@example.com',
            domain: 'example.com',
          },
        } as any);
      }).toThrow(XARFValidationError);
    });

    it('should throw error for invalid category', () => {
      expect(() => {
        generator.createReport({
          category: 'invalid' as any,
          type: 'test',
          source_identifier: '192.0.2.1',
          reporter: {
            org: 'Example Org',
            contact: 'abuse@example.com',
            domain: 'example.com',
          },
          sender: {
            org: 'Example Org',
            contact: 'abuse@example.com',
            domain: 'example.com',
          },
        } as any);
      }).toThrow(XARFValidationError);
    });

    it('should reject mismatched type for category', () => {
      expect(() => {
        generator.createReport({
          category: 'connection',
          type: 'spam',
          source_identifier: '192.0.2.1',
          reporter: {
            org: 'Example Org',
            contact: 'abuse@example.com',
            domain: 'example.com',
          },
          sender: {
            org: 'Example Org',
            contact: 'abuse@example.com',
            domain: 'example.com',
          },
        } as any);
      }).toThrow(XARFValidationError);
    });

    it('should throw error for invalid confidence', () => {
      expect(() => {
        generator.createReport({
          category: 'connection',
          type: 'ddos',
          source_identifier: '192.0.2.1',
          reporter: {
            org: 'Example Org',
            contact: 'abuse@example.com',
            domain: 'example.com',
          },
          sender: {
            org: 'Example Org',
            contact: 'abuse@example.com',
            domain: 'example.com',
          },
          confidence: 1.5,
        } as any);
      }).toThrow(XARFValidationError);
    });

    it('should throw error for unknown fields', () => {
      expect(() => {
        generator.createReport({
          category: 'messaging',
          type: 'spam',
          source_identifier: '192.0.2.1',
          reporter: {
            org: 'Example Org',
            contact: 'abuse@example.com',
            domain: 'example.com',
          },
          sender: {
            org: 'Example Org',
            contact: 'abuse@example.com',
            domain: 'example.com',
          },
          unknown_field: 'test',
        } as any);
      }).toThrow(XARFValidationError);
    });
  });

  describe('generateSampleReport', () => {
    it('should generate sample connection report', () => {
      const report = generator.generateSampleReport('connection', 'ddos', {
        includeEvidence: true,
        includeOptional: false,
      });

      expect(report.category).toBe('connection');
      expect(report.type).toBe('ddos');
      expect(report.source_identifier).toMatch(/^192\.0\.2\.\d+$/);
      expect(report.reporter.contact).toContain('@');
      expect(report.evidence).toBeDefined();
    });

    it('should generate sample without evidence', () => {
      const report = generator.generateSampleReport('messaging', 'spam', {
        includeEvidence: false,
        includeOptional: false,
      });

      expect(report.evidence).toBeUndefined();
    });

    it('should throw error for invalid category', () => {
      expect(() => {
        generator.generateSampleReport('invalid' as any, 'test');
      }).toThrow(XARFError);
    });

    it('should throw error for invalid type', () => {
      expect(() => {
        generator.generateSampleReport('connection', 'invalid');
      }).toThrow(XARFError);
    });
  });
});
