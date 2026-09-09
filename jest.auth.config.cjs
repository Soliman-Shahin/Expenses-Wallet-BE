module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/app/test/auth-session.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.test.json' }],
  },
  setupFilesAfterEnv: ['<rootDir>/src/app/test/auth-session.setup.cjs'],
  testTimeout: 60000,
};
