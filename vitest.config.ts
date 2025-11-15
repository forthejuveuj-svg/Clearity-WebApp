import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['scripts/doc-system/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['scripts/doc-system/**/*.ts'],
      exclude: [
        'scripts/doc-system/__tests__/**',
        'scripts/doc-system/**/*.d.ts',
        'scripts/doc-system/cli.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './scripts/doc-system'),
    },
  },
});
