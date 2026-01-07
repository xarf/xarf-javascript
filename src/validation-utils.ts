/**
 * Shared validation utilities for XARF
 *
 * Centralizes validation logic used across parser, validator, and generator
 * to ensure consistent behavior and reduce code duplication.
 */

/**
 * Regular expression for validating email addresses
 * Matches standard email format: local@domain.tld
 */
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Regular expression for validating domain/hostname
 * Matches valid hostnames per RFC 1123
 */
const DOMAIN_REGEX =
  /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * Validation result for individual field checks
 */
export interface FieldValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validation result for contact info
 */
export interface ContactValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate an email address
 * @param email - Email address to validate
 * @returns Validation result with error message if invalid
 */
export function validateEmail(email: string | undefined | null): FieldValidationResult {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }
  if (!EMAIL_REGEX.test(email)) {
    return { valid: false, error: `Invalid email format: ${email}` };
  }
  return { valid: true };
}

/**
 * Validate a domain/hostname
 * @param domain - Domain to validate
 * @returns Validation result with error message if invalid
 */
export function validateDomain(domain: string | undefined | null): FieldValidationResult {
  if (!domain || typeof domain !== 'string') {
    return { valid: false, error: 'Domain is required' };
  }
  if (!DOMAIN_REGEX.test(domain)) {
    return { valid: false, error: `Invalid domain format: ${domain}` };
  }
  return { valid: true };
}

/**
 * Validate an organization name
 * @param org - Organization name to validate
 * @returns Validation result with error message if invalid
 */
export function validateOrg(org: string | undefined | null): FieldValidationResult {
  if (!org || typeof org !== 'string' || org.trim().length === 0) {
    return { valid: false, error: 'Organization name is required and must be non-empty' };
  }
  return { valid: true };
}

/**
 * Validate a complete ContactInfo object (reporter, sender, on_behalf_of)
 * @param contactInfo - Contact info object to validate
 * @param fieldName - Name of the field for error messages (e.g., 'reporter', 'sender')
 * @returns Validation result with all errors
 */
export function validateContactInfo(
  contactInfo: Record<string, unknown> | undefined | null,
  fieldName: string
): ContactValidationResult {
  const errors: string[] = [];

  if (!contactInfo || typeof contactInfo !== 'object') {
    return { valid: false, errors: [`${fieldName} is required`] };
  }

  // Validate org
  const orgResult = validateOrg(contactInfo.org as string);
  if (!orgResult.valid) {
    errors.push(`${fieldName}.org: ${orgResult.error}`);
  }

  // Validate contact (email)
  const emailResult = validateEmail(contactInfo.contact as string);
  if (!emailResult.valid) {
    errors.push(`${fieldName}.contact: ${emailResult.error}`);
  }

  // Validate domain
  const domainResult = validateDomain(contactInfo.domain as string);
  if (!domainResult.valid) {
    errors.push(`${fieldName}.domain: ${domainResult.error}`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate an ISO 8601 timestamp
 * @param timestamp - Timestamp string to validate
 * @returns Validation result with error message if invalid
 */
export function validateTimestamp(timestamp: string | undefined | null): FieldValidationResult {
  if (!timestamp || typeof timestamp !== 'string') {
    return { valid: false, error: 'Timestamp is required' };
  }

  const date = new Date(timestamp);
  if (isNaN(date.getTime())) {
    return { valid: false, error: `Invalid timestamp format: ${timestamp}` };
  }

  return { valid: true };
}
