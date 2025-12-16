# xarf-javascript TODO

## High Priority

### JSON Schema Validation (Not Implemented)
**Issue:** The library does NOT use the official XARF JSON schemas for validation.

**Current State:**
- Official JSON schemas exist in `../xarf-spec/schemas/v4/`
- Master schema: `xarf-v4-master.json`
- The library uses hand-coded validation in `src/validator.ts`
- No `ajv` integration despite schemas being available

**Risk:**
- Validation logic can drift from official specification
- Changes to spec require manual updates to validator
- No guarantee of spec compliance

**Recommended Fix:**
1. Install `ajv` and `ajv-formats` (already installed as of 2025-12-16)
2. Copy schema files into `src/schemas/`
3. Rewrite `XARFValidator` to use `ajv` with official schemas
4. Keep hand-coded validator as fallback for better error messages
5. Add tests comparing both validation approaches

**Timeline:** Should be addressed before v2.0.0 release

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
