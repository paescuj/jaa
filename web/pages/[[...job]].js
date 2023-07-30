import { Heading } from '@chakra-ui/react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';

import Layout from '@/components/common/Layout';
import Loader from '@/components/common/Loader';
import Logo from '@/components/common/Logo';
import { AuthStore } from '@/stores/AuthStore';

export default function Job() {
	const [loading, setLoading] = useState(true);
	const { formatMessage } = useIntl();

	const user = AuthStore.useState((s) => s.user);
	const router = useRouter();
	useEffect(() => {
		// Check user
		if (user) {
			// Redirect if user is already logged in
			const redirect = user.email?.startsWith('admin@')
				? '/admin'
				: '/application';
			router.push(redirect);
		} else {
			// Check query
			const { isReady, query } = router;
			if (isReady) {
				// Go to login page when "job" params are present
				if (query.job?.length === 2) {
					router.push({
						pathname: '/login',
						query: {
							company: query.job[0],
							job: query.job[1],
						},
					});
				} else if (!query.company || !query.job) {
					// Show instructions when no params are present
					setLoading(false);
				}
			}
		}
	}, [user, router]);

	return (
		<>
			<Head>
				<title>Job Application Assistant</title>
			</Head>
			<Layout justify="center" align="center">
				{loading ? (
					<Loader text={formatMessage({ id: 'loading_page' })} />
				) : (
					<main>
						<Logo textAlign="center" />
						<Heading
							as="h2"
							size="md"
							fontWeight="normal"
							pt={6}
							textAlign="center"
						>
							{formatMessage({
								id: 'instruction_title',
							})}
						</Heading>
						<Heading
							as="h3"
							size="sm"
							fontWeight="normal"
							pt={4}
							textAlign="center"
						>
							{formatMessage(
								{
									id: 'instruction_subtitle',
								},
								{
									i: (chunks) => <i>{chunks}</i>,
									base_url: window.location.origin,
								},
							)}
						</Heading>
					</main>
				)}
			</Layout>
		</>
	);
}
