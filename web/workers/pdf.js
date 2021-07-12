if (process.env.NODE_ENV === 'production') {
  module.exports = require('react-pdf/node_modules/pdfjs-dist/build/pdf.worker.min.js');
} else {
  module.exports = require('react-pdf/node_modules/pdfjs-dist/build/pdf.worker.js');
}
