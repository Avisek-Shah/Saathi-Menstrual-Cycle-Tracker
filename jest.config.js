// Pure-logic tests for src/core/* (§14). These modules have no React Native imports, so they
// run in plain Node with a minimal TypeScript + CommonJS transform rather than the heavier
// jest-expo preset. UI / repository tests (jest-expo, RN Testing Library) come with the
// milestones that add UI.
module.exports = {
  testEnvironment: 'node',
  // src/core/* plus the pure theme resolver (src/theme/palette.ts) — all dependency-free.
  // UI / hook / repository tests (jest-expo, RN Testing Library) come with M12+.
  testMatch: ['<rootDir>/src/core/**/*.test.ts', '<rootDir>/src/theme/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': [
      'babel-jest',
      {
        configFile: false,
        babelrc: false,
        presets: [['@babel/preset-typescript', { onlyRemoveTypeAnnotations: true }]],
        plugins: ['@babel/plugin-transform-modules-commonjs'],
      },
    ],
  },
};
