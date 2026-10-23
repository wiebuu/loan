import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Tests run against a separate database that is wiped before each test file.
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'postgres://localhost:5432/loan_test',
      OTP_IN_RESPONSE: 'true',
      REMINDER_COOLDOWN_MINUTES: '60',
      UPLOADS_DIR: join(tmpdir(), 'loan-test-uploads'),
    },
    fileParallelism: false,
    setupFiles: ['./test/setup.ts'],
  },
});
