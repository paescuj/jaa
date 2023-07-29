import { Readable } from 'node:stream';

import { defineHook } from '@directus/extensions-sdk';
import type { FilterHandler } from '@directus/types';
import { fromBuffer } from 'pdf2pic';
import puppeteer from 'puppeteer';

type Job = {
	company?: string;
	position?: string;
	link?: string;
	preview: string[];
};

type Doc = {
	title?: string;
	file: string[];
	preview: string[];
};

export default defineHook(({ filter }, { services, logger, getSchema }) => {
	const onCreateJob: FilterHandler<Job> = async (input) => {
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
				const file = await filesService.uploadOne(Readable.from(screenshot), {
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
	};

	filter('jobs.items.create', onCreateJob as FilterHandler);

	// TODO: Eventually go back to pdf.js approach:
	// https://github.com/paescuj/jaa/blob/9f80ceb899aca72447ce145cddf73389885ec45a/web/pages/api/pdf-preview.js
	const onCreateDoc: FilterHandler<Doc> = async (input) => {
		const { AssetsService, FilesService } = services;

		if (input.file[0]) {
			try {
				const filesService = new FilesService({ schema: await getSchema() });
				const assetsService = new AssetsService({ schema: await getSchema() });

				const { stream } = await assetsService.getAsset(input.file[0], {
					transformationParams: {},
				});

				const chunks: Uint8Array[] = [];
				for await (const chunk of stream) {
					chunks.push(chunk);
				}

				const convert = fromBuffer(Buffer.concat(chunks), {
					format: 'png',
					width: 600,
				});
				const image = await convert(1, true);

				const name = `preview-${input.title}`;
				if ('base64' in image && image.base64) {
					const file = await filesService.uploadOne(
						Readable.from(Buffer.from(image.base64, 'base64')),
						{
							title: name,
							filename_download: `${name}.png`,
							type: 'image/png',
							storage: 'local',
						},
					);

					input.preview = [file];
				}
			} catch (error) {
				logger.error(error);
			}
		}

		return input;
	};

	filter('docs.items.create', onCreateDoc as FilterHandler);
});
