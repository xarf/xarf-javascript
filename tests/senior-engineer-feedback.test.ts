/**
 * Tests for senior engineer feedback issues
 *
 * Issues reported:
 * 1. Snake case vs camel case - XARF spec uses snake_case, library should support both
 * 2. Invalid properties should emit warnings (silent failure is bad)
 * 3. ReportType should alias to type
 * 4. Timestamps should validate ISO format and throw if invalid
 * 5. Generator creating invalid reports that fail validation
 */

import { XARFParser } from '../src/parser';
import { XARFGenerator } from '../src/generator';
import { XARFValidator } from '../src/validator';

describe('Senior Engineer Feedback Issues', () => {
  describe('Issue 1: Snake case vs camel case support', () => {
    it('should accept snake_case properties from XARF spec examples', async () => {
      const parser = new XARFParser();

      // This is how it appears in XARF v4 spec examples
      const report = {
        xarf_version: '4.0.0',
        report_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        timestamp: '2024-01-15T10:30:00Z',
        reporter: {
          org: 'Security Team',
          contact: 'abuse@example.com',
          domain: 'example.com',
        },
        sender: {
          org: 'Security Team',
          contact: 'abuse@example.com',
          domain: 'example.com',
        },
        source_identifier: '192.0.2.100',
        category: 'content',
        type: 'phishing',
        evidence_source: 'honeypot',
        url: 'http://phishing.example.com',
      };

      // This should NOT throw or have errors
      const parsed = parser.parse(report);
      expect(parsed.category).toBe('content');
      expect(parser.getErrors()).toHaveLength(0);
    });

    it('should work with XARF spec example directly copied', async () => {
      const parser = new XARFParser();

      // Direct copy from spec would use snake_case throughout
      const specExample = {
        xarf_version: '4.0.0',
        report_id: 'test-123',
        timestamp: '2025-12-16T07:37:30.000Z',
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
        category: 'connection',
        type: 'ddos',
        evidence_source: 'honeypot',
        destination_ip: '203.0.113.10',
        protocol: 'tcp',
      };

      const parsed = parser.parse(specExample);
      expect(parsed).toBeDefined();
      expect(parser.getErrors()).toHaveLength(0);
    });
  });

  describe('Issue 2: Invalid properties should emit warnings', () => {
    it('should warn when using incorrect property names', async () => {
      const parser = new XARFParser();

      const reportWithTypos = {
        xarf_version: '4.0.0',
        report_id: 'test-123',
        timestamp: '2025-12-16T07:37:30.000Z',
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
        category: 'content',
        type: 'phishing',
        evidence_source: 'honeypot',
        url: 'http://phishing.example.com',
        // Typo - should be 'severity' not 'severety'
        severety: 'high',
        // Another common mistake - camelCase instead of snake_case
        sourcePort: 443,
      };

      parser.parse(reportWithTypos);
      const warnings = parser.getWarnings();

      // Should have warnings about unknown properties
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings.some((w) => w.includes('severety') || w.includes('unknown'))).toBe(true);
    });

    it('should warn about misspelled category-specific fields', async () => {
      const parser = new XARFParser();

      const report = {
        xarf_version: '4.0.0',
        report_id: 'test-123',
        timestamp: '2025-12-16T07:37:30.000Z',
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
        category: 'content',
        type: 'phishing',
        evidence_source: 'honeypot',
        url: 'http://phishing.example.com',
        // Typo: should be 'content_type' not 'contentType'
        contentType: 'text/html',
      };

      parser.parse(report);
      const warnings = parser.getWarnings();

      // Should warn about contentType being unrecognized
      expect(warnings.some((w) => w.includes('contentType') || w.includes('unknown'))).toBe(true);
    });
  });

  describe('Issue 3: ReportType should alias to type', () => {
    it('should accept ReportType as alias for type field', async () => {
      const parser = new XARFParser();

      const report = {
        xarf_version: '4.0.0',
        report_id: 'test-123',
        timestamp: '2025-12-16T07:37:30.000Z',
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
        category: 'connection',
        ReportType: 'ddos', // Using ReportType instead of type
        evidence_source: 'honeypot',
        destination_ip: '203.0.113.10',
        protocol: 'tcp',
      };

      // Should either work or provide clear error
      const parsed = parser.parse(report);
      expect(parsed.type || (parsed as any).ReportType).toBe('ddos');
    });
  });

  describe('Issue 4: Timestamp validation should enforce ISO format', () => {
    it('should throw error for invalid timestamp format', async () => {
      const validator = new XARFValidator();

      const report = {
        xarf_version: '4.0.0',
        report_id: 'test-123',
        timestamp: 'foo', // Invalid timestamp
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
        category: 'content',
        type: 'phishing',
        evidence_source: 'honeypot',
        url: 'http://phishing.example.com',
      } as any;

      const result = await validator.validate(report);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'timestamp')).toBe(true);
    });

    it('should reject invalid occurrence timestamps', async () => {
      const validator = new XARFValidator();

      const report = {
        xarf_version: '4.0.0',
        report_id: 'test-123',
        timestamp: '2025-12-16T07:37:30.000Z',
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
        category: 'content',
        type: 'phishing',
        evidence_source: 'honeypot',
        url: 'http://phishing.example.com',
        occurrence: {
          start: 'foo', // Invalid
          end: '2025-12-16T07:37:30.000Z',
        },
      } as any;

      const result = await validator.validate(report);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field.includes('occurrence'))).toBe(true);
    });
  });

  describe('Issue 5: Generator should not create invalid reports', () => {
    it('should not allow creating reports missing required category fields', async () => {
      const generator = new XARFGenerator();

      // Attempting to create a content report without url
      expect(() => {
        generator.generateReport({
          category: 'content',
          reportType: 'phishing',
          sourceIdentifier: '192.0.2.100',
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
          // Missing url - this is required for content reports
        });
      }).toThrow();
    });

    it('should validate generated reports pass XARFValidator', async () => {
      const generator = new XARFGenerator();
      const validator = new XARFValidator();

      // Generate a content report
      const report = generator.generateReport({
        category: 'content',
        reportType: 'phishing',
        sourceIdentifier: '192.0.2.100',
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
        additionalFields: {
          url: 'http://phishing.example.com',
        },
      });

      // The generated report should always be valid
      const result = await validator.validate(report);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should enforce required fields at generation time for all categories', async () => {
      const generator = new XARFGenerator();

      // Connection reports require destination_ip
      expect(() => {
        generator.generateReport({
          category: 'connection',
          reportType: 'ddos',
          sourceIdentifier: '192.0.2.100',
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
          // Missing destination_ip and protocol
        });
      }).toThrow();
    });
  });
});
