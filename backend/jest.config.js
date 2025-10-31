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
      statements: 70,
      branches: 65,
      functions: 70,
      lines: 70
    },
    // Higher thresholds for critical services
    './src/services/gamificationService.ts': {
      statements: 90,
      branches: 85,
      functions: 90,
      lines: 90
    },
    './src/services/badgeAwardService.ts': {
      statements: 85,
      branches: 80,
      functions: 85,
      lines: 85
    },
    './src/services/pushService.ts': {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80
    }
  },
  coverageReporters: ['text', 'lcov', 'html', 'json-summary']
};
