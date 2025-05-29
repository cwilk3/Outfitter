module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Roots for test discovery
  roots: ['<rootDir>/tests'],
  
  // Test file patterns
  testMatch: [
    '<rootDir>/tests/**/*.test.ts',
    '<rootDir>/tests/**/*.test.js'
  ],
  
  // TypeScript transformation
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: false,
      tsconfig: {
        module: 'commonjs',
        target: 'es2020',
        moduleResolution: 'node',
        allowJs: true,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        strict: false,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true
      }
    }]
  },
  
  // File extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Module name mapping for path aliases
  moduleNameMapper: {
    '^@shared/(.*)$': '<rootDir>/shared/$1',
    '^@/(.*)$': '<rootDir>/client/src/$1'
  },
  
  // Setup files
  setupFilesAfterEnv: [],
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Coverage configuration
  collectCoverageFrom: [
    'server/**/*.{ts,js}',
    'shared/**/*.{ts,js}',
    '!**/*.d.ts',
    '!**/node_modules/**'
  ],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/backup/',
    '/tmp/'
  ],
  
  // Module directories
  moduleDirectories: ['node_modules', '<rootDir>'],
  
  // Verbose output
  verbose: true,
  
  // Preset
  preset: 'ts-jest/presets/default'
};