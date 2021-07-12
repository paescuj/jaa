const withMDX = require('@next/mdx')();

module.exports = withMDX({
  webpack: (config) => {
    // Load pdf-worker with 'file-loader'
    config.module.rules.unshift({
      test: /pdf\.worker\.(min\.)?js/,
      use: [
        {
          loader: 'file-loader',
          options: {
            name: '[contenthash].[ext]',
            publicPath: '_next/static/pdf-worker',
            outputPath: 'static/pdf-worker',
          },
        },
      ],
    });
    return config;
  },
});
