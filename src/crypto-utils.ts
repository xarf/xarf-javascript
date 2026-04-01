/**
 * Browser-compatible crypto utilities using the Web Crypto API.
 *
 * Requires Node 19+ or any modern browser — both expose
 * `globalThis.crypto` with `randomUUID()` and `subtle.digest()`.
 *
 * - UUID:     globalThis.crypto.randomUUID()
 * - Hashing:  crypto.subtle.digest() — async, hardware-accelerated
 * - Binary:   TextEncoder / Uint8Array / btoa / atob — all standard globals
 */

function assertWebCrypto(): void {
  if (!globalThis.crypto?.subtle) {
    throw new Error(
      'Web Crypto API not available. Requires Node.js 19+ or a modern browser (Chrome 37+, Firefox 34+, Safari 11+).'
    );
  }
}

/**
 * Generate a UUID v4.
 */
export function generateUUID(): string {
  assertWebCrypto();
  return globalThis.crypto.randomUUID();
}

/**
 * Hash data and return the result as a lowercase hex string.
 * Uses Web Crypto's subtle.digest — available in all modern browsers and Node 19+.
 * Note: MD5 is not supported by Web Crypto (intentionally excluded as insecure).
 * @param data - String (UTF-8 encoded) or raw bytes
 * @param algorithm - Hash algorithm to use
 */
export async function generateHash(
  data: string | Uint8Array,
  algorithm: 'sha256' | 'sha512' | 'sha1' = 'sha256'
): Promise<string> {
  assertWebCrypto();
  const input = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const algoMap: Record<string, string> = { sha256: 'SHA-256', sha512: 'SHA-512', sha1: 'SHA-1' };
  const subtleAlgo = algoMap[algorithm];
  const hashBuffer = await globalThis.crypto.subtle.digest(subtleAlgo, input.buffer as ArrayBuffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Encode a Uint8Array to a base64 string.
 * @param bytes
 */
export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Decode a base64 string to a Uint8Array.
 * Lenient: strips non-base64 characters and handles missing padding.
 * @param str
 */
export function fromBase64(str: string): Uint8Array {
  const clean = str.replace(/[^A-Za-z0-9+/=]/g, '');
  // A length of n % 4 === 1 is structurally invalid; drop the orphaned char
  const valid = clean.length % 4 === 1 ? clean.slice(0, -1) : clean;
  const padded = valid + '='.repeat((4 - (valid.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}
