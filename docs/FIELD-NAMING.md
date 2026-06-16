# Field Naming Conventions

## Overview

The XARF JavaScript library now supports both **snake_case** (XARF specification format) and **camelCase** (backward compatibility) field names in the `GeneratorOptions` interface.

## Preferred Format: snake_case

The XARF v4.0.0 specification uses **snake_case** for all field names. This is the preferred format and should be used in all new code.

### Example (Preferred)

```typescript
import { XARFGenerator } from '@xarf/xarf';

const generator = new XARFGenerator();

const report = generator.generateReport({
  category: 'connection',
  type: 'ddos', // XARF spec field name
  source_identifier: '192.0.2.100', // XARF spec field name
  evidence_source: 'honeypot', // XARF spec field name
  on_behalf_of: {
    // XARF spec field name
    org: 'Client Company',
    contact: 'abuse@client.com',
    domain: 'client.com',
  },
  reporter: {
    org: 'Security Team',
    contact: 'security@example.com',
    domain: 'example.com',
  },
  sender: {
    org: 'SOC',
    contact: 'soc@example.com',
    domain: 'example.com',
  },
  additionalFields: {
    destination_ip: '203.0.113.50',
    protocol: 'tcp',
  },
});
```

## Backward Compatibility: camelCase

For backward compatibility, the library still accepts **camelCase** field names. However, these are **deprecated** and may be removed in a future major version.

### Example (Deprecated)

```typescript
const report = generator.generateReport({
  category: 'connection',
  reportType: 'ddos', // Deprecated: use "type"
  sourceIdentifier: '192.0.2.100', // Deprecated: use "source_identifier"
  evidenceSource: 'honeypot', // Deprecated: use "evidence_source"
  onBehalfOf: {
    // Deprecated: use "on_behalf_of"
    org: 'Client Company',
    contact: 'abuse@client.com',
    domain: 'client.com',
  },
  reporter: {
    /* ... */
  },
  sender: {
    /* ... */
  },
  additionalFields: {
    destination_ip: '203.0.113.50',
    protocol: 'tcp',
  },
});
```

## Field Name Mapping

| XARF Spec (snake_case) | Deprecated (camelCase) | Required |
| ---------------------- | ---------------------- | -------- |
| `type`                 | `reportType`           | Yes      |
| `source_identifier`    | `sourceIdentifier`     | Yes      |
| `evidence_source`      | `evidenceSource`       | No       |
| `on_behalf_of`         | `onBehalfOf`           | No       |

## Precedence Rules

When both naming conventions are provided, **snake_case takes precedence**:

```typescript
const report = generator.generateReport({
  category: 'connection',
  type: 'port_scan', // ✓ This value is used
  reportType: 'ddos', // ✗ This value is ignored
  source_identifier: '192.0.2.50', // ✓ This value is used
  sourceIdentifier: '192.0.2.100', // ✗ This value is ignored
  // ...
});

// Result: report.type === 'port_scan'
```

## Output Format

**All generated reports use snake_case field names**, regardless of the input format. This ensures compliance with the XARF v4.0.0 specification.

```typescript
// Input: camelCase
const report = generator.generateReport({
  reportType: 'ddos',
  sourceIdentifier: '192.0.2.100',
  // ...
});

// Output: ALWAYS snake_case
console.log(report.type); // 'ddos'
console.log(report.source_identifier); // '192.0.2.100'
console.log(report.reportType); // undefined
console.log(report.sourceIdentifier); // undefined
```

## Migration Guide

### Step 1: Update Generator Calls

Replace camelCase field names with snake_case:

```typescript
// Before (deprecated)
generator.generateReport({
  category: 'messaging',
  reportType: 'spam',
  sourceIdentifier: '192.0.2.100',
  evidenceSource: 'spamtrap',
  onBehalfOf: {
    /* ... */
  },
  // ...
});

// After (preferred)
generator.generateReport({
  category: 'messaging',
  type: 'spam',
  source_identifier: '192.0.2.100',
  evidence_source: 'spamtrap',
  on_behalf_of: {
    /* ... */
  },
  // ...
});
```

### Step 2: Update Type Annotations

If you're using TypeScript with explicit types, update your interfaces:

```typescript
// Before
interface MyReportOptions {
  reportType: string;
  sourceIdentifier: string;
  evidenceSource?: string;
}

// After
interface MyReportOptions {
  type: string;
  source_identifier: string;
  evidence_source?: string;
}
```

### Step 3: Verify Tests

Ensure your tests check for snake_case field names in the output:

```typescript
expect(report.type).toBe('ddos');
expect(report.source_identifier).toBe('192.0.2.100');
expect(report.evidence_source).toBe('honeypot');
```

## Error Messages

Error messages reference both naming conventions for clarity:

```typescript
try {
  generator.generateReport({
    category: 'connection',
    // Missing type/reportType
    reporter: {
      /* ... */
    },
    sender: {
      /* ... */
    },
  });
} catch (error) {
  console.error(error.message);
  // "type (or reportType) is required"
}
```

## Additional Fields

The `additionalFields` object should always use snake_case field names to match the XARF specification:

```typescript
generator.generateReport({
  // ...
  additionalFields: {
    destination_ip: '203.0.113.50', // ✓ Correct
    destination_port: 80, // ✓ Correct
    packet_count: 1500, // ✓ Correct
    // destinationIp: '203.0.113.50',   // ✗ Incorrect
  },
});
```

## Benefits of snake_case

1. **Spec Compliance**: Matches XARF v4.0.0 specification exactly
2. **Consistency**: Same naming in code and JSON output
3. **Interoperability**: Compatible with other XARF implementations
4. **Clarity**: No need to mentally map between input and output formats

## Deprecation Timeline

- **v1.x**: Both snake_case and camelCase supported (current)
- **v2.x**: Both supported, deprecation warnings added
- **v3.x**: camelCase removed, only snake_case supported

## See Also

- [XARF v4.0.0 Specification](https://xarf.org/spec/)
- [Generator Examples](../examples/snake-case-usage.ts)
- [API Reference](./API.md)
