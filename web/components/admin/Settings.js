import env from '@beam-australia/react-env';
import {
	Accordion,
	AccordionButton,
	AccordionIcon,
	AccordionItem,
	AccordionPanel,
	Box,
	Button,
	Link,
	Stack,
	Text,
	useTheme,
} from '@chakra-ui/react';
import crypto from 'crypto';
import { useIntl } from 'react-intl';

import FormModal, { useFormModal } from '@/components/common/FormModal';
import { directus, url as directusUrl } from '@/lib/directus';

const domain =
	env('DOMAIN') || (typeof window !== 'undefined' && window.location.host);
const chatwootUrl = env('CHATWOOT_URL');

export default function Settings({ jobs, settings, refreshSettings }) {
	const theme = useTheme();
	const { formatMessage } = useIntl();

	const chatwootIsSetup =
		settings.chatwoot_website_token && settings.chatwoot_hmac_token;

	const chatwootSetupFormModal = useFormModal({
		onSubmit: onSubmitChatwootSetup,
	});
	async function onSubmitChatwootSetup({ user_token }) {
		const profile = await fetch(`${chatwootUrl}/api/v1/profile`, {
			headers: { api_access_token: user_token },
		});
		const profileResponse = await profile.json();

		if (!profileResponse.account_id) {
			chatwootSetupFormModal.setError('user_token', {
				type: 'manual',
				message: formatMessage({ id: 'token_invalid' }),
			});
			return false;
		}

		const inboxBody = {
			name: 'Pascal Jufer',
			greeting_enabled: false,
			allow_messages_after_resolved: false,
			channel: {
				type: 'web_widget',
				website_url: `https://${domain}`,
				welcome_title: formatMessage({ id: 'chat_welcome_title' }),
				welcome_tagline: formatMessage({ id: 'chat_welcome_subtitle' }),
				widget_color: theme.colors.blue[500],
				hmac_mandatory: true,
			},
		};
		const inbox = await fetch(
			`${chatwootUrl}/api/v1/accounts/${profileResponse.account_id}/inboxes`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					api_access_token: user_token,
				},
				body: JSON.stringify(inboxBody),
			},
		);
		const inboxResponse = await inbox.json();

		const membersBody = {
			inbox_id: inboxResponse.id,
			user_ids: [profileResponse.account_id],
		};
		await fetch(
			`${chatwootUrl}/api/v1/accounts/${profileResponse.account_id}/inbox_members`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					api_access_token: user_token,
				},
				body: JSON.stringify(membersBody),
			},
		);

		// Update existing jobs
		Object.values(jobs).forEach(async (job) => {
			const identity_hash = crypto
				.createHmac('sha256', inboxResponse.hmac_token)
				.update(job.user[0])
				.digest('hex');
			await directus.items('jobs').updateOne(job.id, {
				identity_hash: identity_hash,
			});
		});

		await directus.singleton('settings').update({
			chatwoot_website_token: inboxResponse.website_token,
			chatwoot_hmac_token: inboxResponse.hmac_token,
		});

		refreshSettings();
		chatwootSetupFormModal.close();
		chatwootSetupFormModal.reset();
	}

	return (
		<>
			<Accordion flex="1" defaultIndex={[0, 1]} allowMultiple>
				<AccordionItem>
					<h2>
						<AccordionButton>
							<Box flex="1" textAlign="left" fontSize="lg" fontWeight="bold">
								Chatwoot
							</Box>
							<AccordionIcon />
						</AccordionButton>
					</h2>
					<AccordionPanel pb={4}>
						<Stack flex="1" spacing={4}>
							<Box>
								<Text fontWeight="bold">
									{formatMessage({ id: 'instance' })}
								</Text>
								<Link color="blue.500" href={chatwootUrl} isExternal>
									{chatwootUrl}
								</Link>
							</Box>
							<Box>
								<Text fontWeight="bold">{formatMessage({ id: 'status' })}</Text>
								<Box>
									<Text>
										{formatMessage({
											id: chatwootIsSetup ? 'is_set_up' : 'not_yet_set_up',
										})}
									</Text>
									<Button
										mt={4}
										colorScheme="blue"
										onClick={() => {
											chatwootSetupFormModal.open();
										}}
									>
										{formatMessage({
											id: chatwootIsSetup ? 'set_up_again' : 'set_up_now',
										})}
									</Button>
								</Box>
							</Box>
						</Stack>
					</AccordionPanel>
				</AccordionItem>
				<AccordionItem>
					<h2>
						<AccordionButton>
							<Box flex="1" textAlign="left" fontSize="lg" fontWeight="bold">
								Directus
							</Box>
							<AccordionIcon />
						</AccordionButton>
					</h2>
					<AccordionPanel pb={4}>
						<Stack flex="1" spacing={4}>
							<Box>
								<Text fontWeight="bold">
									{formatMessage({ id: 'instance' })}
								</Text>
								<Link color="blue.500" href={directusUrl} isExternal>
									{directusUrl}
								</Link>
							</Box>
						</Stack>
					</AccordionPanel>
				</AccordionItem>
			</Accordion>

			<FormModal
				state={chatwootSetupFormModal}
				id="chatwoot-setup-form"
				title={formatMessage({ id: 'set_up_chatwoot' })}
				fields={[{ name: 'user_token' }]}
			/>
		</>
	);
}
