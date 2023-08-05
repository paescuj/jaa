import {
	Box,
	Code,
	Tab,
	TabList,
	TabPanel,
	TabPanels,
	Tabs,
	Text,
} from '@chakra-ui/react';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';

import Alert from '@/components/common/Alert';
import Footer from '@/components/common/Footer';
import Header from '@/components/common/Header';
import Layout from '@/components/common/Layout';
import Loader from '@/components/common/Loader';
import Logo from '@/components/common/Logo';
import { directus, subscribe, unsubscribe } from '@/lib/directus';
import { AuthStore } from '@/stores/AuthStore';

const Jobs = dynamic(() => import('@/components/admin/Jobs'));
const Documents = dynamic(() => import('@/components/admin/Documents'));
const Customization = dynamic(() => import('@/components/admin/Customization'));
const Settings = dynamic(() => import('@/components/admin/Settings'));

export default function Admin() {
	const [loading, setLoading] = useState({ state: true });
	const router = useRouter();
	const { formatMessage } = useIntl();

	// Tabs
	const [tabIndex, setTabIndex] = useState(0);
	useEffect(() => {
		if (router.query.tab) {
			setTabIndex(parseInt(router.query.tab));
		}
	}, [router.query.tab]);

	function changeTab(index) {
		router.push(
			{
				query: { tab: index },
			},
			undefined,
			{ shallow: true },
		);
	}

	const [jobs, setJobs] = useState([]);
	const [docs, setDocs] = useState([]);
	const [dates, setDates] = useState([]);
	const [settings, setSettings] = useState({});
	const user = AuthStore.useState((s) => s.user);

	async function getJobs() {
		const jobs = await directus
			.items('jobs')
			.readByQuery({ fields: ['*', 'feedback.*'] });
		setJobs(jobs.data);
	}

	async function getDocs() {
		const docs = await directus.items('docs').readByQuery({
			sort: ['job'],
		});
		setDocs(docs.data);
	}

	async function getSettings() {
		const settings = await directus.singleton('settings').read();
		setSettings(settings);
	}

	// Load data
	useEffect(() => {
		const load = async () => {
			try {
				setLoading({
					state: true,
					text: formatMessage({ id: 'loading_data' }),
				});

				await getJobs();
				await getDocs();

				const dates = await directus.items('dates').readByQuery();
				setDates(dates.data);

				await getSettings();
				setLoading({ state: false });
			} catch (error) {
				setLoading({ state: true, error: error });
			}
		};

		// Check user
		if (!user) {
			// Go to login page if user is not logged in
			router.push({
				pathname: '/login',
				query: { admin: true },
			});
		} else if (!user.email?.startsWith('admin@')) {
			// Go to home page if logged in user is not admin
			router.push('/application');
		} else {
			load();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [user]);

	// Subscribe to updates
	useEffect(() => {
		if (!loading.state && !loading.error) {
			subscribe(
				'admin-feedback-create',
				{ collection: 'feedback', event: 'create' },
				([feedback]) =>
					setJobs((prevJobs) => {
						const jobs = [...prevJobs];
						const job = jobs.find((job) => job.id === feedback.job);
						job.feedback = [...job.feedback, feedback];
						return jobs;
					}),
			);

			subscribe(
				'admin-dates-create',
				{ collection: 'dates', event: 'create' },
				(date) =>
					setDates((prevDates) => {
						return [...prevDates, ...date];
					}),
			);

			subscribe(
				'admin-dates-update',
				{ collection: 'dates', event: 'update' },
				(updatedDates) =>
					setDates((prevDates) => {
						const dates = [...prevDates];
						for (const updatedDate of updatedDates) {
							const index = dates.findIndex(
								(date) => date.id === updatedDate.id,
							);
							dates[index] = updatedDate;
						}
						return dates;
					}),
			);

			subscribe(
				'admin-dates-delete',
				{ collection: 'dates', event: 'delete' },
				(deletedDates) =>
					setDates((prevDates) => {
						return prevDates.filter((date) => !deletedDates.includes(date.id));
					}),
			);

			return () => {
				unsubscribe('admin-feedback-create');
				unsubscribe('admin-dates-create');
				unsubscribe('admin-dates-update');
				unsubscribe('admin-dates-delete');
			};
		}
	}, [loading]);

	if (loading.state) {
		return (
			<>
				<Head>
					<title>Job Application Assistant</title>
				</Head>
				<Layout justify="center" align="center">
					<Loader text={loading.text} displayText={loading.text} />
				</Layout>
				{loading.error && (
					<Alert
						title={formatMessage({ id: 'error_message_title' })}
						message={
							<>
								<Text>{formatMessage({ id: 'admin_error_message' })}</Text>
								{loading.error.message && (
									<>
										<Text mt="4" fontWeight="bold">
											{formatMessage({ id: 'error_message' })}
										</Text>
										<Code colorScheme="red">{loading.error.message}</Code>
									</>
								)}
							</>
						}
						actions={[
							{
								text: formatMessage({ id: 'reload_page' }),
								leastDestructive: true,
								action: () => router.reload(),
							},
							{
								text: formatMessage({ id: 'logout' }),
								props: { as: NextLink, href: '/logout', colorScheme: 'red' },
							},
						]}
					/>
				)}
			</>
		);
	}

	return (
		<>
			<Head>
				<title>
					{formatMessage({ id: 'admin' })} - Job Application Assistant
				</title>
			</Head>
			<Layout>
				<Header title={<Logo />} />
				<Box as="main" flex="1" mt={10}>
					<Tabs
						index={tabIndex}
						onChange={(index) => changeTab(index)}
						isLazy
						lazyBehavior="keepMounted"
					>
						<TabList>
							<Tab>{formatMessage({ id: 'jobs' })}</Tab>
							<Tab>{formatMessage({ id: 'general_documents' })}</Tab>
							<Tab>{formatMessage({ id: 'customization' })}</Tab>
							<Tab>{formatMessage({ id: 'settings_and_information' })}</Tab>
						</TabList>
						<TabPanels>
							<TabPanel>
								<Jobs
									jobs={jobs}
									refreshJobs={getJobs}
									docs={docs}
									refreshDocs={getDocs}
									dates={dates}
									settings={settings}
								/>
							</TabPanel>
							<TabPanel>
								<Documents docs={docs} refreshDocs={getDocs} />
							</TabPanel>
							<TabPanel>
								<Customization settings={settings} />
							</TabPanel>
							<TabPanel>
								<Settings
									jobs={jobs}
									settings={settings}
									refreshSettings={getSettings}
								/>
							</TabPanel>
						</TabPanels>
					</Tabs>
				</Box>
				<Footer />
			</Layout>
		</>
	);
}
