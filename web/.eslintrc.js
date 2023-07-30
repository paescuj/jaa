/** @type {import('eslint').Linter.Config} */
module.exports = {
	env: {
		// Enables browser globals like window and document
		browser: true,
	},
	extends: ['next', 'next/core-web-vitals'],
	parserOptions: {
		babelOptions: {
			presets: [require.resolve('next/babel')],
		},
	},
	rules: {
		// Enabled through Next.js
		'import/no-anonymous-default-export': [
			'error',
			{
				allowObject: true,
			},
		],
	},
	settings: {
		next: {
			rootDir: './web',
		},
		'import/resolver': {
			alias: {
				map: [['@', './web']],
			},
		},
	},
};
