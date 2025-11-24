# XARF JavaScript/TypeScript Library - Backwards Compatibility Guide

**Library Version**: 1.0.0-alpha.1+
**XARF Specification**: v4.0.0
**Last Updated**: 2025-01-23

## Overview

The XARF JavaScript/TypeScript library implements the XARF v4 specification with full backwards compatibility for XARF v3 reports. This guide covers compatibility strategy, TypeScript migration, and upgrade paths.

## Field Name Changes: `class` → `category`

### The Change

| Version | Field Name | JavaScript Access | TypeScript Type | Status |
|---------|------------|-------------------|-----------------|--------|
| **v3** | `class` | `report.class` or `report["class"]` | Awkward | ❌ Deprecated |
| **v4** | `category` | `report.category` | Clean | ✅ Current |

### Why This Matters

- **Reserved Word**: `class` is a reserved keyword in JavaScript (ES6+)
- **Property Access**: Requires bracket notation `report["class"]`
- **TypeScript Confusion**: Type definitions conflict with keyword
- **Better Semantics**: "category" describes abuse classification

## Compatibility Strategy

### Parsing Behavior

```typescript
import { XARFParser } from 'xarf';

const parser = new XARFParser();

// ✅ v4 format (recommended)
const v4Report = parser.parse({
  category: "messaging",  // Clean property access
  type: "spam"
});

// ✅ v3 format (backwards compatibility)
const v3Report = parser.parse({
  class: "messaging",     // Auto-converted to category
  type: "spam"
});

// Both work identically
console.log(v4Report.category);  // "messaging"
console.log(v3Report.category);  // "messaging" (auto-converted)
```

### Generation Behavior

```typescript
import { XARFGenerator } from 'xarf';

const generator = new XARFGenerator();

const report = generator.generateReport({
  category: 'messaging',        // v4 parameter
  reportType: 'spam',
  sourceIdentifier: '192.0.2.1',
  reporterContact: 'abuse@example.com',
  reporterOrg: 'Security Team'
});

// Output uses "category" field only
console.log(JSON.stringify(report));
// {"category": "messaging", ...}
```

## TypeScript Migration

### Type Definitions

#### Before (Pre-v1.0.0)

```typescript
// Awkward interface with reserved keyword
interface XARFReport {
  class: string;  // ❌ Conflicts with keyword
  type: string;
}

// Required bracket notation
const reportClass = report["class"];  // ❌ Awkward
```

#### After (v1.0.0+)

```typescript
// Clean interface
interface XARFReport {
  category: string;  // ✅ No keyword conflict
  type: string;
}

// Clean property access
const category = report.category;  // ✅ Clean
```

### Backwards Compatible Types

```typescript
// Full type definition with compatibility
interface XARFReport {
  xarf_version: string;
  report_id: string;
  timestamp: string;
  reporter: Reporter;
  source_identifier: string;
  category: string;           // v4 standard
  type: string;
  evidence_source?: string;

  /** @deprecated Use category instead */
  class?: string;             // v3 compatibility
}

// Usage
const report: XARFReport = {
  category: "messaging",
  // class is optional for compatibility
};
```

## Migration Guide

### Step 1: Update Dependencies

```bash
# Using npm
npm install xarf@latest

# Using yarn
yarn add xarf@latest

# Using pnpm
pnpm add xarf@latest
```

### Step 2: Update TypeScript Code

#### Object Creation

```typescript
// Before
const report = {
  class: "connection",  // ❌ Old field
  type: "ddos"
};

// After
const report = {
  category: "connection",  // ✅ New field
  type: "ddos"
};
```

#### Property Access

```typescript
// Before
const reportClass = report["class"];  // ❌ Bracket notation required
if (report["class"] === "messaging") {
  // ...
}

// After
const category = report.category;     // ✅ Dot notation works
if (report.category === "messaging") {
  // ...
}
```

#### Type Annotations

```typescript
// Before
interface ProcessOptions {
  reportClass: string;  // ❌ Old parameter name
  reportType: string;
}

function process(options: ProcessOptions) {
  if (options.reportClass === "messaging") {
    // ...
  }
}

// After
interface ProcessOptions {
  category: string;     // ✅ New parameter name
  reportType: string;
}

function process(options: ProcessOptions) {
  if (options.category === "messaging") {
    // ...
  }
}
```

### Step 3: Update Tests

