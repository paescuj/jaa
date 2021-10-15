const withMDX = require('@next/mdx')();

module.exports = withMDX({
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
    return config;
  },
});
