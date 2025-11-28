import { defineConfig } from 'tsup';

export default defineConfig([
  // Library
  {
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    clean: true,
    sourcemap: true,
  },
  
  // CLI
  {
    entry: ['src/cli/index.ts'],
    format: ['esm'],
    outExtension: () => ({ js: '.js' }),
    banner: { js: '#!/usr/bin/env node' },
    platform: 'node',
    target: 'node18',
  },
]);