# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-04-01

### Breaking Changes

- **Async `parse()`**: `parse()` now returns `Promise<ParseResult>` instead of `ParseResult`.
  All callers must `await` it.

  ```ts
  // Before
  const result = parse(json);
  // After
  const result = await parse(json);
  ```

- **Async `createEvidence()`**: `createEvidence()` now returns `Promise<XARFEvidence>`.
  All callers must `await` it.

  ```ts
  // Before
  const evidence = createEvidence('text/plain', payload);
  // After
  const evidence = await createEvidence('text/plain', payload);
  ```

- **`createEvidence()` payload type**: `Buffer` is no longer accepted; use `Uint8Array` instead.

  ```ts
  // Before
  createEvidence('application/octet-stream', buffer);
  // After
  createEvidence('application/octet-stream', new Uint8Array(buffer));
  ```

- **MD5 hash removed**: `hashAlgorithm: 'md5'` is no longer supported. The Web Crypto API
  intentionally excludes MD5 as insecure. Use `'sha256'` (default), `'sha512'`, or `'sha1'`.

- **Node.js minimum version raised to 19.0.0**: Required for `globalThis.crypto` (Web Crypto API).
  Node 18 reached EOL in April 2025.

### Added

- **Browser compatibility**: Library now works in all modern browsers without a bundler shim.
  No `fs`, `crypto`, or `Buffer` Node.js APIs are used at runtime.
- **Bundled schemas**: JSON schemas are committed to `src/schemas/` and statically imported.
  No network fetch occurs on `npm install`.
- **`src/crypto-utils.ts`**: New module providing UUID generation, hashing, and base64
  encode/decode via the standard Web Crypto API.
- **Runtime Web Crypto guard**: Clear error message if `globalThis.crypto` is unavailable
  (e.g., running on Node 16–18).

### Changed

- Schema loading no longer uses the filesystem at runtime; all 35 schemas are bundled.
- `postinstall` script removed from npm lifecycle; use `npm run fetch-schemas` to update
  schemas during development.

## [1.0.0] - 2025-11-30

### Breaking Changes

- **Category Correction**: Removed "other" category to align with XARF v4.0.0 specification
  - XARF spec defines exactly 7 categories (not 8)
  - Unknown v3 report types now map to `content` category with type `unclassified`
  - Migration: Replace any usage of `category: 'other'` with `category: 'content'`

### Added

- **Production Release**: Full production-quality v1.0.0 release
- **Complete Category Support**: All 7 XARF categories fully implemented and validated
  - messaging, connection, content, infrastructure, copyright, vulnerability, reputation
- **Security Enhancements**: Enhanced input validation and XSS prevention
- **Comprehensive Documentation**: Complete migration guides and security policies
- **CI/CD Improvements**: Enhanced GitHub Actions workflows with security scanning

### Changed

- **Version**: Updated from v1.0.0-alpha.2 to v1.0.0 (production release)
- **Category Validation**: Stricter validation for all 7 official categories
- **v3 Legacy Mapping**: Unknown v3 types now map to `content/unclassified` instead of `other/unclassified`
- **Documentation**: Updated all references from 8 to 7 categories

### Fixed

- **Specification Compliance**: Corrected category count to match XARF v4.0.0 specification exactly

## [1.0.0-alpha.2] - 2025-01-23

### Added

- **Backward Compatibility**: Full XARF v3 legacy format support
  - Automatic detection of v3 reports via `Version` field
  - Seamless conversion from v3 to v4 format
  - `isXARFv3()` function for format detection
  - `convertV3toV4()` function for manual conversion
  - Automatic UUID generation for converted reports
- **Deprecation Warnings**: Clear warnings when v3 format is detected
  - `getV3DeprecationWarning()` function returns deprecation message
  - `parser.getWarnings()` method to retrieve conversion warnings
  - Console warnings in non-strict mode
- **v3 Type Mapping**: Complete mapping of v3 report types to v4 categories
  - Spam → messaging/spam
  - Login-Attack → connection/login_attack
  - Port-Scan → connection/port_scan
  - DDoS → connection/ddos
  - Phishing → content/phishing
  - Malware → content/malware
  - Botnet → infrastructure/botnet
  - Copyright → copyright/copyright
- **Legacy Metadata**: Converted reports include top-level `legacy_version` field
- **Comprehensive Tests**: 20+ new tests for v3 compatibility (142 total tests)
- **Migration Guide**: Complete MIGRATION.md documentation
- **TypeScript Types**: Full type definitions for v3 format structures

### Changed

- Parser now automatically converts v3 reports to v4 before validation
- Validator accepts both v3 and v4 formats
- Enhanced error messages for missing source identifiers in v3 reports

### Documentation

- Updated README with v3 compatibility examples
- Added backward compatibility section with code samples
- Created comprehensive MIGRATION.md guide
- Updated package description to mention v3 support

## [1.0.0-alpha.1] - 2024-01-15

### Added

- Initial alpha release of XARF JavaScript/TypeScript library
- XARFParser for parsing and validating XARF v4.0.0 reports
- XARFGenerator for creating XARF-compliant reports
- XARFValidator for comprehensive validation with error/warning reporting
- Full TypeScript type definitions for all XARF structures
- Support for all 7 XARF categories:
  - Messaging (spam, phishing, social_engineering)
  - Connection (ddos, port_scan, login_attack, etc.)
  - Content (phishing_site, malware_distribution, defacement, etc.)
  - Infrastructure (botnet, compromised_server)
  - Copyright (infringement, dmca, trademark, etc.)
  - Vulnerability (cve, misconfiguration, open_service)
  - Reputation (blocklist, threat_intelligence)
- Support for `on_behalf_of` field for delegated reporting
- Evidence generation with automatic hashing (SHA256, SHA512, SHA1)
- Sample report generation for testing
- Comprehensive test suite with 80%+ coverage
- ESLint and Prettier configuration
- GitHub Actions workflows for CI/CD
- Complete documentation and examples

### Notes

- Alpha release with focus on messaging, connection, and content categories
- Additional categories have type definitions but limited validation
- Full category support and validation planned for beta release

[4.0.0-alpha.1]: https://github.com/xarf/xarf-javascript/releases/tag/v4.0.0-alpha.1
