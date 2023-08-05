import { Image } from '@chakra-ui/react';
import { useEffect, useState } from 'react';

import { getBearer, url } from '@/lib/directus';

export default function DirectusImage({
	assetId,
	assetParams,
	as = Image,
	...props
}) {
	const [src, setSrc] = useState();

	useEffect(() => {
		async function fetchImage() {
			const imageUrl = new URL(url);
			imageUrl.pathname = `assets/${assetId}`;
			imageUrl.search = new URLSearchParams(assetParams);

			const response = await fetch(imageUrl, {
				headers: { Authorization: await getBearer() },
			});
			const blob = await response.blob();

			setSrc(URL.createObjectURL(blob));
		}
		fetchImage();
	}, [assetId, assetParams]);

	return as.render({ ...props, src });
}
