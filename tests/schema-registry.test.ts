/**
 * Tests for SchemaRegistry
 */

import { SchemaRegistry } from '../src/schema-registry';

describe('SchemaRegistry', () => {
  let registry: SchemaRegistry;

  beforeAll(() => {
    registry = SchemaRegistry.getInstance();
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = SchemaRegistry.getInstance();
      const instance2 = SchemaRegistry.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should be loaded', () => {
      expect(registry.isLoaded()).toBe(true);
    });
  });

  describe('getCategories', () => {
    it('should return all 7 XARF categories', () => {
      const categories = registry.getCategories();

      expect(categories.size).toBe(7);
      expect(categories.has('messaging')).toBe(true);
      expect(categories.has('connection')).toBe(true);
      expect(categories.has('content')).toBe(true);
      expect(categories.has('infrastructure')).toBe(true);
      expect(categories.has('copyright')).toBe(true);
      expect(categories.has('vulnerability')).toBe(true);
      expect(categories.has('reputation')).toBe(true);
    });

    it('should cache categories', () => {
      const categories1 = registry.getCategories();
      const categories2 = registry.getCategories();
      expect(categories1).toBe(categories2);
    });
  });

  describe('isValidCategory', () => {
    it('should return true for valid categories', () => {
      expect(registry.isValidCategory('messaging')).toBe(true);
      expect(registry.isValidCategory('connection')).toBe(true);
      expect(registry.isValidCategory('content')).toBe(true);
    });

    it('should return false for invalid categories', () => {
      expect(registry.isValidCategory('invalid')).toBe(false);
      expect(registry.isValidCategory('')).toBe(false);
      expect(registry.isValidCategory('MESSAGING')).toBe(false);
    });
  });

  describe('getTypesForCategory', () => {
    it('should return types for messaging category', () => {
      const types = registry.getTypesForCategory('messaging');

      expect(types.size).toBeGreaterThan(0);
      expect(types.has('spam')).toBe(true);
      expect(types.has('bulk_messaging')).toBe(true);
    });

    it('should return types for connection category', () => {
      const types = registry.getTypesForCategory('connection');

      expect(types.size).toBeGreaterThan(0);
      expect(types.has('ddos')).toBe(true);
      expect(types.has('login_attack')).toBe(true);
      expect(types.has('port_scan')).toBe(true);
    });

    it('should return types for content category', () => {
      const types = registry.getTypesForCategory('content');

      expect(types.size).toBeGreaterThan(0);
      expect(types.has('phishing')).toBe(true);
      expect(types.has('malware')).toBe(true);
    });

    it('should return empty set for invalid category', () => {
      const types = registry.getTypesForCategory('invalid');
      expect(types.size).toBe(0);
    });
  });

  describe('isValidType', () => {
    it('should return true for valid category/type combinations', () => {
      expect(registry.isValidType('messaging', 'spam')).toBe(true);
      expect(registry.isValidType('connection', 'ddos')).toBe(true);
      expect(registry.isValidType('content', 'phishing')).toBe(true);
    });

    it('should return false for invalid types', () => {
      expect(registry.isValidType('messaging', 'ddos')).toBe(false);
      expect(registry.isValidType('connection', 'spam')).toBe(false);
      expect(registry.isValidType('invalid', 'spam')).toBe(false);
    });
  });

  describe('getAllTypes', () => {
    it('should return map of all categories to types', () => {
      const allTypes = registry.getAllTypes();

      expect(allTypes.size).toBeGreaterThan(0);
      expect(allTypes.has('messaging')).toBe(true);
      expect(allTypes.has('connection')).toBe(true);
      expect(allTypes.has('content')).toBe(true);
    });
  });

  describe('getRequiredFields', () => {
    it('should return required fields from core schema', () => {
      const required = registry.getRequiredFields();

      expect(required.has('xarf_version')).toBe(true);
      expect(required.has('report_id')).toBe(true);
      expect(required.has('timestamp')).toBe(true);
      expect(required.has('reporter')).toBe(true);
      expect(required.has('sender')).toBe(true);
      expect(required.has('source_identifier')).toBe(true);
      expect(required.has('category')).toBe(true);
      expect(required.has('type')).toBe(true);
    });
  });

  describe('getContactRequiredFields', () => {
    it('should return required contact fields', () => {
      const required = registry.getContactRequiredFields();

      expect(required.has('org')).toBe(true);
      expect(required.has('contact')).toBe(true);
      expect(required.has('domain')).toBe(true);
    });
  });

  describe('getFieldMetadata', () => {
    it('should return metadata for known fields', () => {
      const metadata = registry.getFieldMetadata('confidence');

      expect(metadata).not.toBeNull();
      expect(metadata!.description).toContain('Confidence');
      expect(metadata!.recommended).toBe(true);
      expect(metadata!.minimum).toBe(0.0);
      expect(metadata!.maximum).toBe(1.0);
    });

    it('should return null for unknown fields', () => {
      const metadata = registry.getFieldMetadata('unknown_field');
      expect(metadata).toBeNull();
    });
  });

  describe('getCorePropertyNames', () => {
    it('should return all core property names', () => {
      const props = registry.getCorePropertyNames();

      expect(props.has('xarf_version')).toBe(true);
      expect(props.has('category')).toBe(true);
      expect(props.has('confidence')).toBe(true);
      expect(props.has('description')).toBe(true);
    });
  });

  describe('getTypeSchema', () => {
    it('should return schema for valid category/type', () => {
      const schema = registry.getTypeSchema('connection', 'ddos');
      expect(schema).not.toBeNull();
    });

    it('should handle underscore to hyphen conversion', () => {
      const schema = registry.getTypeSchema('messaging', 'bulk_messaging');
      expect(schema).not.toBeNull();
    });

    it('should return null for invalid category/type', () => {
      const schema = registry.getTypeSchema('invalid', 'invalid');
      expect(schema).toBeNull();
    });
  });
});
