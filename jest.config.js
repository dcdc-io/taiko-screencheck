module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transformIgnorePatterns: ['^.+\\.js$'],
  testMatch: ['**/src/**/*.spec.ts']
};