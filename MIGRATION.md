# XARF v3 to v4 Migration Guide

## Overview

XARF v4 introduces a category-based architecture that improves upon the v3 format. This JavaScript library provides automatic backward compatibility, making migration seamless.

## Automatic Conversion

The library automatically detects and converts v3 reports to v4 format:

```typescript
import { XARFParser } from 'xarf';

const parser = new XARFParser();

// v3 report is automatically converted
const report = parser.parse(v3JsonData);
```

## What Changes

### Structure Changes

**v3 Format:**
```json
{
  "Version": "3",
  "ReporterInfo": {
    "ReporterOrg": "Security Team",
    "ReporterOrgEmail": "abuse@example.com"
  },
  "Report": {
    "ReportType": "Spam",
    "Date": "2024-01-15T10:00:00Z",
    "SourceIp": "192.0.2.1"
  }
}
```

**v4 Format (after conversion):**
```json
{
  "xarf_version": "4.0.0",
  "report_id": "auto-generated-uuid",
  "timestamp": "2024-01-15T10:00:00Z",
  "reporter": {
    "org": "Security Team",
    "contact": "abuse@example.com",
    "type": "manual"
  },
  "source_identifier": "192.0.2.1",
  "category": "messaging",
  "type": "spam",
  "evidence_source": "manual_analysis",
  "_internal": {
    "legacy_version": "3",
    "original_report_type": "Spam",
    "converted_at": "2024-01-15T10:05:00Z"
  }
}
```

### Field Mappings

| v3 Field | v4 Field | Notes |
|----------|----------|-------|
| `Version` | `xarf_version` | Set to "4.0.0" |
| N/A | `report_id` | Auto-generated UUID |
| `ReporterInfo.ReporterOrg` | `reporter.org` | Direct mapping |
| `ReporterInfo.ReporterOrgEmail` | `reporter.contact` | Direct mapping |
| N/A | `reporter.type` | Set to "manual" for v3 |
| `Report.Date` | `timestamp` | Direct mapping |
| `Report.SourceIp` or `Report.Source.IP` | `source_identifier` | Uses Source.IP if available |
| `Report.ReportType` | `category` + `type` | Mapped per table below |
| `Report.Attachment` or `Report.Samples` | `evidence` | Structure converted |
| N/A | `evidence_source` | Default: "manual_analysis" |

### Report Type Mappings

| v3 ReportType | v4 Category | v4 Type |
|---------------|-------------|---------|
| `Spam` | `messaging` | `spam` |
| `Login-Attack` | `connection` | `login_attack` |
| `Port-Scan` | `connection` | `port_scan` |
| `DDoS` | `connection` | `ddos` |
| `Phishing` | `content` | `phishing` |
| `Malware` | `content` | `malware` |
| `Botnet` | `infrastructure` | `botnet` |
| `Copyright` | `copyright` | `copyright` |

## Deprecation Warnings

When parsing v3 reports, you'll receive deprecation warnings:

```typescript
const parser = new XARFParser();
const report = parser.parse(v3Report);

const warnings = parser.getWarnings();
// [
//   "DEPRECATION WARNING: XARF v3 format detected. The v3 format has been automatically converted to v4. Please update your systems to generate v4 reports directly. v3 support will be removed in a future major version.",
//   ...conversion warnings...
// ]
```

## Migration Strategies

### Phase 1: Accept Both Formats

Use the library's automatic conversion:

```typescript
const parser = new XARFParser();

function processReport(jsonData: unknown) {
  const report = parser.parse(jsonData);

  if (report._internal?.legacy_version === '3') {
    console.log('Received v3 report - consider upgrading sender');
  }

  // Process as v4 report
  return handleV4Report(report);
}
```

### Phase 2: Monitor v3 Usage

Track v3 report usage to plan deprecation:

```typescript
function trackLegacyUsage(jsonData: unknown) {
  const parser = new XARFParser();
  const report = parser.parse(jsonData);

  if (report._internal?.legacy_version === '3') {
    metrics.increment('xarf.v3.reports');
    logDeprecationNotice(report.reporter.contact);
  }
}
```

### Phase 3: Generate v4 Reports

Update your report generators to produce v4 format:

```typescript
import { XARFGenerator } from 'xarf';

const generator = new XARFGenerator();

const report = generator.generateReport({
  category: 'messaging',
  reportType: 'spam',
  sourceIdentifier: '192.0.2.100',
  reporterContact: 'abuse@example.com',
  reporterOrg: 'Security Team',
  // ... additional fields
});
```

## Testing Migration

Test your v3 reports with the converter:

```typescript
import { convertV3toV4, isXARFv3 } from 'xarf';

describe('v3 Migration', () => {
  it('should convert our v3 reports', () => {
    const v3Report = loadLegacyReport();

    expect(isXARFv3(v3Report)).toBe(true);

    const warnings: string[] = [];
    const v4Report = convertV3toV4(v3Report, warnings);

    expect(v4Report.xarf_version).toBe('4.0.0');
    expect(v4Report.category).toBeDefined();
    expect(v4Report.type).toBeDefined();

    // Review any conversion warnings
    warnings.forEach(warning => console.log(warning));
  });
});
```

## Breaking Changes from v3

1. **Required Fields**: v4 requires `report_id` (UUID) - auto-generated during conversion
2. **Reporter Type**: v4 requires `reporter.type` - defaults to "manual" for v3 conversions
3. **Evidence Source**: v4 requires `evidence_source` - defaults to "manual_analysis" for v3
4. **Category System**: v3's single `ReportType` becomes `category` + `type` in v4
5. **Timestamp Format**: Both use ISO 8601, but v4 is more strict
6. **Evidence Structure**: v3's `Attachment`/`Samples` becomes structured `evidence` array

## Unsupported v3 Features

The following v3 fields have no direct v4 equivalent and are not preserved:

- `Disclosure` - not included in v4 core spec
- `ReporterInfo.ReporterContactName` - not in v4 core spec
- `ReporterInfo.ReporterContactPhone` - not in v4 core spec

If you need these fields, consider storing them in v4's `_internal` section:

```typescript
const v4Report = convertV3toV4(v3Report);
v4Report._internal = {
  ...v4Report._internal,
  v3_disclosure: v3Report.Disclosure,
  v3_contact_name: v3Report.ReporterInfo.ReporterContactName
};
```

## Getting Help

- Check the [XARF v4 Specification](https://xarf.org)
- Review [API Documentation](https://github.com/xarf/xarf-javascript)
- Open an [Issue](https://github.com/xarf/xarf-javascript/issues)

## Timeline

- **Phase 1 (Current)**: Full v3 support with automatic conversion
- **Phase 2 (6 months)**: v3 support maintained, deprecation warnings
- **Phase 3 (12 months)**: Advanced notice of v3 support removal
- **Phase 4 (18 months)**: v3 support removed in next major version
