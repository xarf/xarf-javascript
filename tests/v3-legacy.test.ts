/**
 * XARF v3 Legacy Support Tests
 *
 * Tests for v3 to v4 conversion and backward compatibility
 */

import { XARFParser } from '../src/parser';
import { isXARFv3, convertV3toV4, getV3DeprecationWarning } from '../src/v3-legacy';
import type { XARFv3Report } from '../src/v3-legacy';

describe('XARFv3 Detection', () => {
  it('should detect v3 report format', () => {
    const v3Report = {
      Version: '3',
      ReporterInfo: {
        ReporterOrg: 'Test Org',
        ReporterOrgEmail: 'test@example.com',
      },
      Report: {
        ReportType: 'Spam',
        Date: '2024-01-15T10:00:00Z',
      },
    };

    expect(isXARFv3(v3Report)).toBe(true);
  });

  it('should detect v3.0 report format', () => {
    const v3Report = {
      Version: '3.0',
      ReporterInfo: {
        ReporterOrgEmail: 'test@example.com',
      },
      Report: {
        ReportType: 'DDoS',
        Date: '2024-01-15T10:00:00Z',
      },
    };

    expect(isXARFv3(v3Report)).toBe(true);
  });

  it('should not detect v4 report as v3', () => {
    const v4Report = {
      xarf_version: '4.0.0',
      report_id: 'test-id',
      timestamp: '2024-01-15T10:00:00Z',
      reporter: { contact: 'test@example.com', type: 'manual' },
      source_identifier: '192.0.2.1',
      category: 'messaging',
      type: 'spam',
      evidence_source: 'spamtrap',
    };

    expect(isXARFv3(v4Report)).toBe(false);
  });

  it('should not detect invalid object as v3', () => {
    expect(isXARFv3({})).toBe(false);
    expect(isXARFv3({ Version: '4.0.0' })).toBe(false);
    expect(isXARFv3({ Version: '3' })).toBe(false); // Missing Report
  });
});

