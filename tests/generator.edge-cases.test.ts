/**
 * Edge Case Tests for XARF Generator
 */

import { XARFGenerator } from '../src/generator';
import { XARFValidationError } from '../src/errors';

describe('XARFGenerator Edge Cases', () => {
  let generator: XARFGenerator;

  beforeEach(() => {
    generator = new XARFGenerator();
  });

  describe('createReport validation edge cases', () => {
    it('should throw error for missing reporter', () => {
      expect(() => {
        generator.createReport({
          category: 'connection',
          type: 'ddos',
          source_identifier: '192.0.2.1',
          reporter: null as any,
          sender: {
            org: 'Example Org',
            contact: 'abuse@example.com',
            domain: 'example.com',
          },
        } as any);
      }).toThrow(XARFValidationError);
    });

    it('should throw error for invalid reporter contact', () => {
      expect(() => {
        generator.createReport({
          category: 'connection',
          type: 'ddos',
          source_identifier: '192.0.2.1',
          reporter: {
            org: 'Example Org',
            contact: 'invalid-email',
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

    it('should throw error for invalid evidence_source', () => {
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
          evidence_source: 'invalid_source' as any,
        } as any);
      }).toThrow(XARFValidationError);
    });

    it('should throw error for confidence less than 0', () => {
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
          confidence: -0.1,
        } as any);
      }).toThrow(XARFValidationError);
    });
  });

  describe('addEvidence with different algorithms', () => {
    it('should create evidence with sha512', () => {
      const evidence = generator.addEvidence('text/plain', 'data', 'Test', 'sha512');

      expect(evidence.hash).toMatch(/^sha512:[0-9a-f]{128}$/); // Format: algorithm:hexvalue
    });

    it('should create evidence with sha1', () => {
      const evidence = generator.addEvidence('text/plain', 'data', 'Test', 'sha1');

      expect(evidence.hash).toMatch(/^sha1:[0-9a-f]{40}$/); // Format: algorithm:hexvalue
    });

    it('should create evidence with md5', () => {
      const evidence = generator.addEvidence('text/plain', 'data', 'Test', 'md5');

      expect(evidence.hash).toMatch(/^md5:[0-9a-f]{32}$/); // Format: algorithm:hexvalue
    });
  });
});
