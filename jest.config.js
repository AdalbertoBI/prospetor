module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: [
    '<rootDir>/tests/**/*.test.js'
  ],
  collectCoverageFrom: [
    'assets/js/**/*.js',
    '!assets/js/**/*.min.js',
    '!**/node_modules/**'
  ],
  coverageReporters: ['html', 'text', 'lcov'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/assets/js/$1'
  }
};

