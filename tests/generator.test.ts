/**
 * Tests for XARF Generator
 */

import { XARFGenerator } from '../src/generator';
import { XARFError } from '../src/errors';

describe('XARFGenerator', () => {
  let generator: XARFGenerator;

  beforeEach(() => {
    generator = new XARFGenerator();
  });

  describe('generateUUID', () => {
    it('should generate valid UUID', () => {
      const uuid = generator.generateUUID();
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('should generate unique UUIDs', () => {
      const uuid1 = generator.generateUUID();
      const uuid2 = generator.generateUUID();
      expect(uuid1).not.toBe(uuid2);
    });
  });

  describe('generateTimestamp', () => {
    it('should generate ISO 8601 timestamp', () => {
      const timestamp = generator.generateTimestamp();
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should be parseable as date', () => {
      const timestamp = generator.generateTimestamp();
      const date = new Date(timestamp);
      expect(date.toISOString()).toBe(timestamp);
    });
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

    it('should throw error for unsupported algorithm', () => {
      expect(() => {
        generator.generateHash('test', 'invalid' as any);
      }).toThrow(XARFError);
    });
  });

  describe('addEvidence', () => {
    it('should create evidence with hash', () => {
      const evidence = generator.addEvidence('text/plain', 'Test evidence', 'Sample data');

      expect(evidence.content_type).toBe('text/plain');
      expect(evidence.description).toBe('Test evidence');
      expect(evidence.payload).toBe('Sample data');
      expect(evidence.hash).toBeDefined();
      expect(evidence.hash).toHaveLength(64);
    });

    it('should handle buffer payloads', () => {
      const buffer = Buffer.from('test data', 'utf8');
      const evidence = generator.addEvidence('application/octet-stream', 'Binary data', buffer);

      expect(evidence.payload).toBe('test data');
      expect(evidence.hash).toBeDefined();
    });
  });

  describe('generateReport', () => {
    it('should generate valid connection report', () => {
      const report = generator.generateReport({
        category: 'connection',
        reportType: 'ddos',
        sourceIdentifier: '192.0.2.100',
        reporterContact: 'abuse@example.com',
        reporterOrg: 'Example Security',
      });

      expect(report.xarf_version).toBe('4.0.0');
      expect(report.category).toBe('connection');
      expect(report.type).toBe('ddos');
      expect(report.source_identifier).toBe('192.0.2.100');
      expect(report.reporter.contact).toBe('abuse@example.com');
      expect(report.reporter.org).toBe('Example Security');
      expect(report.report_id).toBeDefined();
      expect(report.timestamp).toBeDefined();
    });

    it('should generate report with on_behalf_of', () => {
      const report = generator.generateReport({
        category: 'messaging',
        reportType: 'spam',
        sourceIdentifier: '192.0.2.100',
        reporterContact: 'reporter@example.com',
        reporterOrg: 'Reporter Org',
        onBehalfOf: {
          org: 'Client Org',
          contact: 'client@example.com',
          type: 'manual',
        },
      });

      expect(report.on_behalf_of).toBeDefined();
      expect(report.on_behalf_of?.org).toBe('Client Org');
      expect(report.on_behalf_of?.contact).toBe('client@example.com');
    });

    it('should include optional fields', () => {
      const evidence = generator.addEvidence('text/plain', 'Test', 'data');
      const report = generator.generateReport({
        category: 'content',
        reportType: 'phishing_site',
        sourceIdentifier: '192.0.2.100',
        reporterContact: 'abuse@example.com',
        description: 'Test phishing site',
        evidence: [evidence],
        severity: 'high',
        confidence: 0.95,
        tags: ['phishing', 'test'],
        target: { url: 'http://evil.example.com' },
        occurrence: {
          start: '2024-01-15T10:00:00Z',
          end: '2024-01-15T12:00:00Z',
        },
        additionalFields: { url: 'http://phishing.example.com' },
      });

      expect(report.description).toBe('Test phishing site');
      expect(report.evidence).toHaveLength(1);
      expect(report.severity).toBe('high');
      expect(report.confidence).toBe(0.95);
      expect(report.tags).toContain('phishing');
      expect(report.target?.url).toBe('http://evil.example.com');
      expect(report.occurrence).toBeDefined();
      expect(report.url).toBe('http://phishing.example.com');
    });

    it('should throw error for missing source identifier', () => {
      expect(() => {
        generator.generateReport({
          category: 'connection',
          reportType: 'ddos',
          sourceIdentifier: '',
          reporterContact: 'abuse@example.com',
        });
      }).toThrow(XARFError);
    });

    it('should throw error for invalid category', () => {
      expect(() => {
        generator.generateReport({
          category: 'invalid' as any,
          reportType: 'test',
          sourceIdentifier: '192.0.2.1',
          reporterContact: 'abuse@example.com',
        });
      }).toThrow(XARFError);
    });

    it('should throw error for invalid type for category', () => {
      expect(() => {
        generator.generateReport({
          category: 'connection',
          reportType: 'spam',
          sourceIdentifier: '192.0.2.1',
          reporterContact: 'abuse@example.com',
        });
      }).toThrow(XARFError);
    });

    it('should throw error for invalid confidence', () => {
      expect(() => {
        generator.generateReport({
          category: 'connection',
          reportType: 'ddos',
          sourceIdentifier: '192.0.2.1',
          reporterContact: 'abuse@example.com',
          confidence: 1.5,
        });
      }).toThrow(XARFError);
    });

    it('should throw error for invalid on_behalf_of', () => {
      expect(() => {
        generator.generateReport({
          category: 'messaging',
          reportType: 'spam',
          sourceIdentifier: '192.0.2.1',
          reporterContact: 'abuse@example.com',
          onBehalfOf: { org: 'Test' } as any,
        });
      }).toThrow(XARFError);
    });
  });

  describe('generateRandomEvidence', () => {
    it('should generate random evidence for category', () => {
      const evidence = generator.generateRandomEvidence('connection');

      expect(evidence.content_type).toBeDefined();
      expect(evidence.description).toContain('connection');
      expect(evidence.payload).toBeDefined();
      expect(evidence.hash).toBeDefined();
    });

    it('should use custom description', () => {
      const evidence = generator.generateRandomEvidence('messaging', 'Custom description');

      expect(evidence.description).toBe('Custom description');
    });
  });

  describe('generateSampleReport', () => {
    it('should generate sample connection report', () => {
      const report = generator.generateSampleReport('connection', 'ddos');

      expect(report.category).toBe('connection');
      expect(report.type).toBe('ddos');
      expect(report.source_identifier).toMatch(/^192\.0\.2\.\d+$/);
      expect(report.reporter.contact).toContain('@');
      expect(report.evidence).toBeDefined();
      expect(report.severity).toBeDefined();
    });

    it('should generate sample without evidence', () => {
      const report = generator.generateSampleReport('messaging', 'spam', false);

      expect(report.evidence).toBeUndefined();
    });

    it('should generate sample without optional fields', () => {
      const report = generator.generateSampleReport('content', 'phishing_site', false, false);

      expect(report.severity).toBeUndefined();
      expect(report.target).toBeUndefined();
      expect(report.occurrence).toBeUndefined();
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

  describe('static constants', () => {
    it('should have correct XARF version', () => {
      expect(XARFGenerator.XARF_VERSION).toBe('4.0.0');
    });

    it('should have all 8 valid categories', () => {
      expect(XARFGenerator.VALID_CATEGORIES.size).toBe(8);
      expect(XARFGenerator.VALID_CATEGORIES.has('messaging')).toBe(true);
      expect(XARFGenerator.VALID_CATEGORIES.has('connection')).toBe(true);
      expect(XARFGenerator.VALID_CATEGORIES.has('content')).toBe(true);
      expect(XARFGenerator.VALID_CATEGORIES.has('infrastructure')).toBe(true);
      expect(XARFGenerator.VALID_CATEGORIES.has('copyright')).toBe(true);
      expect(XARFGenerator.VALID_CATEGORIES.has('vulnerability')).toBe(true);
      expect(XARFGenerator.VALID_CATEGORIES.has('reputation')).toBe(true);
      expect(XARFGenerator.VALID_CATEGORIES.has('other')).toBe(true);
    });

    it('should have event types for all categories', () => {
      const categories = Array.from(XARFGenerator.VALID_CATEGORIES);
      categories.forEach((category) => {
        expect(XARFGenerator.EVENT_TYPES[category]).toBeDefined();
        expect(Array.isArray(XARFGenerator.EVENT_TYPES[category])).toBe(true);
      });
    });
  });
});
