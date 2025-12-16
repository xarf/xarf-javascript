/**
 * XARF Error Classes
 */

/**
 * Base error class for all XARF-related errors
 */
export class XARFError extends Error {
  /**
   * Create a new XARF error
   * @param message - Error message
   */
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

  /**
   * Create a new XARF validation error
   * @param message - Error message
   * @param errors - Array of validation error messages
   */
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
  /**
   * Create a new XARF parse error
   * @param message - Error message
   */
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
  /**
   * Create a new XARF schema error
   * @param message - Error message
   */
  constructor(message: string) {
    super(message);
    this.name = 'XARFSchemaError';
    Object.setPrototypeOf(this, XARFSchemaError.prototype);
  }
}
