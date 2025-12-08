/**
 * Mock logger for tests
 * Jest will automatically use this instead of the real logger
 */

export const logger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
