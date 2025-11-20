/**
 * XARF Error Classes
 */

/**
 * Base error class for all XARF-related errors
 */
export class XARFError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'XARFError';
    Object.setPrototypeOf(this, XARFError.prototype);
  }
}

/**
 * Error thrown when XARF report validation fails
 */
export class XARFValidationError extends XARFError {
  public readonly errors: string[];

  constructor(message: string, errors: string[] = []) {
    super(message);
    this.name = 'XARFValidationError';
    this.errors = errors;
    Object.setPrototypeOf(this, XARFValidationError.prototype);
  }
}

/**
 * Error thrown when XARF report parsing fails
 */
export class XARFParseError extends XARFError {
  constructor(message: string) {
    super(message);
    this.name = 'XARFParseError';
    Object.setPrototypeOf(this, XARFParseError.prototype);
  }
}

/**
 * Error thrown when XARF schema validation fails
 */
export class XARFSchemaError extends XARFError {
  constructor(message: string) {
    super(message);
    this.name = 'XARFSchemaError';
    Object.setPrototypeOf(this, XARFSchemaError.prototype);
  }
}