describe('XARFv3 Conversion', () => {
  describe('Spam Report Conversion', () => {
    it('should convert v3 spam report to v4 messaging report', () => {
      const v3Report: XARFv3Report = {
        Version: '3',
        ReporterInfo: {
          ReporterOrg: 'Anti-Spam Service',
          ReporterOrgEmail: 'abuse@antispam.example',
        },
        Report: {
          ReportType: 'Spam',
          Date: '2024-01-15T14:30:25Z',
          SourceIp: '192.168.1.100',
          Protocol: 'smtp',
          SmtpMailFromAddress: 'spammer@evil.example',
          SmtpMessageSubject: 'Buy now!',
          AttackDescription: 'Spam email detected',
        },
      };

      const warnings: string[] = [];
      const v4Report = convertV3toV4(v3Report, warnings);

      expect(v4Report.xarf_version).toBe('4.0.0');
      expect(v4Report.category).toBe('messaging');
      expect(v4Report.type).toBe('spam');
      expect(v4Report.source_identifier).toBe('192.168.1.100');
      expect(v4Report.reporter.org).toBe('Anti-Spam Service');
      expect(v4Report.reporter.contact).toBe('abuse@antispam.example');
      expect(v4Report.reporter.type).toBe('manual');
      expect(v4Report.timestamp).toBe('2024-01-15T14:30:25Z');
      expect(v4Report.description).toBe('Spam email detected');
      expect(v4Report._internal?.legacy_version).toBe('3');
      expect(v4Report._internal?.original_report_type).toBe('Spam');

      // Category-specific fields
      expect((v4Report as any).protocol).toBe('smtp');
      expect((v4Report as any).smtp_from).toBe('spammer@evil.example');
      expect((v4Report as any).subject).toBe('Buy now!');
    });

    it('should handle v3 spam with Source object', () => {
      const v3Report: XARFv3Report = {
        Version: '3',
        ReporterInfo: {
          ReporterOrgEmail: 'abuse@example.com',
        },
        Report: {
          ReportType: 'spam',
          Date: '2024-01-15T10:00:00Z',
          Source: {
            IP: '10.0.0.1',
            Port: 25,
          },
        },
      };

      const v4Report = convertV3toV4(v3Report);
      expect(v4Report.source_identifier).toBe('10.0.0.1');
      expect((v4Report as any).source_port).toBe(25);
    });
  });

  describe('Connection Report Conversion', () => {
    it('should convert v3 DDoS report to v4 connection report', () => {
      const v3Report: XARFv3Report = {
        Version: '3',
        ReporterInfo: {
          ReporterOrg: 'DDoS Protection',
          ReporterOrgEmail: 'ddos@example.com',
        },
        Report: {
          ReportType: 'DDoS',
          Date: '2024-01-15T15:00:00Z',
          SourceIp: '203.0.113.50',
          DestinationIp: '198.51.100.10',
          DestinationPort: 80,
          Protocol: 'tcp',
          AttackCount: 10000,
        },
      };

      const v4Report = convertV3toV4(v3Report);

      expect(v4Report.category).toBe('connection');
      expect(v4Report.type).toBe('ddos');
      expect(v4Report.source_identifier).toBe('203.0.113.50');
      expect((v4Report as any).destination_ip).toBe('198.51.100.10');
      expect((v4Report as any).destination_port).toBe(80);
      expect((v4Report as any).protocol).toBe('tcp');
      expect((v4Report as any).attempt_count).toBe(10000);
    });

    it('should convert v3 Login-Attack report', () => {
      const v3Report: XARFv3Report = {
        Version: '3',
        ReporterInfo: {
          ReporterOrgEmail: 'security@example.com',
        },
        Report: {
          ReportType: 'Login-Attack',
          Date: '2024-01-15T12:00:00Z',
          SourceIp: '192.0.2.50',
          DestinationIp: '203.0.113.10',
          DestinationPort: 22,
        },
      };

      const v4Report = convertV3toV4(v3Report);
      expect(v4Report.category).toBe('connection');
      expect(v4Report.type).toBe('login_attack');
    });

    it('should convert v3 Port-Scan report', () => {
      const v3Report: XARFv3Report = {
        Version: '3',
        ReporterInfo: {
          ReporterOrgEmail: 'security@example.com',
        },
        Report: {
          ReportType: 'Port-Scan',
          Date: '2024-01-15T12:00:00Z',
          SourceIp: '192.0.2.99',
        },
      };

      const v4Report = convertV3toV4(v3Report);
      expect(v4Report.category).toBe('connection');
      expect(v4Report.type).toBe('port_scan');
    });
  });

  describe('Content Report Conversion', () => {
    it('should convert v3 Phishing report to v4 content report', () => {
      const v3Report: XARFv3Report = {
        Version: '3',
        ReporterInfo: {
          ReporterOrgEmail: 'phishing@example.com',
        },
        Report: {
          ReportType: 'Phishing',
          Date: '2024-01-15T10:00:00Z',
          SourceIp: '192.0.2.100',
          Url: 'http://evil-phishing.example',
        },
      };

      const v4Report = convertV3toV4(v3Report);
      expect(v4Report.category).toBe('content');
      expect(v4Report.type).toBe('phishing');
      expect((v4Report as any).url).toBe('http://evil-phishing.example');
    });

    it('should convert v3 Malware report', () => {
      const v3Report: XARFv3Report = {
        Version: '3',
        ReporterInfo: {
          ReporterOrgEmail: 'malware@example.com',
        },
        Report: {
          ReportType: 'Malware',
          Date: '2024-01-15T10:00:00Z',
          SourceIp: '192.0.2.150',
          Url: 'http://malware-site.example',
        },
      };

      const v4Report = convertV3toV4(v3Report);
      expect(v4Report.category).toBe('content');
      expect(v4Report.type).toBe('malware');
    });
  });

  describe('Other Categories', () => {
    it('should convert v3 Botnet report', () => {
      const v3Report: XARFv3Report = {
        Version: '3',
        ReporterInfo: {
          ReporterOrgEmail: 'botnet@example.com',
        },
        Report: {
          ReportType: 'Botnet',
          Date: '2024-01-15T10:00:00Z',
          SourceIp: '192.0.2.200',
        },
      };

      const v4Report = convertV3toV4(v3Report);
      expect(v4Report.category).toBe('infrastructure');
      expect(v4Report.type).toBe('botnet');
    });

    it('should convert v3 Copyright report', () => {
      const v3Report: XARFv3Report = {
        Version: '3',
        ReporterInfo: {
          ReporterOrgEmail: 'dmca@example.com',
        },
        Report: {
          ReportType: 'Copyright',
          Date: '2024-01-15T10:00:00Z',
          SourceIp: '192.0.2.250',
        },
      };

      const v4Report = convertV3toV4(v3Report);
      expect(v4Report.category).toBe('copyright');
      expect(v4Report.type).toBe('copyright');
    });
  });

  describe('Evidence Conversion', () => {
    it('should convert v3 Attachment to v4 evidence', () => {
      const v3Report: XARFv3Report = {
        Version: '3',
        ReporterInfo: {
          ReporterOrgEmail: 'test@example.com',
        },
        Report: {
          ReportType: 'Spam',
          Date: '2024-01-15T10:00:00Z',
          SourceIp: '192.0.2.1',
          Attachment: [
            {
              ContentType: 'message/rfc822',
              Data: 'base64encodeddata',
              Description: 'Original email',
            },
          ],
        },
      };

      const v4Report = convertV3toV4(v3Report);
      expect(v4Report.evidence).toBeDefined();
      expect(v4Report.evidence?.length).toBe(1);
      expect(v4Report.evidence?.[0].content_type).toBe('message/rfc822');
      expect(v4Report.evidence?.[0].payload).toBe('base64encodeddata');
      expect(v4Report.evidence?.[0].description).toBe('Original email');
    });

    it('should convert v3 Samples to v4 evidence', () => {
      const v3Report: XARFv3Report = {
        Version: '3',
        ReporterInfo: {
          ReporterOrgEmail: 'test@example.com',
        },
        Report: {
          ReportType: 'Malware',
          Date: '2024-01-15T10:00:00Z',
          SourceIp: '192.0.2.1',
          Samples: [
            {
              ContentType: 'application/octet-stream',
              Data: 'malwaredata',
            },
          ],
        },
      };

      const v4Report = convertV3toV4(v3Report);
      expect(v4Report.evidence).toBeDefined();
      expect(v4Report.evidence?.[0].content_type).toBe('application/octet-stream');
      expect(v4Report.evidence?.[0].description).toBe('Evidence from v3 report');
    });
  });

  describe('Unknown Type Handling', () => {
    it('should handle unknown v3 report type with warning', () => {
      const v3Report: XARFv3Report = {
        Version: '3',
        ReporterInfo: {
          ReporterOrgEmail: 'test@example.com',
        },
        Report: {
          ReportType: 'UnknownType',
          Date: '2024-01-15T10:00:00Z',
          SourceIp: '192.0.2.1',
        },
      };

      const warnings: string[] = [];
      const v4Report = convertV3toV4(v3Report, warnings);

      expect(v4Report.category).toBe('other');
      expect(v4Report.type).toBe('unclassified');
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0]).toContain('Unknown v3 ReportType');
    });
  });

  describe('Missing Source IP Handling', () => {
    it('should handle missing source IP with warning', () => {
      const v3Report: XARFv3Report = {
        Version: '3',
        ReporterInfo: {
          ReporterOrgEmail: 'test@example.com',
        },
        Report: {
          ReportType: 'Spam',
          Date: '2024-01-15T10:00:00Z',
        },
      };

      const warnings: string[] = [];
      const v4Report = convertV3toV4(v3Report, warnings);

      expect(v4Report.source_identifier).toBe('unknown');
      expect(warnings.some((w) => w.includes('No source IP found'))).toBe(true);
    });
  });
});

