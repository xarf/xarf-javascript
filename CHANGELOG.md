# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.0.0-alpha.1] - 2024-01-15

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
