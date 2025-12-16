# JSON Schema Examples Validation Issues

## Summary
**93.7% of examples in xarf-spec JSON schemas fail validation** against XARF v4.0.0 specification.

**Validation Results**:
- Total examples tested: 32
- Passed: 2 (6.3%) - Only our library's README examples
- Failed: 30 (93.7%) - All xarf-spec schema examples

## Critical Issues

All 30 examples in `xarf-spec/schemas/v4/types/*.json` are missing required v4.0.0 fields:

### 1. Missing `sender` Field (ALL 30 examples)
**XARF v4.0.0 Spec**: `sender` is a required field
```json
// ❌ WRONG (all current examples)
{
  "xarf_version": "4.0.0",
  "reporter": { ... }
  // Missing sender field!
}

// ✅ CORRECT
{
  "xarf_version": "4.0.0",
  "reporter": {
    "org": "Example Security",
    "contact": "abuse@example.com",
    "domain": "example.com"
  },
  "sender": {
    "org": "Example Security",
    "contact": "abuse@example.com",
    "domain": "example.com"
  }
}
```

### 2. Incomplete `reporter` Object (ALL 30 examples)
**Issue**: Missing required `domain` field, contains invalid `type` field

```json
// ❌ WRONG
"reporter": {
  "org": "DDoS Protection Service",
  "contact": "ddos@protectionservice.net",
  "type": "automated"  // Wrong - 'type' is not a ContactInfo field
}

// ✅ CORRECT
"reporter": {
  "org": "DDoS Protection Service",
  "contact": "ddos@protectionservice.net",
  "domain": "protectionservice.net"
}
```

### 3. Invalid `report_id` Format (ALL 30 examples)
**Issue**: Examples use non-UUID strings

```json
// ❌ WRONG
"report_id": "ddos-789a0123-b456-78c9-d012-345678901234"  // Not valid UUID format

// ✅ CORRECT
"report_id": "789a0123-b456-48c9-a012-345678901234"  // Valid UUID v4
```

### 4. Missing `evidence_source` (Many examples)
**Issue**: Required field not present in several examples

## Affected Files

All type-specific schema files in `xarf-spec/schemas/v4/types/`:
- connection-ddos.json ❌
- connection-infected-host.json ❌
- connection-reconnaissance.json ❌
- connection-scraping.json ❌
- connection-sql-injection.json ❌
- connection-vulnerability-scan.json ❌
- content-brand_infringement.json ❌
- content-csam.json ❌
- content-csem.json ❌
- content-exposed-data.json ❌
- content-fraud.json ❌
- content-malware.json ❌
- content-phishing.json ❌
- content-remote_compromise.json ❌
- content-suspicious_registration.json ❌
- copyright-copyright.json ❌
- copyright-cyberlocker.json ❌
- copyright-link-site.json ❌
- copyright-p2p.json ❌
- copyright-ugc-platform.json ❌
- copyright-usenet.json ❌
- infrastructure-botnet.json ❌
- infrastructure-compromised-server.json ❌
- messaging-bulk-messaging.json ❌
- messaging-spam.json ❌
- reputation-blocklist.json ❌
- reputation-threat-intelligence.json ❌
- vulnerability-cve.json ❌
- vulnerability-misconfiguration.json ❌
- vulnerability-open-service.json ❌

## Impact

1. **Users copying spec examples will create invalid reports**
2. **Validators implementing against these examples will be incorrect**
3. **Spec compliance cannot be verified** using the spec's own examples

## Recommended Fix

Update all examples in xarf-spec to include:
1. Required `sender` field (matching ContactInfo structure)
2. Complete `reporter` object with `domain` field (remove invalid `type` field)
3. Valid UUID format for `report_id`
4. Required `evidence_source` field

## Testing

Validation performed using:
- xarf-javascript v1.0.0 (implements XARF v4.0.0 spec)
- AJV JSON Schema validator
- Official xarf-spec JSON schemas

Test script available at: `validate-all-examples.js`

Run with: `node validate-all-examples.js`
