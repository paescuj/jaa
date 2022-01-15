if (process.env.NODE_ENV === 'production') {
  module.exports = require('pdfjs-dist/build/pdf.worker.min.js');
} else {
  module.exports = require('pdfjs-dist/build/pdf.worker.js');
}
