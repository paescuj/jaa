import 'tippy.js/dist/tippy.css';

import { Box, Link } from '@chakra-ui/react';
import Tippy from '@tippyjs/react';
import { OpenInWindow } from 'iconoir-react';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { followCursor } from 'tippy.js';

import { getBearer, url as directusUrl } from '@/lib/directus';

// Hide tooltip when loosing focus (keyboard navigation)
const hideOnPopperBlur = {
	name: 'hideOnPopperBlur',
	defaultValue: true,
	fn(instance) {
		return {
			onCreate() {
				instance.popper.addEventListener('focusout', (event) => {
					if (
						instance.props.hideOnPopperBlur &&
						event.relatedTarget &&
						!instance.popper.contains(event.relatedTarget)
					) {
						instance.hide();
					}
				});
			},
		};
	},
};

export default function JobPopup({
	link,
	previewId,
	previewUrl = '',
	children,
}) {
	const { formatMessage } = useIntl();
	const [previewImg, setPreviewImg] = useState(previewUrl);

	useEffect(() => {
		if (previewId) {
			getBearer().then((bearer) => {
				fetch(`${directusUrl}/assets/${previewId}`, {
					method: 'GET',
					headers: { Authorization: bearer },
				}).then(async (response) => {
					const blob = await response.blob();
					const objectUrl = URL.createObjectURL(blob);
					setPreviewImg(objectUrl);
				});
			});
		}
	}, [previewId]);

	return (
		<span style={{ display: 'inline-block' }}>
			<Tippy
				followCursor
				interactive
				delay={[200, 20]}
				placement="bottom"
				theme="chakra"
				plugins={[followCursor, hideOnPopperBlur]}
				content={
					<>
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
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img src={previewImg} alt={formatMessage({ id: 'job_preview' })} />
					</>
				}
			>
				<button>{children}</button>
			</Tippy>
		</span>
	);
}
