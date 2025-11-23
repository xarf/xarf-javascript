# XARF JavaScript/TypeScript Library

![XARF Spec](https://img.shields.io/badge/XARF%20Spec-v4.0.0-blue)
[![npm version](https://badge.fury.io/js/xarf.svg)](https://www.npmjs.com/package/xarf)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Test](https://github.com/xarf/xarf-javascript/actions/workflows/test.yml/badge.svg)](https://github.com/xarf/xarf-javascript/actions/workflows/test.yml)

A comprehensive JavaScript/TypeScript library for parsing, validating, and generating XARF v4.0.0 (eXtended Abuse Reporting Format) reports.

## Features

- **Parser**: Parse and validate XARF reports from JSON
- **Generator**: Create XARF-compliant reports programmatically
- **Validator**: Comprehensive validation with detailed error reporting
- **TypeScript Support**: Full type definitions for all XARF structures
- **All Categories**: Support for all 8 XARF categories
  - Messaging
  - Connection
  - Content
  - Infrastructure
  - Copyright
  - Vulnerability
  - Reputation
  - Other

## Installation

```bash
npm install xarf
```

## Quick Start

### Parsing a Report

```typescript
import { XARFParser } from 'xarf';

const parser = new XARFParser();
const report = parser.parse({
  xarf_version: '4.0.0',
  report_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  timestamp: '2024-01-15T10:30:00Z',
  reporter: {
    org: 'Security Team',
    contact: 'abuse@example.com',
    type: 'automated'
  },
  source_identifier: '192.0.2.100',
  category: 'connection',
  type: 'ddos',
  evidence_source: 'honeypot',
  destination_ip: '203.0.113.10',
  protocol: 'tcp'
});

console.log(report.category); // 'connection'
```

### Generating a Report

```typescript
import { XARFGenerator } from 'xarf';

const generator = new XARFGenerator();
const report = generator.generateReport({
  category: 'messaging',
  reportType: 'spam',
  sourceIdentifier: '192.0.2.100',
  reporterContact: 'abuse@example.com',
  reporterOrg: 'Example Security',
  severity: 'medium',
  description: 'Spam email detected from source',
  tags: ['spam', 'email']
});

console.log(JSON.stringify(report, null, 2));
```

### Validating a Report

```typescript
import { XARFValidator } from 'xarf';

const validator = new XARFValidator();
const result = validator.validate(report);

if (result.valid) {
  console.log('Report is valid');
} else {
  console.log('Validation errors:', result.errors);
  console.log('Warnings:', result.warnings);
}
```

## API Documentation

### XARFParser

Parse and validate XARF reports from JSON.

```typescript
const parser = new XARFParser(strict?: boolean);
```

- `strict`: If `true`, throw exceptions on validation errors. If `false`, collect errors for retrieval.

#### Methods

- `parse(jsonData: string | object): XARFReport` - Parse a XARF report
- `validate(jsonData: string | object): boolean` - Validate without parsing
- `getErrors(): string[]` - Get validation errors from last operation

### XARFGenerator

Generate XARF-compliant reports programmatically.

```typescript
const generator = new XARFGenerator();
```

#### Methods

- `generateReport(options: GeneratorOptions): XARFReport` - Create a complete report
- `generateUUID(): string` - Generate a UUID for report ID
- `generateTimestamp(): string` - Generate an ISO 8601 timestamp
- `generateHash(data: string | Buffer, algorithm?: string): string` - Hash data
- `addEvidence(contentType: string, description: string, payload: string | Buffer): XARFEvidence` - Create evidence with hash
- `generateRandomEvidence(category: XARFCategory, description?: string): XARFEvidence` - Generate sample evidence
- `generateSampleReport(category: XARFCategory, reportType: string, includeEvidence?: boolean, includeOptional?: boolean): XARFReport` - Generate test report

### XARFValidator

Comprehensive validation with detailed error and warning reporting.

```typescript
const validator = new XARFValidator();
```

#### Methods

- `validate(report: XARFReport, strict?: boolean): ValidationResult` - Validate a report

Returns:
```typescript
{
  valid: boolean;
  errors: Array<{ field: string; message: string; value?: unknown }>;
  warnings: Array<{ field: string; message: string; value?: unknown }>;
}
```

## Categories and Types

### Messaging
- `spam`, `phishing`, `social_engineering`, `bulk_messaging`

### Connection
- `ddos`, `port_scan`, `login_attack`, `ip_spoofing`, `compromised`, `botnet`, `malicious_traffic`, and more

### Content
- `phishing_site`, `malware_distribution`, `defacement`, `spamvertised`, `web_hack`, and more

### Infrastructure
- `botnet`, `compromised_server`

### Copyright
- `infringement`, `dmca`, `trademark`, `p2p`, and more

### Vulnerability
- `cve`, `misconfiguration`, `open_service`

### Reputation
- `blocklist`, `threat_intelligence`

### Other
- `unclassified`

## On-Behalf-Of Reporting

XARF v4 supports reporting on behalf of another organization:

```typescript
const report = generator.generateReport({
  category: 'messaging',
  reportType: 'spam',
  sourceIdentifier: '192.0.2.100',
  reporterContact: 'reporter@example.com',
  reporterOrg: 'Reporter Organization',
  onBehalfOf: {
    org: 'Client Organization',
    contact: 'client@example.com',
    type: 'manual'
  }
});
```

## Examples

### Connection Report (DDoS)

```typescript
const report = generator.generateReport({
  category: 'connection',
  reportType: 'ddos',
  sourceIdentifier: '192.0.2.100',
  reporterContact: 'abuse@example.com',
  reporterOrg: 'Security Operations',
  additionalFields: {
    destination_ip: '203.0.113.10',
    protocol: 'tcp',
    destination_port: 80,
    attack_type: 'syn_flood',
    packet_count: 1000000
  },
  severity: 'high',
  confidence: 0.95
});
```

### Content Report (Phishing Site)

```typescript
const report = generator.generateReport({
  category: 'content',
  reportType: 'phishing_site',
  sourceIdentifier: '192.0.2.100',
  reporterContact: 'abuse@example.com',
  reporterOrg: 'Phishing Response Team',
  additionalFields: {
    url: 'http://phishing.example.com',
    content_type: 'text/html'
  },
  description: 'Phishing site mimicking banking portal',
  tags: ['phishing', 'banking', 'credential-theft'],
  severity: 'critical'
});
```

### Messaging Report (Spam)

```typescript
const report = generator.generateReport({
  category: 'messaging',
  reportType: 'spam',
  sourceIdentifier: '192.0.2.100',
  reporterContact: 'abuse@example.com',
  additionalFields: {
    protocol: 'smtp',
    smtp_from: 'spammer@evil.example.com',
    smtp_to: 'victim@example.com',
    subject: 'You won the lottery!',
    message_id: '<123456@evil.example.com>'
  },
  evidenceSource: 'spamtrap',
  severity: 'low'
});
```

## TypeScript Support

Full TypeScript definitions are included:

```typescript
import type {
  XARFReport,
  ConnectionReport,
  MessagingReport,
  XARFCategory,
  ReporterType
} from 'xarf';

const report: ConnectionReport = {
  // TypeScript will enforce correct structure
};
```

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Building

```bash
# Build TypeScript to JavaScript
npm run build

# Type check without building
npm run typecheck
```

## Linting and Formatting

```bash
# Run ESLint
npm run lint

# Fix linting issues
npm run lint:fix

# Check Prettier formatting
npm run format:check

# Format code
npm run format
```

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Run linting and formatting
6. Submit a pull request

## License

MIT License - see LICENSE file for details

## Links

- [XARF Specification](https://xarf.org)
- [GitHub Repository](https://github.com/xarf/xarf-javascript)
- [npm Package](https://www.npmjs.com/package/xarf)
- [Issue Tracker](https://github.com/xarf/xarf-javascript/issues)

## Version

Current version: 1.0.0-alpha.1
XARF Specification: 4.0.0

This is an alpha release supporting the messaging, connection, and content categories. Additional categories (infrastructure, copyright, vulnerability, reputation, other) are defined but may have limited validation in this release.
