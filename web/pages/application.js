import 'animate.css';

import env from '@beam-australia/react-env';
import {
	Box,
	Button,
	ButtonGroup,
	Code,
	Flex,
	Heading,
	IconButton,
	SimpleGrid,
	Text,
	Tooltip,
	useBreakpointValue,
	useColorMode,
} from '@chakra-ui/react';
import {
	closestCenter,
	DndContext,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from '@dnd-kit/core';
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import Editor from '@react-page/editor';
import { EyeEmpty, List, ViewGrid } from 'iconoir-react';
import Head from 'next/head';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import objectPath from 'object-path';
import { traverse } from 'object-traversal';
import { useEffect, useState } from 'react';
import { Flipped, Flipper } from 'react-flip-toolkit';
import { useIntl } from 'react-intl';

import Action from '@/components/application/Action';
import Card from '@/components/application/Card';
import Chat from '@/components/application/Chat';
import Search from '@/components/application/Search';
import Alert from '@/components/common/Alert';
import Footer from '@/components/common/Footer';
import Header from '@/components/common/Header';
import Layout from '@/components/common/Layout';
import Loader from '@/components/common/Loader';
import { directus, getBearer, url as directusUrl } from '@/lib/directus';
import { customSlateIntroduction } from '@/lib/react-page/plugins';
import { AuthStore } from '@/stores/AuthStore';
import { DocumentStore } from '@/stores/DocumentStore';

function mapOrder(source, order, key) {
	const map = order.reduce((r, v, i) => ((r[v] = i), r), {});
	return source.slice().sort((a, b) => map[a[key]] - map[b[key]]);
}

export default function Application() {
	const router = useRouter();
	const [loading, setLoading] = useState({ state: true });
	const { colorMode } = useColorMode();
	const isSmallScreen = useBreakpointValue({ base: true, lg: false });
	const { formatMessage, locale } = useIntl();

	const [job, setJob] = useState({});
	const [introductionText, setIntroductionText] = useState();
	const [chatwoot, setChatwoot] = useState(null);
	const [documents, setDocuments] = useState([]);
	const [documentsOrder, setDocumentsOrder] = useState([]);
	const results = DocumentStore.useState((s) => s.results);
	const [grid, setGrid] = useState(true);
	const [manuallyFilteredDocuments, setManuallyFilteredDocuments] = useState(
		[],
	);

	useEffect(() => {}, [introductionText]);

	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	const user = AuthStore.useState((s) => s.user);
	useEffect(() => {
		const fetchData = async () => {
			setLoading({
				state: true,
				text: formatMessage({ id: 'loading_job_application' }),
			});

			let data = [];
			try {
				// Get job
				const job = await directus.items('jobs').readOne(user.job);
				setJob(job);

				// Get settings
				const settings = await directus.singleton('settings').read();

				// Set introduction text
				let introduction_text = settings.introduction_text;
				// Populate data
				introduction_text = JSON.parse(
					JSON.stringify(introduction_text).replaceAll(
						/{Company}/g,
						job.company,
					),
				);
				introduction_text = JSON.parse(
					JSON.stringify(introduction_text).replaceAll(
						/{Position}/g,
						job.position,
					),
				);
				const paths = [];
				traverse(introduction_text, (context) => {
					const { key, value, meta } = context;
					if (key === 'type' && value === 'jobPopup') {
						paths.push(meta.nodePath);
					}
				});
				paths.forEach((path) => {
					const dataPath = path.replace(new RegExp('type$'), 'data');
					objectPath.set(introduction_text, dataPath, job);
				});
				setIntroductionText(introduction_text);

				// Set Chatwoot infos
				if (env('CHATWOOT_URL') && settings.chatwoot_website_token) {
					setChatwoot({
						url: env('CHATWOOT_URL'),
						token: settings.chatwoot_website_token,
					});
				}

				// Get documents
				const docs = await directus.items('docs').readByQuery({
					// Display job-specific documents first
					sort: ['job'],
				});
				for (const doc of docs.data) {
					const filename =
						doc.title
							.replace(/[^a-z0-9]/gi, '_')
							.replace(/_{2,}/g, '_')
							.toLowerCase() + '.pdf';
					data.push({
						id: doc.id,
						title: doc.title,
						file_light: {
							url: `${directusUrl}/assets/${doc.file[0]}`,
							httpHeaders: {
								Authorization: getBearer,
							},
							filename,
						},
						file_dark:
							doc.file_dark.length > 0
								? {
										url: `${directusUrl}/assets/${doc.file_dark[0]}`,
										httpHeaders: {
											Authorization: getBearer,
										},
										filename,
										mode: 'dark',
								  }
								: null,
					});
				}
				// Initial order
				setDocumentsOrder(data.map((document) => document.id));
				// Store data
				setDocuments(data);
				// Update index
				DocumentStore.update((s) => {
					data.map(({ id, title }) => {
						// Add document itself to index if not already there
						if (!s.index[id]) {
							s.index[id] = {};
						}
						// Add document title to index
						s.index[id].title = title;
					});
				});
				setLoading({ state: false });
			} catch (error) {
				setLoading({ state: true, error: error });
			}
		};

		// Check user
		if (!user) {
			// Go to instruction page if user is not logged in
			router.push('/');
		} else if (user.email?.startsWith('admin@')) {
			// Go to admin page if logged in user is admin
			router.push('/admin');
		} else {
			fetchData();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [user]);

	const addToManuallyFilteredDocuments = (id) =>
		setManuallyFilteredDocuments((oldArray) => [...oldArray, id]);

	function handleDragEnd(event) {
		const { active, over } = event;
		if (active.id !== over.id) {
			setDocumentsOrder((items) => {
				const oldIndex = items.indexOf(active.id);
				const newIndex = items.indexOf(over.id);
				return arrayMove(items, oldIndex, newIndex);
			});
		}
	}

	const numOfCardsToDisplay = documents.filter(
		({ id }) =>
			!manuallyFilteredDocuments.includes(id) &&
			!(results[id] && results[id].count === 0),
	).length;

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
								<Text>
									{formatMessage({ id: 'job_application_error_message' })}
								</Text>
								{loading.error.message && (
									<>
										<Text mt="4" fontWeight="bold">
											{formatMessage({ id: 'error_message' })}:
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
				<title>{job.company} - Job Application Assistant</title>
			</Head>
			<Layout>
				<Header
					title={
						<Heading as="h1" size="2xl">
							{formatMessage(
								{ id: 'company_greeting' },
								{ company: job.company },
							)}{' '}
							<span
								as="span"
								style={{ display: 'inline-block' }}
								role="img"
								aria-label={formatMessage({ id: 'waving_hand' })}
								className="animate__animated animate__tada animate__slow"
								onMouseOver={(e) => e.target.classList.add('animate__infinite')}
								onFocus={(e) => e.target.classList.add('animate__infinite')}
								onMouseOut={(e) =>
									e.target.classList.remove('animate__infinite')
								}
								onBlur={(e) => e.target.classList.remove('animate__infinite')}
							>
								👋
							</span>
						</Heading>
					}
				/>

				<Flex as="main" direction="column" flex="1">
					<Box mt={6} maxW="700" fontSize={{ md: 18 }}>
						<Editor
							cellPlugins={[customSlateIntroduction]}
							value={introductionText}
							readOnly
							lang={locale}
						/>
					</Box>

					<Box mt={6} mb={4}>
						<Flex>
							<Search maxW="300px" mr="0.5em" />
							<Flex ml="auto">
								{manuallyFilteredDocuments.length > 0 &&
									isSmallScreen === false && (
										<Button
											mr="0.5em"
											variant="outline"
											onClick={() => setManuallyFilteredDocuments([])}
											leftIcon={<EyeEmpty />}
										>
											{formatMessage({ id: 'show_hidden_documents' })}
										</Button>
									)}
								<ButtonGroup
									isAttached
									variant="outline"
									onClick={() => setGrid((prev) => !prev)}
								>
									<Tooltip hasArrow label={formatMessage({ id: 'card_view' })}>
										<IconButton
											borderRightWidth="0.5px"
											aria-label={formatMessage({ id: 'card_view' })}
											isActive={grid}
											icon={<ViewGrid />}
										/>
									</Tooltip>
									<Tooltip hasArrow label={formatMessage({ id: 'list_view' })}>
										<IconButton
											borderLeftWidth="0.5px"
											aria-label={formatMessage({ id: 'list_view' })}
											isActive={!grid}
											icon={<List />}
										/>
									</Tooltip>
								</ButtonGroup>
							</Flex>
						</Flex>
						{manuallyFilteredDocuments.length > 0 && isSmallScreen === true && (
							<Button
								mt="0.5em"
								variant="outline"
								minW={{ base: '100%', sm: '10' }}
								onClick={() => setManuallyFilteredDocuments([])}
								leftIcon={<EyeEmpty />}
							>
								{formatMessage({ id: 'show_hidden_documents' })}
							</Button>
						)}
					</Box>

					<Box flex="1" position="relative">
						{numOfCardsToDisplay === 0 && (
							<Text
								position="absolute"
								top="50%"
								left="50%"
								transform="translate(-50%, -50%)"
								textAlign="center"
							>
								{formatMessage({ id: 'no_documents_to_display' })}
							</Text>
						)}
						<Flipper
							flipKey={`${grid}-${JSON.stringify(
								manuallyFilteredDocuments,
							)}-${JSON.stringify(
								Object.keys(results).map((document) => results[document].count),
							)}-${JSON.stringify(documentsOrder)}`}
							spring="veryGentle"
							decisionData={{
								grid: grid,
							}}
							staggerConfig={{
								default: {
									reverse: grid,
								},
							}}
						>
							<Flipped flipId="list">
								<Flipped inverseFlipId="list">
									<SimpleGrid
										columns={{ base: 1, sm: grid ? 2 : 1, lg: grid ? 3 : 1 }}
										spacing={{
											base: '1em',
											md: grid && '1.5em',
											lg: grid && '2em',
										}}
										alignItems="start"
									>
										<DndContext
											sensors={sensors}
											collisionDetection={closestCenter}
											onDragEnd={handleDragEnd}
										>
											<SortableContext items={documentsOrder}>
												{mapOrder(documents, documentsOrder, 'id')
													.filter(
														({ id }) =>
															!manuallyFilteredDocuments.includes(id) &&
															!(results[id] && results[id].count === 0),
													)
													.map(({ id, title, file_light, file_dark }) => (
														<Card
															key={id}
															id={id}
															title={title}
															file={
																colorMode === 'dark' && file_dark
																	? file_dark
																	: file_light
															}
															grid={grid}
															addToFilteredDocuments={
																addToManuallyFilteredDocuments
															}
														/>
													))}
											</SortableContext>
										</DndContext>
									</SimpleGrid>
								</Flipped>
							</Flipped>
						</Flipper>
					</Box>
				</Flex>

				<Footer isSmallScreen={isSmallScreen} />
			</Layout>

			<Action chatEnabled={Boolean(chatwoot)} />

			{chatwoot && (
				<Chat
					url={chatwoot.url}
					token={chatwoot.token}
					identifier={user.id}
					name={`${job.company} - ${job.position}`}
					hash={job.identity_hash}
				/>
			)}
		</>
	);
}
