/**
 * Schema Validation Examples
 *
 * Demonstrates how to use the SchemaValidator to validate XARF reports
 * against JSON schemas with full type-specific validation.
 */

import { validator, SchemaValidator, type XARFReport } from '../src/index';

// Example 1: Using the singleton validator instance
function exampleSingletonValidator() {
  console.log('\n=== Example 1: Singleton Validator ===\n');

  const report: XARFReport = {
    xarf_version: '4.0.0',
    report_id: '550e8400-e29b-41d4-a716-446655440000',
    timestamp: '2024-01-15T14:30:25Z',
    reporter: {
      org: 'Example Security',
      contact: 'abuse@example.com',
      domain: 'example.com',
    },
    sender: {
      org: 'Example Security',
      contact: 'abuse@example.com',
      domain: 'example.com',
    },
    source_identifier: '192.0.2.1',
    category: 'messaging',
    type: 'spam',
    evidence_source: 'spamtrap',
  };

  const result = validator.validate(report);

  if (result.valid) {
    console.log('✓ Report is valid');
  } else {
    console.log('✗ Validation failed:');
    result.errors.forEach((error) => console.log(`  - ${error}`));
  }
}

// Example 2: Creating a custom validator instance
function exampleCustomValidator() {
  console.log('\n=== Example 2: Custom Validator Instance ===\n');

  const customValidator = new SchemaValidator();

  const report: XARFReport = {
    xarf_version: '4.0.0',
    report_id: 'invalid-uuid', // This will fail validation
    timestamp: '2024-01-15T14:30:25Z',
    reporter: {
      org: 'Example Security',
      contact: 'abuse@example.com',
      domain: 'example.com',
    },
    sender: {
      org: 'Example Security',
      contact: 'abuse@example.com',
      domain: 'example.com',
    },
    source_identifier: '192.0.2.1',
    category: 'messaging',
    type: 'spam',
    evidence_source: 'spamtrap',
  };

  const result = customValidator.validate(report);

  if (!result.valid) {
    console.log('✗ Expected validation errors:');
    result.errors.forEach((error) => console.log(`  - ${error}`));
  }
}

// Example 3: Validating type-specific fields
function exampleTypeSpecificValidation() {
  console.log('\n=== Example 3: Type-Specific Validation ===\n');

  // Messaging spam report with protocol-specific fields
  const spamReport: XARFReport = {
    xarf_version: '4.0.0',
    report_id: '550e8400-e29b-41d4-a716-446655440001',
    timestamp: '2024-01-15T14:30:25Z',
    reporter: {
      org: 'SpamCop',
      contact: 'reports@spamcop.net',
      domain: 'spamcop.net',
    },
    sender: {
      org: 'SpamCop',
      contact: 'reports@spamcop.net',
      domain: 'spamcop.net',
    },
    source_identifier: '192.0.2.123',
    source_port: 25, // Required for SMTP spam reports
    category: 'messaging',
    type: 'spam',
    protocol: 'smtp',
    smtp_from: 'spammer@example.com',
    smtp_to: 'victim@example.org',
    subject: 'Urgent: Verify Your Account',
    evidence_source: 'spamtrap',
  };

  const result = validator.validate(spamReport);

  if (result.valid) {
    console.log('✓ Spam report with type-specific fields is valid');
  } else {
    console.log('✗ Validation failed:');
    result.errors.forEach((error) => console.log(`  - ${error}`));
  }
}

// Example 4: Checking supported types
function exampleSupportedTypes() {
  console.log('\n=== Example 4: Supported Types ===\n');

  const types = validator.getSupportedTypes();
  console.log(`Found ${types.length} supported category+type combinations:`);

  // Group by category
  const byCategory: Record<string, string[]> = {};
  types.forEach(({ category, type }) => {
    if (!byCategory[category]) {
      byCategory[category] = [];
    }
    byCategory[category].push(type);
  });

  Object.keys(byCategory)
    .sort()
    .forEach((category) => {
      console.log(`\n${category}:`);
      byCategory[category].forEach((type) => {
        console.log(`  - ${type}`);
      });
    });
}

// Example 5: Checking if a specific type is supported
function exampleTypeSupport() {
  console.log('\n=== Example 5: Type Support Check ===\n');

  const checks = [
    { category: 'messaging', type: 'spam' },
    { category: 'connection', type: 'ddos' },
    { category: 'content', type: 'phishing' },
    { category: 'messaging', type: 'nonexistent' },
  ];

  checks.forEach(({ category, type }) => {
    const supported = validator.hasTypeSchema(category, type);
    const status = supported ? '✓' : '✗';
    console.log(`${status} ${category}/${type}: ${supported ? 'supported' : 'not supported'}`);
  });
}

// Example 6: Handling validation errors gracefully
function exampleErrorHandling() {
  console.log('\n=== Example 6: Error Handling ===\n');

  // Missing required fields
  const invalidReport = {
    xarf_version: '4.0.0',
    // Missing report_id, timestamp, etc.
    category: 'messaging',
    type: 'spam',
  } as XARFReport;

  const result = validator.validate(invalidReport);

  if (!result.valid) {
    console.log('✗ Validation errors found:');
    result.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error}`);
    });
  }
}

// Example 7: Full validation with evidence
function exampleWithEvidence() {
  console.log('\n=== Example 7: Validation with Evidence ===\n');

  const report: XARFReport = {
    xarf_version: '4.0.0',
    report_id: '550e8400-e29b-41d4-a716-446655440003',
    timestamp: '2024-01-15T14:30:25Z',
    reporter: {
      org: 'Security Research Lab',
      contact: 'reports@seclab.org',
      domain: 'seclab.org',
    },
    sender: {
      org: 'Security Research Lab',
      contact: 'reports@seclab.org',
      domain: 'seclab.org',
    },
    source_identifier: '198.51.100.42',
    category: 'connection',
    type: 'ddos',
    evidence_source: 'ids_ips',
    evidence: [
      {
        content_type: 'text/plain',
        description: 'Network flow analysis logs',
        payload: 'VGhpcyBpcyBhIGJhc2U2NC1lbmNvZGVkIHBheWxvYWQ=',
        hash: 'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      },
    ],
    tags: ['attack:syn_flood', 'volume:high'],
    confidence: 0.95,
  };

  const result = validator.validate(report);

  if (result.valid) {
    console.log('✓ Report with evidence validated successfully');
  } else {
    console.log('✗ Validation failed:');
    result.errors.forEach((error) => console.log(`  - ${error}`));
  }
}

// Run all examples
function runAllExamples() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║         XARF Schema Validator - Usage Examples               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');

  try {
    exampleSingletonValidator();
    exampleCustomValidator();
    exampleTypeSpecificValidation();
    exampleSupportedTypes();
    exampleTypeSupport();
    exampleErrorHandling();
    exampleWithEvidence();

    console.log('\n✓ All examples completed\n');
  } catch (error) {
    console.error('\n✗ Error running examples:', error);
    process.exit(1);
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples();
}
