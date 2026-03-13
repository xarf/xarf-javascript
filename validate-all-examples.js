const { XARFGenerator, XARFParser, XARFValidator, SchemaValidator } = require('./dist/index');

const validator = new XARFValidator();
const schemaValidator = new SchemaValidator();
const generator = new XARFGenerator();
const parser = new XARFParser();

console.log('=== VALIDATING ALL EXAMPLES ===\n');

let totalExamples = 0;
let passedExamples = 0;
let failedExamples = 0;

async function runTests() {

async function validateExample(name, report) {
  totalExamples++;
  console.log(`Testing: ${name}`);

  // Test hand-coded validator
  const handCodedResult = await validator.validate(report);
  console.log(`  Hand-coded validator: ${handCodedResult.valid ? '✅ PASS' : '❌ FAIL'}`);
  if (!handCodedResult.valid && handCodedResult.errors && handCodedResult.errors.length > 0) {
    console.log(`    Errors:`, handCodedResult.errors.slice(0, 3).map(e => e.field + ': ' + e.message));
  }

  // Test schema validator
  const schemaResult = schemaValidator.validate(report);
  console.log(`  Schema validator: ${schemaResult.valid ? '✅ PASS' : '❌ FAIL'}`);
  if (!schemaResult.valid && schemaResult.errors && schemaResult.errors.length > 0) {
    console.log(`    Errors:`, schemaResult.errors.slice(0, 3));
  }

  if (handCodedResult.valid && schemaResult.valid) {
    passedExamples++;
    console.log('  ✅ VALID\n');
  } else {
    failedExamples++;
    console.log('  ❌ INVALID\n');
  }
}

// Example 1: README Quick Start - Generating
console.log('--- README Examples ---\n');
const readmeExample1 = generator.generateReport({
  category: 'messaging',
  type: 'spam',
  source_identifier: '192.0.2.100',
  reporter: {
    org: 'Example Security',
    contact: 'abuse@example.com',
    domain: 'example.com'
  },
  sender: {
    org: 'Example Security',
    contact: 'abuse@example.com',
    domain: 'example.com'
  },
  evidence_source: 'automated_scan',
  severity: 'medium',
  description: 'Spam email detected from source',
  tags: ['spam:email']
});
await validateExample('README Quick Start - Generating', readmeExample1);

// Example 2: README Quick Start - Parsing
const readmeExample2Json = JSON.stringify({
  xarf_version: '4.0.0',
  report_id: '550e8400-e29b-41d4-a716-446655440000',
  timestamp: '2024-01-15T14:30:25Z',
  reporter: {
    org: 'Example Security',
    contact: 'abuse@example.com',
    domain: 'example.com'
  },
  sender: {
    org: 'Example Security',
    contact: 'abuse@example.com',
    domain: 'example.com'
  },
  source_identifier: '192.0.2.100',
  category: 'messaging',
  type: 'spam',
  evidence_source: 'spamtrap',
  protocol: 'smtp',
  smtp_from: 'spammer@evil.com'
});
const readmeExample2 = parser.parse(readmeExample2Json);
await validateExample('README Quick Start - Parsing', readmeExample2);

// Example 3: Generator with all categories
console.log('--- Generator Sample Reports ---\n');
const categoriesWithTypes = [
  { category: 'messaging', type: 'spam' },
  { category: 'connection', type: 'ddos' },
  { category: 'content', type: 'phishing' },
  { category: 'infrastructure', type: 'botnet' },
  { category: 'copyright', type: 'copyright' },
  { category: 'vulnerability', type: 'cve' },
  { category: 'reputation', type: 'blocklist' }
];
for (const { category, type } of categoriesWithTypes) {
  try {
    const sample = generator.generateSampleReport(category, type, true, true);
    await validateExample(`Generator Sample: ${category}/${type}`, sample);
  } catch (error) {
    totalExamples++;
    failedExamples++;
    console.log(`Generator Sample: ${category}/${type}`);
    console.log(`  ❌ FAILED TO GENERATE: ${error.message}\n`);
  }
}

// Example 4: Check examples in JSON schemas
console.log('--- JSON Schema Examples ---\n');
const fs = require('fs');
const path = require('path');

const typesDir = './src/schemas/types';
const files = fs.readdirSync(typesDir).filter(f => f.endsWith('.json'));

for (const file of files) {
  try {
    const schema = JSON.parse(fs.readFileSync(path.join(typesDir, file), 'utf-8'));
    if (schema.examples && Array.isArray(schema.examples)) {
      for (let i = 0; i < schema.examples.length; i++) {
        await validateExample(`${file} - Example ${i+1}`, schema.examples[i]);
      }
    }
  } catch (error) {
    console.log(`Error reading ${file}: ${error.message}\n`);
  }
}

// Summary
console.log('=== SUMMARY ===');
console.log(`Total examples tested: ${totalExamples}`);
console.log(`Passed: ${passedExamples} ✅`);
console.log(`Failed: ${failedExamples} ❌`);
console.log(`Success rate: ${((passedExamples/totalExamples)*100).toFixed(1)}%`);

if (failedExamples > 0) {
  console.log('\n⚠️  SOME EXAMPLES DO NOT VALIDATE!');
  process.exit(1);
} else {
  console.log('\n✅ ALL EXAMPLES VALIDATE!');
  process.exit(0);
}
}

runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
