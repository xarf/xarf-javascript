# xarf-javascript TODO

## High Priority

### JSON Schema Validation - Production Ready
**Status:** Core schema validation ✅ PRODUCTION READY | Type-specific validation ⚠️ KNOWN LIMITATION

**What Works:**
- ✅ Core schema validation (`SchemaValidator.validateCore()`)
- ✅ All 207 tests passing (46 schema-specific tests)
- ✅ Format validation (email, UUID, ISO dates, hostnames)
- ✅ Range validation (confidence 0-1, ports 1-65535)
- ✅ maxLength, maxItems, additionalProperties enforcement
- ✅ Comprehensive error messages from AJV
- ✅ Performance: 100 reports validated in <1 second
- ✅ Backward compatibility with hand-coded validator
- ✅ Schema catches errors hand-coded validator misses
- ✅ All 32 type-specific schemas loaded and available
- ✅ Master schema compiles successfully
- ✅ Schema infrastructure fully implemented

**Known Limitation:**
- ⚠️ Type-specific required fields not enforced by master schema validation
- This is due to a design flaw in the XARF spec's master schema structure
- The master schema uses `anyOf` with `if/then` which has a logical issue:
  - When `if` condition doesn't match, validation succeeds (then is not applied)
  - With `anyOf`, if ANY branch succeeds, the whole anyOf succeeds
  - Result: Reports always pass even when missing type-specific required fields

**Recommended Fix (for XARF spec team):**
Restructure master schema from:
```json
{ "anyOf": [
    { "if": { ... }, "then": { "$ref": "types/..." } }
  ]}
```

To:
```json
{ "oneOf": [
    { "allOf": [
        { "properties": { "category": ..., "type": ... } },
        { "$ref": "types/..." }
      ]}
  ]}
```

**Current Recommendation:**
- Use `SchemaValidator.validateCore()` for production validation
- Core schema provides excellent coverage of XARF v4.0.0 spec
- Type-specific validation requires hand-coded validator or spec master schema fix

## Completed

### snake_case vs camelCase API (Fixed 2025-12-16)
- ✅ Generator now accepts both `type` and `reportType`
- ✅ Generator now accepts both `source_identifier` and `sourceIdentifier`
- ✅ Generator now accepts both `evidence_source` and `evidenceSource`
- ✅ Generator now accepts both `on_behalf_of` and `onBehalfOf`
- ✅ Generated reports use snake_case as per XARF spec
- ✅ README updated to show snake_case examples (preferred)
- ✅ API documentation clearly marks camelCase as deprecated
- ✅ Backward compatibility maintained

## Low Priority

- Add more comprehensive examples for all 7 categories
- Performance benchmarks
- Streaming parser for large reports
