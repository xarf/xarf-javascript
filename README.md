# XARF JavaScript/TypeScript Library

![XARF Spec](https://img.shields.io/badge/XARF%20Spec-v4.1.0-blue)
[![npm version](https://badge.fury.io/js/@xarf%2Fxarf.svg)](https://www.npmjs.com/package/@xarf/xarf)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/xarf/xarf-javascript/actions/workflows/ci.yml/badge.svg)](https://github.com/xarf/xarf-javascript/actions/workflows/ci.yml)

A comprehensive JavaScript/TypeScript library for parsing, validating, and generating XARF v4.0.0 (eXtended Abuse Reporting Format) reports.

## Features

- **Parser**: Parse and validate XARF reports from JSON
- **Generator**: Create XARF-compliant reports programmatically
- **Validator**: Comprehensive validation with detailed error reporting
- **TypeScript Support**: Full type definitions for all XARF structures
- **Backward Compatibility**: Automatic v3 to v4 conversion with deprecation warnings
- **All Categories**: Support for all 7 XARF categories
  - Messaging
  - Connection
  - Content
  - Infrastructure
  - Copyright
  - Vulnerability
  - Reputation

## Installation

```bash
npm install @xarf/xarf
```

## Quick Start

### Parsing a Report

```typescript
import { XARFParser } from '@xarf/xarf';

const parser = new XARFParser();
const report = parser.parse({
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
  category: 'connection',
  type: 'ddos',
  evidence_source: 'honeypot',
  destination_ip: '203.0.113.10',
  protocol: 'tcp',
});

console.log(report.category); // 'connection'
```

### Generating a Report

```typescript
import { XARFGenerator } from '@xarf/xarf';

const generator = new XARFGenerator();
const report = generator.generateReport({
  category: 'messaging',
  type: 'spam', // Using XARF spec field name
  source_identifier: '192.0.2.100', // snake_case matches XARF spec
  reporter: {
    org: 'Example Security',
    contact: 'abuse@example.com',
    domain: 'example.com',
  },
  sender: {
    org: 'Example Security',
    contact: 'abuse@example.com',
    domain: 'example.com',
  },
  evidence_source: 'automated_scan', // snake_case matches XARF spec
  description: 'Spam email detected from source',
  tags: ['spam', 'email'],
  // Category-specific fields can be passed directly (union types)
  protocol: 'smtp',
  smtp_from: 'spammer@evil.example.com',
});

console.log(JSON.stringify(report, null, 2));
```

### Validating a Report

```typescript
import { XARFValidator } from '@xarf/xarf';

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

#### GeneratorOptions

The `GeneratorOptions` interface for `generateReport()` supports both **snake_case** (XARF spec, preferred) and **camelCase** (backward compatibility).

**Union Types**: Category-specific fields can be passed directly without using `additionalFields`:

```typescript
// Messaging report with direct fields
const messagingReport = generator.generateReport({
  category: 'messaging',
  type: 'spam',
  source_identifier: '192.0.2.100',
  reporter: { org: '...', contact: '...', domain: '...' },
  sender: { org: '...', contact: '...', domain: '...' },
  evidence_source: 'spamtrap',
  // Messaging-specific fields directly on options
  protocol: 'smtp',
  smtp_from: 'spammer@evil.example.com',
  subject: 'You won!',
});

// Connection report with direct fields
const connectionReport = generator.generateReport({
  category: 'connection',
  type: 'ddos',
  source_identifier: '192.0.2.100',
  reporter: { org: '...', contact: '...', domain: '...' },
  sender: { org: '...', contact: '...', domain: '...' },
  evidence_source: 'honeypot',
  // Connection-specific fields directly on options
  destination_ip: '203.0.113.10',
  protocol: 'tcp',
  destination_port: 80,
});
```

**Base Options** (all categories):

```typescript
{
  category: XARFCategory;                    // Required: Report category
  type?: string;                             // Report type (e.g., 'spam', 'ddos')
  reportType?: string;                       // Backward compatibility alias
  source_identifier?: string;                // Required: Source IP or identifier
  sourceIdentifier?: string;                 // Backward compatibility alias
  reporter: ContactInfo;                     // Required: Reporter information
  sender: ContactInfo;                       // Required: Sender information
  evidence_source?: EvidenceSource;          // Evidence source
  evidenceSource?: EvidenceSource;           // Backward compatibility alias
  description?: string;                      // Human-readable description
  evidence?: XARFEvidence[];                 // Evidence items
  confidence?: number;                       // Confidence score (0.0 to 1.0)
  tags?: string[];                           // Tags for categorization
  additionalFields?: Record<string, unknown>; // Additional fields (legacy approach)
}
```

**Note:** The library accepts both naming conventions but generates reports using snake_case as per the XARF specification.

### XARFValidator

Comprehensive validation with detailed error and warning reporting.

```typescript
const validator = new XARFValidator();
```

#### Methods

- `validate(report: XARFReport, strict?: boolean, showMissingOptional?: boolean): ValidationResult` - Validate a report

Parameters:

- `report` - The XARF report to validate
- `strict` - If `true`, throw `XARFValidationError` on validation failures (default: `false`)
- `showMissingOptional` - If `true`, include info about missing optional fields (default: `false`)

Returns:

```typescript
{
  valid: boolean;
  errors: Array<{ field: string; message: string; value?: unknown }>;
  warnings: Array<{ field: string; message: string; value?: unknown }>;
  info?: Array<{ field: string; message: string }>;  // Only when showMissingOptional=true
}
```

#### Unknown Field Detection

The validator automatically warns about unknown fields in reports:

```typescript
const report = {
  // ... valid fields ...
  unknownField: 'value', // Will trigger a warning
};

const result = validator.validate(report);
// result.warnings will include: "Unknown field 'unknownField' is not defined in the XARF schema"
```

In strict mode, unknown fields are treated as errors.

#### Missing Optional Fields

Use `showMissingOptional` to discover which optional fields you could add:

```typescript
const result = validator.validate(report, false, true);

if (result.info) {
  result.info.forEach(({ field, message }) => {
    console.log(`${field}: ${message}`);
    // e.g., "description: OPTIONAL - Human-readable description of the abuse"
    // e.g., "confidence: RECOMMENDED - Confidence score between 0.0 and 1.0"
  });
}
```

### SchemaRegistry

Access schema-derived validation rules programmatically:

```typescript
import { schemaRegistry } from '@xarf/xarf';

// Get all valid categories
const categories = schemaRegistry.getCategories();
// Set { 'messaging', 'connection', 'content', ... }

// Get valid types for a category
const types = schemaRegistry.getTypesForCategory('connection');
// Set { 'ddos', 'port_scan', 'login_attack', ... }

// Check if a category/type combination is valid
schemaRegistry.isValidType('connection', 'ddos'); // true

// Get valid evidence sources
const sources = schemaRegistry.getEvidenceSources();
// Set { 'honeypot', 'spamtrap', 'user_report', ... }

// Get field metadata including descriptions
const metadata = schemaRegistry.getFieldMetadata('confidence');
// { description: '...', required: false, recommended: true, ... }
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

## Examples

### Connection Report (DDoS)

```typescript
const report = generator.generateReport({
  category: 'connection',
  type: 'ddos',
  source_identifier: '192.0.2.100',
  reporter: {
    org: 'Security Operations',
    contact: 'abuse@example.com',
    domain: 'example.com',
  },
  sender: {
    org: 'Security Operations',
    contact: 'abuse@example.com',
    domain: 'example.com',
  },
  evidence_source: 'honeypot',
  // Category-specific fields directly (union types)
  destination_ip: '203.0.113.10',
  protocol: 'tcp',
  destination_port: 80,
  attack_type: 'syn_flood',
  confidence: 0.95,
});
```

### Content Report (Phishing Site)

```typescript
const report = generator.generateReport({
  category: 'content',
  type: 'phishing',
  source_identifier: '192.0.2.100',
  reporter: {
    org: 'Phishing Response Team',
    contact: 'abuse@example.com',
    domain: 'example.com',
  },
  sender: {
    org: 'Phishing Response Team',
    contact: 'abuse@example.com',
    domain: 'example.com',
  },
  evidence_source: 'user_report',
  // Category-specific fields directly (union types)
  url: 'http://phishing.example.com',
  content_type: 'text/html',
  description: 'Phishing site mimicking banking portal',
  tags: ['phishing', 'banking', 'credential-theft'],
});
```

### Messaging Report (Spam)

```typescript
const report = generator.generateReport({
  category: 'messaging',
  type: 'spam',
  source_identifier: '192.0.2.100',
  reporter: {
    org: 'Example Security',
    contact: 'abuse@example.com',
    domain: 'example.com',
  },
  sender: {
    org: 'Example Security',
    contact: 'abuse@example.com',
    domain: 'example.com',
  },
  evidence_source: 'spamtrap',
  // Category-specific fields directly (union types)
  protocol: 'smtp',
  smtp_from: 'spammer@evil.example.com',
  smtp_to: 'victim@example.com',
  subject: 'You won the lottery!',
  message_id: '<123456@evil.example.com>',
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
  ReporterType,
} from '@xarf/xarf';

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

## Schema Management

This library validates against the official [xarf-spec](https://github.com/xarf/xarf-spec) JSON schemas. Schemas are automatically fetched from the xarf-spec repository on `npm install`.

### Checking for Schema Updates

```bash
# Check if a newer version of xarf-spec is available
npm run check-schema-updates

# Show all available releases
npm run check-schema-updates -- --all
```

Example output:

```
[xarf] Checking for schema updates...

  Configured version: v4.1.0
  Installed version:  v4.1.0
  Latest release:     v4.1.0 (Dec 18, 2025)

  ✅ You are using the latest version.
```

### Updating Schemas

To update to a newer version of the XARF specification:

1. Edit `package.json` and update the version:

   ```json
   "xarfSpec": {
     "version": "v4.2.0"
   }
   ```

2. Run npm install to fetch the new schemas:
   ```bash
   npm install
   ```

### Manual Schema Fetch

```bash
# Re-fetch schemas from xarf-spec (useful if schemas are missing)
npm run fetch-schemas
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
- [npm Package](https://www.npmjs.com/package/@xarf/xarf)
- [Issue Tracker](https://github.com/xarf/xarf-javascript/issues)

## Backward Compatibility (v3 Legacy Support)

This library automatically detects and converts XARF v3 format reports to v4:

```typescript
import { XARFParser } from '@xarf/xarf';

const parser = new XARFParser();

// v3 format report
const v3Report = {
  Version: '3',
  ReporterInfo: {
    ReporterOrg: 'Security Team',
    ReporterOrgEmail: 'abuse@example.com',
  },
  Report: {
    ReportType: 'Spam',
    Date: '2024-01-15T10:00:00Z',
    SourceIp: '192.0.2.100',
    Protocol: 'smtp',
    SmtpMailFromAddress: 'spammer@evil.example',
  },
};

// Automatically converted to v4 format
const report = parser.parse(v3Report);
console.log(report.xarf_version); // '4.0.0'
console.log(report.category); // 'messaging'
console.log(report.type); // 'spam'
console.log(report._internal?.legacy_version); // '3'

// Get deprecation warnings
const warnings = parser.getWarnings();
console.log(warnings); // Contains deprecation notice
```

### v3 Format Detection

The parser automatically detects v3 reports by checking for the `Version` field:

```typescript
import { isXARFv3 } from '@xarf/xarf';

if (isXARFv3(jsonData)) {
  console.log('This is a legacy v3 report');
}
```

### Manual v3 Conversion

You can also manually convert v3 reports:

```typescript
import { convertV3toV4, getV3DeprecationWarning } from '@xarf/xarf';

const warnings: string[] = [];
const v4Report = convertV3toV4(v3Report, warnings);

console.log(getV3DeprecationWarning());
// "DEPRECATION WARNING: XARF v3 format detected..."
```

### v3 Type Mapping

The following v3 report types are automatically mapped to v4 categories:

| v3 ReportType | v4 Category    | v4 Type      |
| ------------- | -------------- | ------------ |
| Spam          | messaging      | spam         |
| Login-Attack  | connection     | login_attack |
| Port-Scan     | connection     | port_scan    |
| DDoS          | connection     | ddos         |
| Phishing      | content        | phishing     |
| Malware       | content        | malware      |
| Botnet        | infrastructure | botnet       |
| Copyright     | copyright      | copyright    |

Unknown v3 report types are mapped to category `content` with type `unclassified`.

## Version

Current version: 1.0.0
XARF Specification: 4.1.0 (from [xarf-spec](https://github.com/xarf/xarf-spec))

Production release with full support for all 7 XARF categories: messaging, connection, content, infrastructure, copyright, vulnerability, and reputation.

**Schema Updates**: Schemas are fetched from the official xarf-spec repository. Run `npm run check-schema-updates` to check for new versions.

**v3 Compatibility**: Full backward compatibility with XARF v3 format with automatic conversion and deprecation warnings.
