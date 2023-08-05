import {
	Box,
	Image,
	Link,
	Popover,
	PopoverArrow,
	PopoverBody,
	PopoverContent,
	PopoverTrigger,
} from '@chakra-ui/react';
import { OpenInWindow } from 'iconoir-react';
import { useIntl } from 'react-intl';

import DirectusImage from './DirectusImage';

export default function JobPopup({ link, assetId, imgSrc, children }) {
	const { formatMessage } = useIntl();

	const imgProps = {
		alt: formatMessage({ id: 'job_preview' }),
		border: '1px',
		borderColor: 'chakra-border-color',
		borderRadius: 'var(--chakra-radii-md)',
	};

	return (
		<Popover trigger="hover">
			<PopoverTrigger>
				<button>{children}</button>
			</PopoverTrigger>
			<PopoverContent>
				<PopoverArrow />
				<PopoverBody>
					<Link
						display="inline-flex"
						alignContent="center"
						mb="1"
						href={link}
						isExternal
					>
						{formatMessage(
							{ id: 'job_advertisement_on_domain' },
							{ domain: new URL(link).hostname },
						)}
						<Box
							as="span"
							display="inline-flex"
							sx={{ alignItems: 'center' }}
							ml="1"
						>
							<OpenInWindow width="1em" height="1em" />
						</Box>
					</Link>
					{imgSrc ? (
						// eslint-disable-next-line jsx-a11y/alt-text
						<Image src={imgSrc} {...imgProps} />
					) : (
						<DirectusImage assetId={assetId} {...imgProps} />
					)}
				</PopoverBody>
			</PopoverContent>
		</Popover>
	);
}
