import assert from 'assert';
import { createCanvas } from 'canvas';
import { promises as fs } from 'fs';
import jwt from 'jsonwebtoken';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';

function NodeCanvasFactory() {}

NodeCanvasFactory.prototype = {
  create: function NodeCanvasFactory_create(width, height) {
    assert(width > 0 && height > 0, 'Invalid canvas size');
    let canvas = createCanvas(width, height, 'png');
    let context = canvas.getContext('2d');
    return {
      canvas: canvas,
      context: context,
    };
  },

  reset: function NodeCanvasFactory_reset(canvasAndContext, width, height) {
    assert(canvasAndContext.canvas, 'Canvas is not specified');
    assert(width > 0 && height > 0, 'Invalid canvas size');
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  },

  destroy: function NodeCanvasFactory_destroy(canvasAndContext) {
    assert(canvasAndContext.canvas, 'Canvas is not specified');

    // Zeroing the width and height cause Firefox to release graphics
    // resources immediately, which can greatly reduce memory consumption.
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  },
};

export default async function handler(req, res) {
  const auth = req.headers.authorization;
  const token = auth?.replace(/^Bearer\s+/, '');

  if (req.method !== 'POST') {
    res.status(400).send('Bad request');
    return;
  }
  if (!auth || !token) {
    res.status(403).send('Access denied');
    return;
  }

  const jwtSecret = process.env.JWT_SECRET_FILE
    ? await fs.readFile(process.env.JWT_SECRET_FILE, 'utf8')
    : process.env.JWT_SECRET;

  return new Promise((resolve) => {
    jwt.verify(token, jwtSecret, async (err) => {
      if (err) {
        res.status(403).send('Invalid token');
        return resolve();
      } else {
        // read incoming POST data in chunks
        let chunks = [];
        req.on('data', (chunk) => {
          chunks.push(chunk);
        });

        req.on('end', () => {
          // Read the PDF file into a typed array so PDF.js can load it.
          const rawData = new Uint8Array(Buffer.concat(chunks));
          // Load the PDF file.
          pdfjsLib
            .getDocument(rawData)
            .promise.then(function (pdfDocument) {
              // Get the first page.
              pdfDocument.getPage(1).then(function (page) {
                // Render the page on a Node canvas with 100% scale.
                const viewport = page.getViewport({ scale: 1 });
                const canvasFactory = new NodeCanvasFactory();
                const canvasAndContext = canvasFactory.create(
                  viewport.width,
                  viewport.height
                );
                const renderContext = {
                  canvasContext: canvasAndContext.context,
                  viewport: viewport,
                  canvasFactory: canvasFactory,
                };

                page.render(renderContext).promise.then(function () {
                  res.setHeader('Content-Type', 'image/png');
                  // convert the canvas to a png stream.
                  canvasAndContext.canvas
                    .createPNGStream({ compressionLevel: 9 })
                    .pipe(res);
                  return resolve();
                });
              });
            })
            .catch((err) => {
              console.log(err);
              res.status(500).send('Error while generating image');
              return resolve();
            });
        });
      }
    });
  });
}

export const config = {
  api: {
    bodyParser: false,
  },
};