```typescript
// Before
describe('XARF Report', () => {
  it('should have correct class', () => {
    expect(report["class"]).toBe("content");
  });
});

// After
describe('XARF Report', () => {
  it('should have correct category', () => {
    expect(report.category).toBe("content");
  });
});
```

## Backwards Compatibility Features

### Auto-Detection and Conversion

```typescript
import { XARFParser } from 'xarf';

const parser = new XARFParser();

// Legacy v3 format
const v3Json = `{
  "Version": "4.0.0",
  "ReporterInfo": {
    "ReporterOrg": "Security Team",
    "ReporterOrgEmail": "abuse@example.com"
  },
  "Report": {
    "ReportClass": "Activity",
    "ReportType": "Spam",
    "SourceIp": "192.0.2.1"
  }
}`;

// Auto-converts to v4 format
const report = parser.parse(JSON.parse(v3Json));

console.log(report.category);  // "messaging" (auto-mapped)
console.log(report.type);      // "spam" (normalized)
```

### Compatibility Wrapper (Proxy Pattern)

```typescript
/**
 * Create a backwards-compatible report that supports both
 * "class" and "category" property access
 */
function createCompatibleReport(report: XARFReport): XARFReport {
  return new Proxy(report, {
    get(target, prop) {
      if (prop === 'class') {
        console.warn(
          'Accessing deprecated "class" property. Use "category" instead.'
        );
        return target.category;
      }
      return target[prop as keyof XARFReport];
    },
    set(target, prop, value) {
      if (prop === 'class') {
        console.warn(
          'Setting deprecated "class" property. Use "category" instead.'
        );
        target.category = value;
        return true;
      }
      (target as any)[prop] = value;
      return true;
    }
  });
}

// Usage
const report = createCompatibleReport({
  category: "messaging",
  // ... other fields
});

// Both work
console.log(report.category);  // "messaging"
console.log(report.class);     // "messaging" (with warning)
```

## Common Migration Issues

### Issue 1: ESLint Errors with Reserved Keywords

**Problem**: ESLint complains about `class` property

```typescript
// ❌ ESLint error: Unexpected reserved word 'class'
const report = { class: "messaging" };
```

**Solution**: Use `category` instead

```typescript
// ✅ No ESLint error
const report = { category: "messaging" };
```

### Issue 2: JSON Serialization

**Problem**: Need to send both fields for legacy compatibility

**Solution**: Custom JSON serialization

```typescript
function serializeForLegacy(report: XARFReport): string {
  const legacyReport = {
    ...report,
    class: report.category  // Add "class" for legacy systems
  };
  return JSON.stringify(legacyReport);
}

// Usage
const json = serializeForLegacy(report);
sendToLegacyAPI(json);
```

### Issue 3: TypeScript Strict Mode

**Problem**: Strict null checks fail with optional `class` property

**Solution**: Use type guards

```typescript
function isLegacyReport(report: any): report is { class: string } {
  return 'class' in report && !('category' in report);
}

function parseFlexible(data: any): XARFReport {
  if (isLegacyReport(data)) {
    // Convert legacy format
    return {
      ...data,
      category: data.class
    };
  }
  return data;
}
```

## React/Vue/Angular Integration

### React Example

```typescript
import React from 'react';
import { XARFReport } from 'xarf';

interface ReportCardProps {
  report: XARFReport;
}

const ReportCard: React.FC<ReportCardProps> = ({ report }) => {
  return (
    <div className="report-card">
      {/* ✅ Clean property access */}
      <h3>Category: {report.category}</h3>
      <p>Type: {report.type}</p>
      <p>Source: {report.source_identifier}</p>
    </div>
  );
};
```

### Vue 3 Example

```vue
<template>
  <div class="report-card">
    <!-- ✅ Clean template syntax -->
    <h3>Category: {{ report.category }}</h3>
    <p>Type: {{ report.type }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { XARFReport } from 'xarf';

const props = defineProps<{
  report: XARFReport
}>();
</script>
```

### Angular Example

```typescript
import { Component, Input } from '@angular/core';
import { XARFReport } from 'xarf';

@Component({
  selector: 'app-report-card',
  template: `
    <div class="report-card">
      <!-- ✅ Clean template binding -->
      <h3>Category: {{ report.category }}</h3>
      <p>Type: {{ report.type }}</p>
    </div>
  `
})
export class ReportCardComponent {
  @Input() report!: XARFReport;
}
```

## Node.js vs Browser Compatibility

### Both Environments Supported

