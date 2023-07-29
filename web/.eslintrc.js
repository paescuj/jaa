/** @type {import('eslint').Linter.Config} */
module.exports = {
	root: true,
	env: {
		// Enables browser globals like window and document
		browser: true,
	},
	extends: ['next', 'next/core-web-vitals'],
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
