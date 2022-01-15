import puppeteer from 'puppeteer';
import { fromBuffer } from 'pdf2pic';

export default ({ filter }, { services, logger, getSchema }) => {
  filter('jobs.items.create', async (input) => {
    const { FilesService } = services;

    if (input.link) {
      try {
        const filesService = new FilesService({ schema: await getSchema() });

        const browser = await puppeteer.launch({
          args: ['--no-sandbox', '--disable-dev-shm-usage'],
        });
        const page = await browser.newPage();
        await page.goto(input.link, {
          waitUntil: 'networkidle2',
        });
        const screenshot = await page.screenshot();
        await browser.close();

        const name = `preview-${input.company}-${input.position}`;
        const file = await filesService.uploadOne(screenshot, {
          title: name,
          filename_download: name,
          type: 'image/png',
          storage: 'local',
        });

        input.preview = [file];
      } catch (error) {
        logger.error(error);
      }
    }

    return input;
  });

  // TODO: Eventually go back to this approach:
  // https://github.com/paescuj/jaa/blob/9f80ceb899aca72447ce145cddf73389885ec45a/web/pages/api/pdf-preview.js
  filter('docs.items.create', async (input) => {
    const { AssetsService, FilesService } = services;

    if (input.file[0]) {
      try {
        const filesService = new FilesService({ schema: await getSchema() });
        const assetsService = new AssetsService({ schema: await getSchema() });

        const { stream } = await assetsService.getAsset(input.file[0], []);
        const chunks = [];
        for await (let chunk of stream) {
          chunks.push(chunk);
        }
        const convert = fromBuffer(Buffer.concat(chunks), {
          format: 'png',
          width: 600,
          height: 600,
        });
        const image = await convert(1, true);

        const name = `preview-${input.title}`;
        const file = await filesService.uploadOne(
          Buffer.from(image.base64, 'base64'),
          {
            title: name,
            filename_download: name,
            type: 'image/png',
            storage: 'local',
          }
        );

        input.preview = [file];
      } catch (error) {
        logger.error(error);
      }
    }

    return input;
  });
};
