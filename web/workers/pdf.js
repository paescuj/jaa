// Check whether pdf worker is available in react-pdf
// (otherwise it got deduped)
const context = require.context(
  '@paescuj/react-pdf',
  true,
  /legacy\/build\/pdf\.worker\.(min\.)?js$/
);
let packagePath = '@paescuj/react-pdf/node_modules/';
if (context.keys().length !== 2) {
  packagePath = '';
}

if (process.env.NODE_ENV === 'production') {
  module.exports = require('../node_modules/' +
    packagePath +
    'pdfjs-dist/legacy/build/pdf.worker.min.js');
} else {
  module.exports = require('../node_modules/' +
    packagePath +
    'pdfjs-dist/legacy/build/pdf.worker.js');
}
