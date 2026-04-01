/**
 * Tests for browser-compatible crypto utilities
 */

import { generateUUID, generateHash, toBase64, fromBase64 } from '../src/crypto-utils';

describe('generateUUID', () => {
  it('should return a valid UUID v4 string', () => {
    const uuid = generateUUID();
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('should return a different UUID on each call', () => {
    const uuids = new Set(Array.from({ length: 20 }, () => generateUUID()));
    expect(uuids.size).toBe(20);
  });
});

describe('generateHash', () => {
  it('should produce a sha256 hex digest for a string input', async () => {
    const hash = await generateHash('hello');
    // Known SHA-256 of "hello"
    expect(hash).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  });

  it('should produce a sha256 hex digest for Uint8Array input', async () => {
    const bytes = new TextEncoder().encode('hello');
    const hash = await generateHash(bytes);
    expect(hash).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  });

  it('should produce a 128-char hex string for sha512', async () => {
    const hash = await generateHash('hello', 'sha512');
    expect(hash).toMatch(/^[0-9a-f]{128}$/);
  });

  it('should produce a 40-char hex string for sha1', async () => {
    const hash = await generateHash('hello', 'sha1');
    expect(hash).toMatch(/^[0-9a-f]{40}$/);
  });

  it('should default to sha256', async () => {
    const explicit = await generateHash('test', 'sha256');
    const implicit = await generateHash('test');
    expect(implicit).toBe(explicit);
  });

  it('should produce different hashes for different inputs', async () => {
    const a = await generateHash('foo');
    const b = await generateHash('bar');
    expect(a).not.toBe(b);
  });
});

describe('toBase64', () => {
  it('should encode bytes to a base64 string', () => {
    const bytes = new TextEncoder().encode('hello');
    expect(toBase64(bytes)).toBe('aGVsbG8=');
  });

  it('should handle empty input', () => {
    expect(toBase64(new Uint8Array(0))).toBe('');
  });

  it('should encode binary data correctly', () => {
    const bytes = new Uint8Array([0, 1, 2, 255]);
    expect(toBase64(bytes)).toBe('AAEC/w==');
  });
});

describe('fromBase64', () => {
  it('should decode a base64 string to bytes', () => {
    const bytes = fromBase64('aGVsbG8=');
    expect(new TextDecoder().decode(bytes)).toBe('hello');
  });

  it('should handle missing padding gracefully', () => {
    // 'aGVsbG8=' without the trailing '='
    const bytes = fromBase64('aGVsbG8');
    expect(new TextDecoder().decode(bytes)).toBe('hello');
  });

  it('should strip whitespace and newlines (lenient mode)', () => {
    const bytes = fromBase64('aGVs\nbG8=');
    expect(new TextDecoder().decode(bytes)).toBe('hello');
  });

  it('should handle empty input', () => {
    expect(fromBase64('')).toEqual(new Uint8Array(0));
  });

  it('should round-trip with toBase64', () => {
    const original = new Uint8Array([10, 20, 30, 40, 50, 200, 255]);
    const encoded = toBase64(original);
    const decoded = fromBase64(encoded);
    expect(decoded).toEqual(original);
  });

  it('should round-trip arbitrary UTF-8 text', () => {
    const text = 'XARF report evidence payload';
    const encoded = toBase64(new TextEncoder().encode(text));
    const decoded = new TextDecoder().decode(fromBase64(encoded));
    expect(decoded).toBe(text);
  });
});
