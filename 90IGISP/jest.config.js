// Check if reporter packages are available
let reporters = ['default'];
try {
  require.resolve('jest-junit');
  // Only add jest-junit if it's installed
  reporters.push(
    ['jest-junit', {
      outputDirectory: './test-results',
      outputName: 'junit.xml',
    }]
  );
} catch (e) {
  console.warn('\n⚠️ Custom reporter not available. To enable JUnit result file output, run:');
  console.warn('   npm install --save-dev jest-junit\n');
}

module.exports = {
  testEnvironment: 'node',
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: ['/node_modules/', '/tests/'],
  testMatch: ['**/tests/**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 80,
      statements: 80
    }
  },
  // Mock modules that can't be tested directly
  moduleNameMapper: {
    '@supabase/supabase-js': '<rootDir>/tests/mocks/supabase.js',
    'redis': '<rootDir>/tests/mocks/redis.js',
    'kafkajs': '<rootDir>/tests/mocks/kafka.js'
  },
  
  // Use available reporters
  reporters
};
