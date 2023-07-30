module.exports = {
	output: 'standalone',
	eslint: {
		ignoreDuringBuilds: true,
	},
	webpack: (config) => {
		// Load pdf worker files as URLs by using asset modules
		config.module.rules.unshift({
			test: /pdf\.worker\.(min\.)?js/,
			type: 'asset/resource',
			generator: {
				filename: 'static/worker/[hash][ext][query]',
			},
		});

		// Workaround for issue "Module not found: Package path ./jsx-runtime.js is not exported from package"
		config.resolve.alias = {
			...config.resolve.alias,
			'react/jsx-runtime.js': 'react/jsx-runtime',
			'react/jsx-dev-runtime.js': 'react/jsx-dev-runtime',
		};

		return config;
	},
};
