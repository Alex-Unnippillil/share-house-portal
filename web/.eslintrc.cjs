/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  env: {
    browser: true,
    es2023: true,
  },
  extends: [
    'plugin:vue/vue3-recommended',
    '@vue/eslint-config-typescript',
    'prettier',
  ],
  parserOptions: {
    extraFileExtensions: ['.vue'],
    project: ['./tsconfig.app.json', './tsconfig.node.json'],
  },
  rules: {
    'vue/multi-word-component-names': 'off',
    'vue/no-unused-components': 'warn',
    'vue/no-unused-properties': [
      'warn',
      {
        groups: ['props', 'data', 'computed', 'methods', 'setup'],
      },
    ],
    'vue/max-attributes-per-line': [
      'warn',
      {
        singleline: 3,
        multiline: 1,
      },
    ],
  },
}
