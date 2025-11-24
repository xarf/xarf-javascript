# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- **Field Naming**: Updated XARF v3 legacy support to use `ReportCategory` instead of `ReportClass` in type definitions
  - This aligns with XARF v4 specification which uses `category` instead of `class`
  - Improves JavaScript/TypeScript compatibility by avoiding reserved keyword `class`
  - No breaking changes - existing code continues to work

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
- **Legacy Metadata**: Converted reports include `_internal.legacy_version` field
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
- Support for all 8 XARF categories:
  - Messaging (spam, phishing, social_engineering)
  - Connection (ddos, port_scan, login_attack, etc.)
  - Content (phishing_site, malware_distribution, defacement, etc.)
  - Infrastructure (botnet, compromised_server)
  - Copyright (infringement, dmca, trademark, etc.)
  - Vulnerability (cve, misconfiguration, open_service)
  - Reputation (blocklist, threat_intelligence)
  - Other (unclassified)
- Support for `on_behalf_of` field for delegated reporting
- Evidence generation with automatic hashing (SHA256, SHA512, SHA1, MD5)
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
