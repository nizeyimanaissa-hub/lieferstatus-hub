module.exports = {
  testEnvironment: 'node',
  testTimeout: 30000,
  testPathIgnorePatterns: ['/node_modules/', '/gen/', '/app/', '/.deploy/'],
  transform: {
    '^.+\\.ts$': ['@swc/jest', {
      jsc: { parser: { syntax: 'typescript' }, target: 'es2022' },
      module: { type: 'commonjs' }
    }]
  }
}
