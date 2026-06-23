/**
 * Tests for SchemaValidator's degraded-bundle guards.
 *
 * The schema engine reads from the in-memory bundle. If codegen ever produces a
 * bundle missing the core or master schema, loadMasterSchema() throws and
 * validate() surfaces it as a structured error (rather than crashing). These
 * guards replaced the old filesystem "file not found" errors, so they need
 * their own coverage.
 */

jest.mock('../src/schema-utils', () => {
  const actual = jest.requireActual('../src/schema-utils');
  return { __esModule: true, ...actual };
});

import * as schemaUtils from '../src/schema-utils';
import { SchemaValidator } from '../src/schema-validator';
import type { XARFReport } from '../src/types';

const report = { category: 'messaging', type: 'spam' } as unknown as XARFReport;

describe('SchemaValidator missing-bundle guards', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns a validation error when the core schema is missing from the bundle', () => {
    jest.spyOn(schemaUtils, 'getCoreSchema').mockReturnValue(null);
    const validator = new SchemaValidator();
    const result = validator.validate(report);
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toMatch(/core schema .* missing from the bundle/i);
  });

  it('returns a validation error when the master schema is missing from the bundle', () => {
    jest.spyOn(schemaUtils, 'getMasterSchema').mockReturnValue(null);
    const validator = new SchemaValidator();
    const result = validator.validate(report);
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toMatch(/master schema .* missing from the bundle/i);
  });
});
