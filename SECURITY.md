# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.0   | :white_check_mark: |
| 1.0.0-alpha.2 | :x: (upgrade to 1.0.0) |
| 1.0.0-alpha.1 | :x: (upgrade to 1.0.0) |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue in this project, please report it responsibly.

### How to Report

**DO NOT** open a public GitHub issue for security vulnerabilities.

Instead, please email security details to: **security@xarf.org**

Include the following information in your report:
- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact
- Suggested fix (if available)

### What to Expect

- **Acknowledgment**: We will acknowledge receipt of your vulnerability report within 48 hours
- **Assessment**: We will assess the severity and impact of the vulnerability
- **Updates**: We will keep you informed of our progress toward a fix
- **Disclosure**: Once a fix is available, we will coordinate disclosure timing with you

## Security Best Practices

When using the XARF JavaScript parser, follow these security best practices:

### Input Validation

1. **Always validate XARF reports** against the schema before processing
2. **Sanitize all user-supplied data** before using it in XARF reports
3. **Set size limits** on incoming reports to prevent memory exhaustion
4. **Validate email addresses** and other contact information before use

### Safe Parsing

```javascript
// Example: Safe parsing with error handling
try {
  const report = parser.parse(input);

  // Validate against schema
  if (!validator.validate(report)) {
    throw new Error('Invalid XARF report structure');
  }

  // Process validated report
  processReport(report);
} catch (error) {
  // Handle parsing errors securely
  logger.error('Parsing failed', { error: error.message });
  // Do not expose internal details to users
}
```

### Data Handling

1. **Do not log sensitive information** from XARF reports
2. **Redact PII** when logging or storing reports
3. **Use secure transport** (HTTPS/TLS) when transmitting reports
4. **Encrypt sensitive data** at rest

### Dependency Management

1. **Regularly update dependencies** to patch known vulnerabilities
2. **Use `npm audit`** to check for security issues
3. **Review security advisories** for dependencies
4. **Consider using lock files** (`package-lock.json`) for reproducible builds

### Code Practices

1. **Avoid eval()** and similar dynamic code execution
2. **Use strict mode** (`"use strict"`)
3. **Validate all inputs** before processing
4. **Follow principle of least privilege** in code design

## Known Security Considerations

### XARF Report Content

XARF reports may contain:
- Email addresses and contact information
- IP addresses and network data
- Potentially malicious content samples
- Sensitive abuse details

**Always treat XARF report content as untrusted user input.**

### Schema Validation

While the parser validates structure, additional application-level validation may be required for:
- Email address format verification
- IP address range validation
- URL safety checks
- Content length restrictions

## Security Updates

Security updates will be released as soon as possible after a vulnerability is confirmed and fixed. Updates will be announced through:
- GitHub Security Advisories
- Release notes
- Project changelog

## Acknowledgments

We appreciate the security research community's efforts in responsibly disclosing vulnerabilities. Contributors who report valid security issues will be acknowledged (with their permission) in our security advisories.
