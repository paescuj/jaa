module.exports = {
	output: 'standalone',
	eslint: {
		ignoreDuringBuilds: true,
	},
	webpack: (config) => {
		// Workaround for issue "Module not found: Package path ./jsx-runtime.js is not exported from package"
		config.resolve.alias = {
			...config.resolve.alias,
			'react/jsx-runtime.js': 'react/jsx-runtime',
			'react/jsx-dev-runtime.js': 'react/jsx-dev-runtime',
		};

		return config;
	},
};
