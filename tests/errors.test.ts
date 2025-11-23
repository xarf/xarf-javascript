/**
 * Tests for XARF Error Classes
 */

import { XARFError, XARFValidationError, XARFParseError, XARFSchemaError } from '../src/errors';

describe('XARFError Classes', () => {
  describe('XARFError', () => {
    it('should create error with message', () => {
      const error = new XARFError('Test error message');

      expect(error.message).toBe('Test error message');
      expect(error.name).toBe('XARFError');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(XARFError);
    });

    it('should have correct prototype chain', () => {
      const error = new XARFError('Test');

      expect(Object.getPrototypeOf(error)).toBe(XARFError.prototype);
    });
  });

  describe('XARFValidationError', () => {
    it('should create error with message only', () => {
      const error = new XARFValidationError('Validation failed');

      expect(error.message).toBe('Validation failed');
      expect(error.name).toBe('XARFValidationError');
      expect(error.errors).toEqual([]);
      expect(error).toBeInstanceOf(XARFError);
      expect(error).toBeInstanceOf(XARFValidationError);
    });

    it('should create error with message and errors array', () => {
      const errors = ['Field missing', 'Invalid value'];
      const error = new XARFValidationError('Validation failed', errors);

      expect(error.message).toBe('Validation failed');
      expect(error.errors).toEqual(errors);
      expect(error.errors).toHaveLength(2);
    });

    it('should use default empty array when errors not provided', () => {
      const error = new XARFValidationError('Test message');

      expect(error.errors).toEqual([]);
      expect(Array.isArray(error.errors)).toBe(true);
    });

    it('should have correct prototype chain', () => {
      const error = new XARFValidationError('Test', ['error1']);

      expect(Object.getPrototypeOf(error)).toBe(XARFValidationError.prototype);
    });
  });

  describe('XARFParseError', () => {
    it('should create error with message', () => {
      const error = new XARFParseError('Parse failed');

      expect(error.message).toBe('Parse failed');
      expect(error.name).toBe('XARFParseError');
      expect(error).toBeInstanceOf(XARFError);
      expect(error).toBeInstanceOf(XARFParseError);
    });

    it('should have correct prototype chain', () => {
      const error = new XARFParseError('Test');

      expect(Object.getPrototypeOf(error)).toBe(XARFParseError.prototype);
    });
  });

  describe('XARFSchemaError', () => {
    it('should create error with message', () => {
      const error = new XARFSchemaError('Schema validation failed');

      expect(error.message).toBe('Schema validation failed');
      expect(error.name).toBe('XARFSchemaError');
      expect(error).toBeInstanceOf(XARFError);
      expect(error).toBeInstanceOf(XARFSchemaError);
    });

    it('should have correct prototype chain', () => {
      const error = new XARFSchemaError('Test');

      expect(Object.getPrototypeOf(error)).toBe(XARFSchemaError.prototype);
    });
  });

  describe('Error inheritance', () => {
    it('should all inherit from Error', () => {
      const xarfError = new XARFError('Test');
      const validationError = new XARFValidationError('Test');
      const parseError = new XARFParseError('Test');
      const schemaError = new XARFSchemaError('Test');

      expect(xarfError).toBeInstanceOf(Error);
      expect(validationError).toBeInstanceOf(Error);
      expect(parseError).toBeInstanceOf(Error);
      expect(schemaError).toBeInstanceOf(Error);
    });

    it('should all inherit from XARFError', () => {
      const validationError = new XARFValidationError('Test');
      const parseError = new XARFParseError('Test');
      const schemaError = new XARFSchemaError('Test');

      expect(validationError).toBeInstanceOf(XARFError);
      expect(parseError).toBeInstanceOf(XARFError);
      expect(schemaError).toBeInstanceOf(XARFError);
    });
  });
});