describe('XARFParser v3 Integration', () => {
  let parser: XARFParser;

  beforeEach(() => {
    // Mock console.warn to avoid noise in tests
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should parse v3 spam report automatically', () => {
    parser = new XARFParser(false);

    const v3Report = {
      Version: '3',
      ReporterInfo: {
        ReporterOrg: 'Test Security',
        ReporterOrgEmail: 'abuse@test.example',
      },
      Report: {
        ReportType: 'Spam',
        Date: '2024-01-15T10:00:00Z',
        SourceIp: '192.0.2.100',
        Protocol: 'smtp',
        SmtpMailFromAddress: 'spammer@evil.example',
        SmtpMessageSubject: 'Spam subject',
      },
    };

    const result = parser.parse(v3Report);

    expect(result.xarf_version).toBe('4.0.0');
    expect(result.category).toBe('messaging');
    expect(result.type).toBe('spam');
    expect(result._internal?.legacy_version).toBe('3');

    const warnings = parser.getWarnings();
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toContain('DEPRECATION WARNING');
  });

  it('should validate v3 report as valid', () => {
    parser = new XARFParser();

    const v3Report = {
      Version: '3',
      ReporterInfo: {
        ReporterOrgEmail: 'abuse@example.com',
      },
      Report: {
        ReportType: 'DDoS',
        Date: '2024-01-15T10:00:00Z',
        SourceIp: '192.0.2.50',
        DestinationIp: '203.0.113.10',
        Protocol: 'tcp',
      },
    };

    const isValid = parser.validate(v3Report);
    expect(isValid).toBe(true);

    const warnings = parser.getWarnings();
    expect(warnings.length).toBeGreaterThan(0);
  });

  it('should provide warnings when parsing v3 report', () => {
    parser = new XARFParser();

    const v3Report = {
      Version: '3',
      ReporterInfo: {
        ReporterOrgEmail: 'test@example.com',
      },
      Report: {
        ReportType: 'Spam',
        Date: '2024-01-15T10:00:00Z',
        SourceIp: '192.0.2.1',
      },
    };

    parser.parse(v3Report);
    const warnings = parser.getWarnings();

    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings.some((w) => w.includes('v3 format'))).toBe(true);
  });
});

describe('Deprecation Warning', () => {
  it('should return deprecation warning message', () => {
    const warning = getV3DeprecationWarning();

    expect(warning).toContain('DEPRECATION WARNING');
    expect(warning).toContain('v3 format');
    expect(warning).toContain('converted to v4');
    expect(warning).toContain('future major version');
  });
});
