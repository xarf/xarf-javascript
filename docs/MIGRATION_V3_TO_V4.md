# XARF v3 to v4 Migration Guide

## Overview

XARF v4 introduces a category-based architecture that improves upon the v3 format. This JavaScript library provides automatic backward compatibility, making migration seamless.

## Automatic Conversion

The library automatically detects and converts v3 reports to v4 format:

```typescript
import { parse } from '@xarf/xarf';

// v3 report is automatically detected and converted
const { report, warnings } = parse(v3JsonData);
// warnings includes:
//   "DEPRECATION WARNING: XARF v3 format detected. The v3 format has been
//    automatically converted to v4. Please update your systems to generate
//    v4 reports directly. v3 support will be removed in a future major version."
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
  "xarf_version": "4.2.0",
  "report_id": "auto-generated-uuid",
  "timestamp": "2024-01-15T10:00:00Z",
  "reporter": {
    "org": "Security Team",
    "contact": "abuse@example.com",
    "domain": "example.com"
  },
  "sender": {
    "org": "Security Team",
    "contact": "abuse@example.com",
    "domain": "example.com"
  },
  "source_identifier": "192.0.2.1",
  "category": "messaging",
  "type": "spam",
  "legacy_version": "3",
  "_internal": {
    "original_report_type": "Spam",
    "converted_at": "2024-01-15T10:05:00Z"
  }
}
```

### Field Mappings

| v3 Field                                | v4 Field            | Notes                                             |
| --------------------------------------- | ------------------- | ------------------------------------------------- |
| `Version`                               | `xarf_version`      | Set to "4.2.0"                                    |
| N/A                                     | `report_id`         | Auto-generated UUID                               |
| `ReporterInfo.ReporterOrg`              | `reporter.org`      | Direct mapping                                    |
| `ReporterInfo.ReporterOrgEmail`         | `reporter.contact`  | Direct mapping                                    |
| `ReporterInfo.ReporterOrgEmail`         | `reporter.domain`   | Extracted from email domain part                  |
| N/A                                     | `sender`            | Set to same values as `reporter`                  |
| `Report.Date`                           | `timestamp`         | Direct mapping                                    |
| `Report.SourceIp` or `Report.Source.IP` | `source_identifier` | Priority: Source.IP > SourceIp > Source.URL > Url |
| `Report.ReportType`                     | `category` + `type` | Mapped per table below                            |
| `Report.Attachment` or `Report.Samples` | `evidence`          | Structure converted, hash and size added          |
| `Report.AdditionalInfo.DetectionMethod` | `evidence_source`   | Only set if explicitly provided in v3             |

### Report Type Mappings

| v3 ReportType  | v4 Category      | v4 Type        |
| -------------- | ---------------- | -------------- |
| `Spam`         | `messaging`      | `spam`         |
| `Login-Attack` | `connection`     | `login_attack` |
| `Port-Scan`    | `connection`     | `port_scan`    |
| `DDoS`         | `connection`     | `ddos`         |
| `Phishing`     | `content`        | `phishing`     |
| `Malware`      | `content`        | `malware`      |
| `Botnet`       | `infrastructure` | `botnet`       |
| `Copyright`    | `copyright`      | `copyright`    |

**Note**: Unknown v3 report types are not silently converted — they cause a parse error listing the supported types. Only the 8 types above are supported.

## Deprecation Warnings

When parsing v3 reports, you'll receive deprecation warnings:

```typescript
import { parse } from '@xarf/xarf';

const { report, warnings } = parse(v3Report);
// warnings includes:
// [
//   "DEPRECATION WARNING: XARF v3 format detected. The v3 format has been automatically converted to v4. Please update your systems to generate v4 reports directly. v3 support will be removed in a future major version.",
//   ...conversion warnings...
// ]
```

## Migration Strategies

### Phase 1: Accept Both Formats

Use the library's automatic conversion:

```typescript
import { parse } from '@xarf/xarf';

function processReport(jsonData: string | Record<string, unknown>) {
  const { report } = parse(jsonData);

  if (report.legacy_version === '3') {
    console.log('Received v3 report - consider upgrading sender');
  }

  // Process as v4 report
  return handleV4Report(report);
}
```

### Phase 2: Monitor v3 Usage

Track v3 report usage to plan deprecation:

```typescript
import { parse } from '@xarf/xarf';

function trackLegacyUsage(jsonData: string | Record<string, unknown>) {
  const { report } = parse(jsonData);

  if (report.legacy_version === '3') {
    metrics.increment('xarf.v3.reports');
    logDeprecationNotice(report.reporter.contact);
  }
}
```

### Phase 3: Generate v4 Reports

Update your report generators to produce v4 format:

```typescript
import { createReport } from '@xarf/xarf';

const { report } = createReport({
  category: 'messaging',
  type: 'spam',
  source_identifier: '192.0.2.100',
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
  // ... additional fields
});
```

## Breaking Changes from v3

1. **Required Fields**: v4 requires `report_id` (UUID) - auto-generated during conversion
2. **Reporter Domain**: v4 requires `reporter.domain` - extracted from the reporter email address
3. **Sender Field**: v4 requires a `sender` object - set to the same values as `reporter` during conversion
4. **Category System**: v3's single `ReportType` becomes `category` + `type` in v4
5. **Timestamp Format**: Both use ISO 8601, but v4 is more strict
6. **Evidence Structure**: v3's `Attachment`/`Samples` becomes structured `evidence` array with computed `hash` (SHA256) and `size` fields
7. **Evidence Source**: v4's `evidence_source` is only set if `AdditionalInfo.DetectionMethod` is present in the v3 report — it is not defaulted

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
  v3_contact_name: v3Report.ReporterInfo.ReporterContactName,
};
```

## Getting Help

- Check the [XARF v4 Specification](https://xarf.org)
- Review [API Documentation](https://github.com/xarf/xarf-javascript)
- Open an [Issue](https://github.com/xarf/xarf-javascript/issues)
