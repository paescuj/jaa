module.exports = {
  // Stop looking for ESLint configurations in parent folders
  root: true,
  env: {
    // Enables browser globals like window and document
    browser: true,
    // Enables Node.js global variables and Node.js scoping
    node: true,
    // Enables all ECMAScript 6 features except for modules
    es6: true,
  },
  plugins: ['simple-import-sort'],
  extends: [
    'eslint:recommended',
    'plugin:import/recommended',
    'plugin:mdx/recommended',
    'plugin:prettier/recommended',
    'next',
    'next/core-web-vitals',
  ],
  rules: {
    'simple-import-sort/imports': 'error',
    'simple-import-sort/exports': 'error',
    'import/first': 'error',
    'import/newline-after-import': 'error',
    // Enabled through Next.js
    'import/no-anonymous-default-export': [
      'error',
      {
        allowObject: true,
      },
    ],
    'prettier/prettier': ['error'],
  },
  settings: {
    'mdx/code-blocks': true,
  },
  overrides: [
    {
      files: ['*.mdx'],
      rules: {
        'no-undef': 'off',
        'react/no-children-prop': 'off',
      },
    },
  ],
};
