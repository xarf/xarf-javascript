module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
    // Generated data module (inlined JSON schemas), not logic to test.
    '!src/schemas.generated.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 78,
      functions: 90,
      lines: 88,
      statements: 88
    }
  },
  coverageDirectory: 'coverage',
  verbose: true
};
