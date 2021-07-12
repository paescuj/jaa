import { promises as fs } from 'fs';
import jwt from 'jsonwebtoken';
import puppeteer from 'puppeteer';

export default async function handler(req, res) {
  const auth = req.headers.authorization;
  const url = req.body.url;
  const token = auth?.replace(/^Bearer\s+/, '');

  if (req.method !== 'POST' || !url) {
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
        try {
          const opts =
            process.env.NODE_ENV === 'production'
              ? {
                  args: ['--no-sandbox', '--disable-dev-shm-usage'],
                }
              : {};
          const browser = await puppeteer.launch(opts);
          const page = await browser.newPage();
          await page.goto(url, {
            waitUntil: 'networkidle2',
          });
          const screenshot = await page.screenshot();

          res.setHeader('Content-Type', 'image/png');
          res.status(200).send(screenshot);

          await browser.close();
          return resolve();
        } catch (error) {
          console.log(error);
          res.status(500).send('Error while generating screenshot');
          return resolve();
        }
      }
    });
  });
}
