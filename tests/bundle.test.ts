/**
 * Tests for bundled schemas and version exports.
 */

import pkg from '../package.json';
import { VERSION, SPEC_VERSION, BUNDLED_SPEC_VERSION, schemaRegistry, validator } from '../src';
import {
  getCoreSchema,
  getMasterSchema,
  listTypeSchemaPaths,
  getBundledSchema,
  resolveBaseSchemaRef,
} from '../src/schema-utils';
import { bundledSchemas } from '../src/schemas.generated';

describe('version exports', () => {
  it('derives VERSION from package.json (no hardcoded drift)', () => {
    expect(VERSION).toBe(pkg.version);
  });

  it('exposes SPEC_VERSION without the leading "v"', () => {
    expect(SPEC_VERSION).toBe(pkg.xarfSpec.version.replace(/^v/, ''));
    expect(SPEC_VERSION).not.toMatch(/^v/);
  });

  it('exposes BUNDLED_SPEC_VERSION matching the configured spec', () => {
    expect(BUNDLED_SPEC_VERSION).toBe(pkg.xarfSpec.version);
  });
});

describe('bundled schemas', () => {
  it('bundles the core and master schemas', () => {
    expect(getCoreSchema()).not.toBeNull();
    expect(getMasterSchema()).not.toBeNull();
    expect(getBundledSchema('xarf-core.json')).not.toBeNull();
  });

  it('returns null for an unknown bundle key', () => {
    expect(getBundledSchema('does-not-exist.json')).toBeNull();
  });

  it('lists only type schema paths', () => {
    const paths = listTypeSchemaPaths();
    expect(paths.length).toBeGreaterThan(0);
    expect(paths.every((p) => p.startsWith('types/'))).toBe(true);
    expect(paths).toContain('types/messaging-spam.json');
  });

  it('exposes a frozen, non-empty bundle', () => {
    expect(Object.isFrozen(bundledSchemas)).toBe(true);
    expect(Object.keys(bundledSchemas).length).toBeGreaterThan(30);
  });

  it('resolves relative base-schema refs to the bundled type schema', () => {
    expect(resolveBaseSchemaRef('./content-base.json')).not.toBeNull();
    expect(resolveBaseSchemaRef('../content-base.json')).not.toBeNull();
    expect(resolveBaseSchemaRef('content-base.json')).not.toBeNull();
  });
});

describe('registry/validator driven by the bundle', () => {
  it('discovers all 7 XARF categories from the bundled core schema', () => {
    expect(schemaRegistry.getCategories().size).toBe(7);
  });

  it('exposes supported category/type combinations from the bundle', () => {
    const supported = validator.getSupportedTypes();
    expect(supported.length).toBeGreaterThan(0);
    expect(supported).toContainEqual({ category: 'messaging', type: 'spam' });
  });

  it("getAllFieldsForCategory returns a superset of an individual type's fields", () => {
    const all = schemaRegistry.getAllFieldsForCategory('content');
    const phishingFields = schemaRegistry.getCategoryFields('content', 'phishing');
    expect(all.size).toBeGreaterThan(0);
    expect(phishingFields.length).toBeGreaterThan(0);
    for (const field of phishingFields) {
      expect(all.has(field)).toBe(true);
    }
  });
});