```typescript
// Node.js
import { XARFParser } from 'xarf';

// Browser (ES Modules)
import { XARFParser } from 'xarf';

// Browser (CommonJS via bundler)
const { XARFParser } = require('xarf');

// Browser (UMD via CDN)
// <script src="https://unpkg.com/xarf"></script>
const { XARFParser } = window.XARF;
```

## Version Compatibility Matrix

| JS Library | XARF Spec | v3 Support | v4 Support | TypeScript | Notes |
|------------|-----------|------------|------------|------------|-------|
| 0.x.x | v3 | ✅ Native | ❌ None | ✅ Full | Deprecated |
| 1.0.0-alpha.1 | v4 | ✅ Auto-convert | ✅ Full | ✅ Full | Current |
| 1.0.0 | v4 | ✅ Auto-convert | ✅ Full | ✅ Full | Planned Q2 2024 |
| 2.0.0 | v4 | ⚠️ Optional | ✅ Full | ✅ Full | Planned 2025 |

## Category Support Status

| Category | Status | Types Supported |
|----------|--------|-----------------|
| **messaging** | ✅ Full | spam, phishing, social_engineering, bulk_messaging |
| **connection** | ✅ Full | ddos, port_scan, login_attack, and 7 more |
| **content** | ✅ Full | phishing_site, malware_distribution, defacement, and 20+ more |
| **infrastructure** | ✅ Full | botnet, compromised_server |
| **copyright** | ✅ Full | infringement, dmca, trademark, p2p, and 2 more |
| **vulnerability** | ✅ Full | cve, misconfiguration, open_service |
| **reputation** | ✅ Full | blocklist, threat_intelligence |
| **other** | ✅ Full | unclassified |

## Testing Compatibility

### Jest Example

```typescript
import { XARFParser } from 'xarf';

describe('XARF Compatibility', () => {
  const parser = new XARFParser();

  test('parses v4 reports', () => {
    const report = parser.parse({
      category: 'messaging',
      type: 'spam',
      // ... other required fields
    });

    expect(report.category).toBe('messaging');
  });

  test('parses v3 reports with auto-conversion', () => {
    const report = parser.parse({
      class: 'messaging',  // v3 field
      type: 'spam',
      // ... other fields
    });

    expect(report.category).toBe('messaging');
  });

  test('handles both fields with category precedence', () => {
    const report = parser.parse({
      category: 'connection',
      class: 'messaging',  // Ignored
      type: 'ddos',
    });

    expect(report.category).toBe('connection');  // "category" wins
  });
});
```

## Best Practices

### For New Projects

1. ✅ Use `category` field exclusively
2. ✅ Enable TypeScript strict mode
3. ✅ Use dot notation for property access
4. ✅ Leverage TypeScript types
5. ✅ Test with v4 schema validation

### For Existing Projects

1. ✅ Update dependencies to latest version
2. ✅ Run code search for `["class"]` and replace
3. ✅ Update TypeScript interfaces
4. ✅ Add tests for v3 compatibility
5. ✅ Update documentation

### For Library Authors

1. ✅ Provide backwards-compatible types
2. ✅ Emit console warnings for deprecated usage
3. ✅ Include migration guide
4. ✅ Support both CommonJS and ESM

## Deprecation Timeline

| Date | Version | Action |
|------|---------|--------|
| **2024-01-15** | 1.0.0-alpha.1 | `class` marked deprecated in types |
| **Q2 2024** | 1.0.0 | Console warnings for `class` usage |
| **Q4 2024** | 1.5.0 | v3 auto-convert optional |
| **2025-Q2** | 2.0.0 | Breaking: Remove `class` support |

## Getting Help

### Resources

- **GitHub Repository**: https://github.com/xarf/xarf-javascript
- **NPM Package**: https://www.npmjs.com/package/xarf
- **TypeScript Docs**: https://xarf.org/docs/typescript/
- **XARF Specification**: https://xarf.org/docs/specification/
- **Issue Tracker**: https://github.com/xarf/xarf-javascript/issues

### Support Channels

- GitHub Issues for bugs
- GitHub Discussions for questions
- Stack Overflow: Tag `xarf`
- Email: contact@xarf.org

## Related Documentation

- [README.md](../README.md) - Library overview
- [API.md](API.md) - Complete API reference
- [CHANGELOG.md](../CHANGELOG.md) - Version history
- [MIGRATION.md](MIGRATION.md) - Step-by-step migration

---

**Status**: Alpha Release
**Stability**: Stable API
**Compatibility**: XARF v3 + v4 + TypeScript 4.5+
