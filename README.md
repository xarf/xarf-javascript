# XARF JavaScript/TypeScript Library

![XARF Spec](https://img.shields.io/badge/XARF%20Spec-v4.2.0-blue)
[![npm version](https://badge.fury.io/js/xarf.svg)](https://www.npmjs.com/package/xarf)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Test](https://github.com/xarf/xarf-javascript/actions/workflows/test.yml/badge.svg)](https://github.com/xarf/xarf-javascript/actions/workflows/test.yml)

A JavaScript/TypeScript library for parsing, validating, and generating [XARF v4](https://xarf.org) (eXtended Abuse Reporting Format) reports.

## Features

- **Parse** XARF reports from JSON with validation and typed results
- **Generate** XARF-compliant reports with auto-generated metadata (UUIDs, timestamps)
- **Validate** reports against the official JSON schemas with detailed errors and warnings
- **Full TypeScript support** with discriminated union types for all 7 categories
- **v3 backward compatibility** with automatic detection and conversion
- **Schema-driven** — validation rules derived from the official [xarf-spec](https://github.com/xarf/xarf-spec) schemas, not hardcoded

## Installation

```bash
npm install @xarf/xarf
```

## Quick Start

### Parsing a Report

```typescript
import { parse } from '@xarf/xarf';

// Missing first_seen and source_port produce validation errors.
const { report, errors, warnings } = parse({
  xarf_version: '4.2.0',
  report_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  timestamp: '2024-01-15T10:30:00Z',
  // first_seen: '2024-01-15T10:00:00Z',
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
  // source_port: 1234,
  category: 'connection',
  type: 'ddos',
  evidence_source: 'honeypot',
  destination_ip: '203.0.113.10',
  protocol: 'tcp',
});

if (errors.length === 0) {
  console.log(report.category); // 'connection'
} else {
  console.log('Validation errors:', errors);
}
```

### Creating a Report

```typescript
import { createReport, createEvidence } from '@xarf/xarf';

// Returns { content_type, payload (base64), hash, size, description }
const evidence = createEvidence('message/rfc822', rawEmailContent, {
  description: 'Original spam email',
  hashAlgorithm: 'sha256',
});

// xarf_version, report_id, and timestamp are auto-generated
const { report, errors, warnings } = createReport({
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
  description: 'Spam email detected from source',
  protocol: 'smtp',
  smtp_from: 'spammer@evil.example.com',
  evidence: [evidence],
});

console.log(JSON.stringify(report, null, 2));
```

## API Reference

### `parse(jsonData, options?)`

Parse and validate a XARF report from JSON. Supports both v4 and v3 (legacy) formats — v3 reports are automatically converted to v4 with deprecation warnings.

```typescript
import { parse } from '@xarf/xarf';

const { report, errors, warnings, info } = parse(jsonData, options?);
```

**Parameters:**

- `jsonData: string | Record<string, unknown>` — JSON string or object containing a XARF report
- `options.strict?: boolean` — Throw `XARFValidationError` on validation failures (default: `false`)
- `options.showMissingOptional?: boolean` — Include info about missing optional fields (default: `false`)

**Returns `Promise<ParseResult>`:**

- `report: XARFReport` — The parsed report, typed by category
- `errors: string[]` — Validation errors (empty if valid)
- `warnings: string[]` — Validation warnings
- `info?: ValidationInfo[]` — Missing optional field info (only when `showMissingOptional` is `true`)

### `createReport(input, options?)`

Create a validated XARF report with auto-generated metadata. Automatically fills `xarf_version`, `report_id` (UUID), and `timestamp` (ISO 8601) if not provided.

```typescript
import { createReport } from '@xarf/xarf';

const { report, errors, warnings } = createReport(input, options?);
```

**Parameters:**

- `input: ReportInput` — Report data. A discriminated union on `category` that narrows type-safe fields per category (e.g., `MessagingReportInput`, `ConnectionReportInput`, etc.)
- `options.strict?: boolean` — Throw on validation failures (default: `false`)
- `options.showMissingOptional?: boolean` — Include info about missing optional fields (default: `false`)

**Returns `CreateReportResult`:**

- `report: XARFReport` — The generated report
- `errors: ValidationError[]` — Structured validation errors (`{ field, message, value? }`)
- `warnings: ValidationWarning[]` — Structured validation warnings (`{ field, message, value? }`)
- `info?: ValidationInfo[]` — Missing optional field info (only when `showMissingOptional` is `true`)

### `createEvidence(contentType, payload, options?)`

Create an evidence object with automatic base64 encoding, hashing, and size calculation.

```typescript
import { createEvidence } from '@xarf/xarf';

const evidence = createEvidence(contentType, payload, options?);
```

**Parameters:**

- `contentType: string` — MIME type of the evidence (e.g., `'message/rfc822'`)
- `payload: string | Uint8Array` — The evidence data
- `options.description?: string` — Human-readable description
- `options.hashAlgorithm?: 'sha256' | 'sha512' | 'sha1'` — Hash algorithm (default: `'sha256'`)

**Returns `Promise<XARFEvidence>`** with computed `hash`, `size`, and base64-encoded `payload`.

### `schemaRegistry`

Access schema-derived validation rules and metadata programmatically.

```typescript
import { schemaRegistry } from '@xarf/xarf';

// Get all valid categories
schemaRegistry.getCategories();
// Set { 'messaging', 'connection', 'content', 'infrastructure', 'copyright', 'vulnerability', 'reputation' }

// Get valid types for a category
schemaRegistry.getTypesForCategory('connection');
// Set { 'ddos', 'port_scan', 'login_attack', ... }

// Check if a category/type combination is valid
schemaRegistry.isValidType('connection', 'ddos'); // true

// Get field metadata including descriptions
schemaRegistry.getFieldMetadata('confidence');
// { description: '...', required: false, recommended: true, ... }
```

### Validation Details

Both `parse()` and `createReport()` run validation internally. Additional behaviors:

- **Unknown fields** trigger warnings (or errors in strict mode)
- **Missing optional fields** can be discovered with `showMissingOptional: true`:

```typescript
const { info } = parse(report, { showMissingOptional: true });

if (info) {
  info.forEach(({ field, message }) => {
    console.log(`${field}: ${message}`);
    // e.g., "description: OPTIONAL - Human-readable description of the abuse"
    // e.g., "confidence: RECOMMENDED - Confidence score between 0.0 and 1.0"
  });
}
```

## v3 Backward Compatibility

The library automatically detects XARF v3 reports (by the `Version` field) and converts them to v4 during parsing. Converted reports include `legacy_version: '3'` and deprecation warnings.

```typescript
import { parse } from '@xarf/xarf';

const { report, warnings } = parse(v3Report);

console.log(report.xarf_version); // '4.2.0'
console.log(report.category); // mapped category (e.g., 'messaging')
console.log(report.legacy_version); // '3'
// warnings includes deprecation notice + conversion details
```

You can also use the low-level utilities directly:

```typescript
import { isXARFv3, convertV3toV4, getV3DeprecationWarning } from '@xarf/xarf';

if (isXARFv3(jsonData)) {
  const warnings: string[] = [];
  const v4Report = convertV3toV4(v3Report, warnings);
  console.log(getV3DeprecationWarning());
}
```

Unknown v3 report types cause a parse error listing the supported types. See [MIGRATION_V3_TO_V4.md](docs/MIGRATION_V3_TO_V4.md) for the full type mapping and migration strategies.

## Schema Management

This library validates against the official [xarf-spec](https://github.com/xarf/xarf-spec) JSON schemas. Previously, schemas were downloaded from GitHub during `npm install` via a postinstall script. They are now bundled directly in the repository under `src/schemas/`, so no network access is needed during `npm install` or `npm run build`. Contributors and CI get working schemas out of the box.

```bash
# Check if a newer version of xarf-spec is available
npm run check-schema-updates

# Update bundled schemas to the version configured in package.json (maintainers only)
npm run fetch-schemas
```

To update to a newer spec version:

1. Bump `xarfSpec.version` in `package.json`
2. Run `npm run fetch-schemas`
3. If new schema files were added, add the corresponding imports and entries to `src/bundled-schemas.ts`
4. Commit the changes in `src/schemas/` and `src/bundled-schemas.ts`

## Development

```bash
npm test                  # Run tests
npm run test:coverage     # Run tests with coverage
npm run build             # Build TypeScript to JavaScript
npm run typecheck         # Type-check without emitting
npm run lint              # Run ESLint
npm run format:check      # Check Prettier formatting
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## Links

- [XARF Specification](https://xarf.org)
- [GitHub Repository](https://github.com/xarf/xarf-javascript)
- [npm Package](https://www.npmjs.com/package/xarf)
- [Issue Tracker](https://github.com/xarf/xarf-javascript/issues)
- [Migration Guide (v3 → v4)](docs/MIGRATION_V3_TO_V4.md)
- [License (MIT)](LICENSE)
