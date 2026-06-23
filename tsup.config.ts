import { defineConfig } from 'tsup';

/**
 * Build configuration: emit a dual CommonJS + ESM bundle with type
 * declarations. The XARF schemas are inlined via `src/schemas.generated.ts`,
 * so the output has no filesystem or network dependency.
 */
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'node18',
  outDir: 'dist',
});
