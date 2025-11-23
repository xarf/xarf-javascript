/**
 * Edge Case Tests for XARF Generator
 */

import { XARFGenerator } from '../src/generator';
import { XARFError } from '../src/errors';

describe('XARFGenerator Edge Cases', () => {
  let generator: XARFGenerator;

  beforeEach(() => {
    generator = new XARFGenerator();
  });

  describe('generateReport validation edge cases', () => {
    it('should throw error for missing reporterContact', () => {
      expect(() => {
        generator.generateReport({
          category: 'connection',
          reportType: 'ddos',
          sourceIdentifier: '192.0.2.1',
          reporterContact: '',
        });
      }).toThrow(XARFError);
      expect(() => {
        generator.generateReport({
          category: 'connection',
          reportType: 'ddos',
          sourceIdentifier: '192.0.2.1',
          reporterContact: '',
        });
      }).toThrow('reporterContact is required');
    });

    it('should throw error for invalid reporter_type', () => {
      expect(() => {
        generator.generateReport({
          category: 'connection',
          reportType: 'ddos',
          sourceIdentifier: '192.0.2.1',
          reporterContact: 'abuse@example.com',
          reporterType: 'invalid' as any,
        });
      }).toThrow(XARFError);
      expect(() => {
        generator.generateReport({
          category: 'connection',
          reportType: 'ddos',
          sourceIdentifier: '192.0.2.1',
          reporterContact: 'abuse@example.com',
          reporterType: 'invalid' as any,
        });
      }).toThrow('Invalid reporter_type');
    });

    it('should throw error for invalid evidence_source', () => {
      expect(() => {
        generator.generateReport({
          category: 'connection',
          reportType: 'ddos',
          sourceIdentifier: '192.0.2.1',
          reporterContact: 'abuse@example.com',
          evidenceSource: 'invalid_source' as any,
        });
      }).toThrow(XARFError);
      expect(() => {
        generator.generateReport({
          category: 'connection',
          reportType: 'ddos',
          sourceIdentifier: '192.0.2.1',
          reporterContact: 'abuse@example.com',
          evidenceSource: 'invalid_source' as any,
        });
      }).toThrow('Invalid evidence_source');
    });

    it('should throw error for invalid severity', () => {
      expect(() => {
        generator.generateReport({
          category: 'connection',
          reportType: 'ddos',
          sourceIdentifier: '192.0.2.1',
          reporterContact: 'abuse@example.com',
          severity: 'super-critical' as any,
        });
      }).toThrow(XARFError);
      expect(() => {
        generator.generateReport({
          category: 'connection',
          reportType: 'ddos',
          sourceIdentifier: '192.0.2.1',
          reporterContact: 'abuse@example.com',
          severity: 'super-critical' as any,
        });
      }).toThrow('Invalid severity');
    });

    it('should throw error for confidence less than 0', () => {
      expect(() => {
        generator.generateReport({
          category: 'connection',
          reportType: 'ddos',
          sourceIdentifier: '192.0.2.1',
          reporterContact: 'abuse@example.com',
          confidence: -0.1,
        });
      }).toThrow(XARFError);
      expect(() => {
        generator.generateReport({
          category: 'connection',
          reportType: 'ddos',
          sourceIdentifier: '192.0.2.1',
          reporterContact: 'abuse@example.com',
          confidence: -0.1,
        });
      }).toThrow('confidence must be between 0.0 and 1.0');
    });

    it('should throw error for occurrence without start', () => {
      expect(() => {
        generator.generateReport({
          category: 'connection',
          reportType: 'ddos',
          sourceIdentifier: '192.0.2.1',
          reporterContact: 'abuse@example.com',
          occurrence: {
            end: '2024-01-15T12:00:00Z',
          } as any,
        });
      }).toThrow(XARFError);
      expect(() => {
        generator.generateReport({
          category: 'connection',
          reportType: 'ddos',
          sourceIdentifier: '192.0.2.1',
          reporterContact: 'abuse@example.com',
          occurrence: {
            end: '2024-01-15T12:00:00Z',
          } as any,
        });
      }).toThrow("occurrence must contain 'start' and 'end' keys");
    });

    it('should throw error for occurrence without end', () => {
      expect(() => {
        generator.generateReport({
          category: 'connection',
          reportType: 'ddos',
          sourceIdentifier: '192.0.2.1',
          reporterContact: 'abuse@example.com',
          occurrence: {
            start: '2024-01-15T10:00:00Z',
          } as any,
        });
      }).toThrow(XARFError);
      expect(() => {
        generator.generateReport({
          category: 'connection',
          reportType: 'ddos',
          sourceIdentifier: '192.0.2.1',
          reporterContact: 'abuse@example.com',
          occurrence: {
            start: '2024-01-15T10:00:00Z',
          } as any,
        });
      }).toThrow("occurrence must contain 'start' and 'end' keys");
    });
  });

  describe('generateRandomEvidence edge cases', () => {
    it('should handle unknown category by using text/plain', () => {
      const evidence = generator.generateRandomEvidence('other');

      expect(evidence.content_type).toBeDefined();
      expect(['text/plain', 'application/json']).toContain(evidence.content_type);
      expect(evidence.description).toContain('other');
    });

    it('should generate evidence for all categories', () => {
      const categories: Array<
        | 'messaging'
        | 'connection'
        | 'content'
        | 'infrastructure'
        | 'copyright'
        | 'vulnerability'
        | 'reputation'
        | 'other'
      > = [
        'messaging',
        'connection',
        'content',
        'infrastructure',
        'copyright',
        'vulnerability',
        'reputation',
        'other',
      ];

      categories.forEach((category) => {
        const evidence = generator.generateRandomEvidence(category);
        expect(evidence.content_type).toBeDefined();
        expect(evidence.payload).toBeDefined();
        expect(evidence.hash).toBeDefined();
        expect(evidence.description).toContain(category);
      });
    });
  });

  describe('generateSampleReport with various options', () => {
    it('should generate sample with evidence and optional fields', () => {
      const report = generator.generateSampleReport('messaging', 'spam', true, true);

      expect(report.evidence).toBeDefined();
      expect(report.severity).toBeDefined();
      expect(report.confidence).toBeDefined();
      expect(report.tags).toBeDefined();
      expect(report.target).toBeDefined();
      expect(report.occurrence).toBeDefined();
    });

    it('should generate sample for all valid categories', () => {
      const testCases: Array<{
        category:
          | 'messaging'
          | 'connection'
          | 'content'
          | 'infrastructure'
          | 'copyright'
          | 'vulnerability'
          | 'reputation'
          | 'other';
        type: string;
      }> = [
        { category: 'messaging', type: 'spam' },
        { category: 'connection', type: 'ddos' },
        { category: 'content', type: 'phishing_site' },
        { category: 'infrastructure', type: 'botnet' },
        { category: 'copyright', type: 'infringement' },
        { category: 'vulnerability', type: 'cve' },
        { category: 'reputation', type: 'blocklist' },
        { category: 'other', type: 'unclassified' },
      ];

      testCases.forEach(({ category, type }) => {
        const report = generator.generateSampleReport(category, type);
        expect(report.category).toBe(category);
        expect(report.type).toBe(type);
      });
    });
  });

  describe('addEvidence with different algorithms', () => {
    it('should create evidence with sha512', () => {
      const evidence = generator.addEvidence('text/plain', 'Test', 'data', 'sha512');

      expect(evidence.hash).toHaveLength(128);
    });

    it('should create evidence with sha1', () => {
      const evidence = generator.addEvidence('text/plain', 'Test', 'data', 'sha1');

      expect(evidence.hash).toHaveLength(40);
    });

    it('should create evidence with md5', () => {
      const evidence = generator.addEvidence('text/plain', 'Test', 'data', 'md5');

      expect(evidence.hash).toHaveLength(32);
    });
  });
});
