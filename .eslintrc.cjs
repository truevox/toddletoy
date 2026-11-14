module.exports = {
  root: true,
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  env: {
    browser: true,
    es2022: true,
  },
  globals: {
    Phaser: 'readonly',
    // Injected by Vite `define` (vite.config.js)
    __APP_VERSION__: 'readonly',
    // Legacy WebKit audio constructor, guarded by typeof in AudioManager
    webkitAudioContext: 'readonly',
  },
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
  overrides: [
    {
      files: ['tests/**'],
      env: {
        jest: true,
        node: true,
      },
    },
  ],
};
