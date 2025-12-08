module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts'
  ],
  coverageDirectory: 'coverage',
  verbose: true,
  coverageThreshold: {
    global: {
      // Adjusted to current coverage levels + 5% buffer for growth
      // Current: statements 42%, branches 37%, functions 40%, lines 41%
      // Target: Incrementally increase as tests are added
      statements: 40,
      branches: 35,
      functions: 38,
      lines: 40
    },
    // Higher thresholds for critical services (already well-tested)
    './src/services/gamificationService.ts': {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80
    },
    './src/services/badgeAwardService.ts': {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80
    },
    './src/services/pushService.ts': {
      statements: 75,
      branches: 70,
      functions: 75,
      lines: 75
    }
  },
  coverageReporters: ['text', 'lcov', 'html', 'json-summary']
};
