import env from '@beam-australia/react-env';
import {
	Accordion,
	AccordionButton,
	AccordionIcon,
	AccordionItem,
	AccordionPanel,
	Box,
	Button,
	Collapse,
	Flex,
	Link,
	ListItem,
	Stack,
	StackDivider,
	Switch,
	Text,
	Textarea,
	UnorderedList,
	useClipboard,
	useColorMode,
	useToast,
} from '@chakra-ui/react';
import { Select } from 'chakra-react-select';
import crypto from 'crypto';
import {
	AddPage,
	Calendar,
	Lock,
	MessageText,
	Plus,
	Trash,
} from 'iconoir-react';
import generatePassword from 'omgopass';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';

import BigCalendar from '@/components/common/Calendar';
import FormModal, { useFormModal } from '@/components/common/FormModal';
import JobPopup from '@/components/common/JobPopup';
import Modal, { useModal } from '@/components/common/Modal';
import { useDebounce } from '@/lib/debounce';
import { directus } from '@/lib/directus';
import locales from '@/locales';

import Popover from './Popover';
import Preview from './Preview';

function getAccessEmail(company, jobId) {
	const transformedCompany = company.toLowerCase().replace(/\s/g, '-');
	const domain = env('DOMAIN') || window.location.host;
	return `${transformedCompany}-${jobId}@${domain}`;
}

function getAccessLink(company, jobId) {
	const transformedCompany = company.toLowerCase().replace(/\s/g, '-');
	return `${window.location.origin}/${transformedCompany}/${jobId}`;
}

export default function Jobs({
	jobs,
	refreshJobs,
	docs,
	refreshDocs,
	dates,
	settings,
}) {
	const { formatMessage, formatDate, locale } = useIntl();
	const toast = useToast();

	// Close all toasts when leaving page
	useEffect(() => {
		return () => {
			toast.closeAll();
		};
	}, [toast]);

	// Jobs
	const newJobFormModal = useFormModal({ onSubmit: onSubmitNewJob });
	const CopyCodeButton = ({ code }) => {
		const { colorMode } = useColorMode();
		const { hasCopied, onCopy } = useClipboard(code);

		return (
			<Button
				onClick={onCopy}
				ml={2}
				size="sm"
				variant="outline"
				colorScheme={colorMode === 'dark' && 'black'}
			>
				{formatMessage({ id: hasCopied ? 'copied' : 'copy' })}
			</Button>
		);
	};
	async function onSubmitNewJob({
		company,
		position,
		job_advertisement_link,
		language,
	}) {
		// Validate link
		try {
			new URL(job_advertisement_link);
		} catch {
			newJobFormModal.setError('job_advertisement_link', {
				type: 'manual',
				message: formatMessage({ id: 'link_invalid' }),
			});
			return false;
		}

		try {
			// Create job
			const job = await directus.items('jobs').createOne({
				company: company,
				position: position,
				link: job_advertisement_link,
			});

			// Create associated user
			const role = await directus.roles.readByQuery({
				search: 'Companies',
			});
			let code = generatePassword();
			const user = await directus.users.createOne({
				email: getAccessEmail(company, job.id),
				password: code,
				role: role.data[0].id,
				job: job.id,
				language: language
					? language.value
					: `${locale}-${locales[locale].region}`,
			});

			// Generate Chatwoot token
			if (settings.chatwoot_hmac_token) {
				const identity_hash = crypto
					.createHmac('sha256', settings.chatwoot_hmac_token)
					.update(user.id)
					.digest('hex');
				await directus.items('jobs').updateOne(job.id, {
					identity_hash: identity_hash,
				});
			}

			// Refresh jobs, close and reset modal
			refreshJobs();
			newJobFormModal.close();
			newJobFormModal.reset();

			// Show access data
			toast({
				title: formatMessage({ id: 'job_added' }),
				description: (
					<>
						{formatMessage({ id: 'access_data_are' })}:
						<br />
						<span style={{ fontWeight: 'bold' }}>
							{formatMessage({ id: 'link' })}:
						</span>{' '}
						<Link href={getAccessLink(company, job.id)} isExternal>
							{getAccessLink(company, job.id)}
						</Link>
						<br />
						<Flex align="center">
							<span>
								<span style={{ fontWeight: 'bold' }}>
									{formatMessage({ id: 'code' })}:
								</span>{' '}
								{code}
							</span>
							<CopyCodeButton code={code} />
						</Flex>
					</>
				),
				status: 'success',
				duration: 20000,
				isClosable: true,
			});
		} catch (error) {
			toast({
				title: formatMessage({ id: 'error_message_title' }),
				description: error.message,
				status: 'error',
				duration: 9000,
				isClosable: true,
			});
		}
	}
	// Set new access code
	async function newCode(userId) {
		const code = generatePassword();
		directus.users.updateOne(userId, { password: code });

		const codeToast = () => {
			toast({
				id: 'new-code',
				title: formatMessage({ id: 'new_access_code' }),
				description: (
					<Flex align="center">
						{code}
						<CopyCodeButton code={code} />
					</Flex>
				),
				status: 'success',
				duration: 15000,
				isClosable: true,
			});
		};

		// If toast already exists, close it and create a new one
		if (toast.isActive('new-code')) {
			toast.close('new-code');
			// Timeout required, otherwise new toast gets closed as well
			setTimeout(() => codeToast(), 100);
		} else {
			codeToast();
		}
	}
	async function updateJobSent(jobId, enabled) {
		const value = enabled ? new Date() : null;
		await directus.items('jobs').updateOne(jobId, { sent: value });
		refreshJobs();
	}
	async function deleteJob(jobId) {
		await directus.items('jobs').deleteOne(jobId);
		refreshJobs();
	}

	// Docs
	const newDocFormModal = useFormModal({
		onSubmit: onSubmitNewDoc,
		resetDataOnClose: true,
		modalOptions: { clearDataOnClose: true },
	});
	async function onSubmitNewDoc({ title, file }) {
		// Upload PDF file
		const formData = new FormData();
		formData.append('title', title);
		formData.append('file', await file[0]);
		const filesResponse = await directus.files.createOne(formData);

		// Create / update doc entry
		if (!newDocFormModal.data?.doc) {
			await directus.items('docs').createOne({
				title: title,
				file: [filesResponse.id],
				global: false,
				job: newDocFormModal.data.job,
			});
		} else {
			await directus.items('docs').updateOne(newDocFormModal.data.doc, {
				file_dark: [filesResponse.id],
			});
		}

		refreshDocs();
		newDocFormModal.close();
	}
	async function deleteDoc(docId) {
		await directus.items('docs').deleteOne(docId);
		refreshDocs();
	}

	// Notes
	const [notes, setNotes] = useState({});
	const [notesSaved, setNotesSaved] = useState(false);
	const debouncedNotes = useDebounce(notes, 400);
	useEffect(() => {
		async function updateNotes() {
			try {
				await directus.items('jobs').updateOne(debouncedNotes.jobId, {
					notes: debouncedNotes.value,
				});
				setNotesSaved(true);
			} catch {
				setNotesSaved('error');
			}
		}
		if (debouncedNotes.jobId) {
			updateNotes();
		}
	}, [debouncedNotes]);

	// Feedback
	const feedbackModal = useModal();

	// Dates
	const calendarModal = useModal();

	return (
		<>
			<Flex direction={{ base: 'column', sm: 'row' }}>
				{jobs.length === 0 ? (
					<Text flex="1">{formatMessage({ id: 'no_jobs_yet' })}</Text>
				) : (
					<Accordion flex="1" allowMultiple>
						{jobs.map((job) => (
							<AccordionItem key={job.id}>
								<h2>
									<AccordionButton>
										<Flex flex="1" wrap="wrap">
											<Preview
												name={job.company}
												previewUrl={job.preview[0]}
												type="avatar"
											/>
											<Box
												ml="3"
												alignSelf="center"
												fontSize="lg"
												textAlign="left"
											>
												<Text fontWeight="bold" lineHeight="1">
													{job.company}
												</Text>
												<Text>{job.position}</Text>
											</Box>
											<Box
												flex="1"
												textAlign="right"
												mr="1"
												fontSize="sm"
												alignSelf="center"
											>
												<Text>
													{formatDate(job.date_created, {
														year: 'numeric',
														month: 'long',
														day: 'numeric',
													})}
												</Text>
											</Box>
										</Flex>
										<AccordionIcon />
									</AccordionButton>
								</h2>
								<AccordionPanel pb={4}>
									<Flex wrap="wrap">
										<Stack flex="1" spacing={4}>
											<Box>
												<Text fontWeight="bold">
													{formatMessage({ id: 'job_advertisement' })}
												</Text>
												<JobPopup link={job.link} previewId={job.preview[0]}>
													<Text color="blue.500">{job.link}</Text>
												</JobPopup>
											</Box>
											<Box>
												<Text fontWeight="bold">
													{formatMessage({ id: 'documents' })}
												</Text>
												{docs.filter((doc) => doc.job === job.id).length > 0 ? (
													<UnorderedList>
														{docs
															.filter((doc) => doc.job === job.id)
															.map((doc) => (
																<ListItem key={doc.id}>
																	<Popover
																		header={doc.title}
																		body={
																			<>
																				<Preview
																					name={doc.title}
																					previewUrl={doc.preview[0]}
																					type="image"
																				/>
																				<Button
																					mt={2}
																					size="sm"
																					colorScheme="blue"
																					disabled={doc.file_dark.length > 0}
																					onClick={() => {
																						newDocFormModal.setValue(
																							'title',
																							doc.title,
																						);
																						newDocFormModal.open({
																							job: job.id,
																							title: `${job.company} - ${job.position}`,
																							doc: doc.id,
																						});
																					}}
																				>
																					{formatMessage({
																						id: 'add_dark_variant',
																					})}
																				</Button>
																			</>
																		}
																		actions={[
																			{
																				confirmation: {
																					body: formatMessage({
																						id: 'remove_document_confirm',
																					}),
																					onConfirm: () => deleteDoc(doc.id),
																				},
																				text: formatMessage({
																					id: 'remove_document',
																				}),
																				props: {
																					colorScheme: 'red',
																				},
																			},
																		]}
																	>
																		<Button variant="link" minWidth="0">
																			{doc.title}
																		</Button>
																	</Popover>
																</ListItem>
															))}
													</UnorderedList>
												) : (
													<Text>
														{formatMessage({
															id: 'no_documents_yet',
														})}
													</Text>
												)}
												<Button
													mt="2"
													size="sm"
													leftIcon={<AddPage />}
													onClick={() => {
														newDocFormModal.open({
															job: job.id,
															title: `${job.company} - ${job.position}`,
														});
													}}
												>
													{formatMessage({ id: 'add_document' })}
												</Button>
											</Box>
											<Box>
												<Text fontWeight="bold">
													{formatMessage({ id: 'status' })}
												</Text>
												{formatMessage({ id: 'application_sent' })}:{' '}
												<Switch
													defaultChecked={job.sent}
													onChange={(e) =>
														updateJobSent(job.id, e.currentTarget.checked)
													}
												/>
												<Collapse in={job.sent}>
													{job.sent &&
														formatMessage(
															{ id: 'sent_on_date' },
															{ sentDate: new Date(job.sent) },
														)}
												</Collapse>
											</Box>
											<Box>
												<Text fontWeight="bold">
													{formatMessage({ id: 'feedback' })}
												</Text>
												<Text>
													{formatMessage(
														{
															id: 'feedback_count',
														},
														{ count: job.feedback.length },
													)}
												</Text>
												{job.feedback.length > 0 && (
													<Button
														mt="2"
														size="sm"
														leftIcon={<MessageText />}
														onClick={() => {
															feedbackModal.open(job.id);
														}}
													>
														{formatMessage({ id: 'show_feedback' })}
													</Button>
												)}
											</Box>
											<Box>
												<Text fontWeight="bold">
													{formatMessage({
														id: 'dates',
													})}
												</Text>
												<Text>
													{formatMessage(
														{
															id: 'dates_count',
														},
														{
															count: dates.filter((date) => date.job === job.id)
																.length,
														},
													)}
												</Text>
												<Button
													mt="2"
													size="sm"
													leftIcon={<Calendar />}
													onClick={() => {
														calendarModal.open(job.id);
													}}
												>
													{formatMessage({ id: 'manage_dates' })}
												</Button>
											</Box>
											<Box>
												<Text fontWeight="bold">
													{formatMessage({ id: 'personal_notes' })}
												</Text>
												<Textarea
													maxW="500"
													defaultValue={job.notes}
													onChange={(e) => {
														setNotesSaved(false);
														setNotes({
															jobId: job.id,
															value: e.target.value,
														});
													}}
													placeholder={formatMessage({
														id: 'no_notes_entered_yet',
													})}
													_placeholder={{
														color: 'gray.500',
													}}
													focusBorderColor={
														notes.jobId === job.id && notesSaved
															? 'green.500'
															: notesSaved === 'error' && 'red.500'
													}
												/>
											</Box>
											<Box>
												<Text fontWeight="bold">
													{formatMessage({ id: 'access_link' })}
												</Text>
												<Link
													color="blue.500"
													href={getAccessLink(job.company, job.id)}
													isExternal
												>
													{getAccessLink(job.company, job.id)}
												</Link>
												<Box mt="2">
													<Popover
														mode="confirmation"
														onConfirm={() => newCode(job.user)}
														body={formatMessage({
															id: 'generate_access_code_confirm',
														})}
													>
														<Button size="sm" leftIcon={<Lock />}>
															{formatMessage({
																id: 'generate_access_code',
															})}
														</Button>
													</Popover>
												</Box>
											</Box>
										</Stack>
										<Popover
											mode="confirmation"
											onConfirm={() => deleteJob(job.id)}
											body={formatMessage({
												id: 'remove_job_confirm',
											})}
										>
											<Button
												mt={{ base: 4, sm: 0 }}
												size="sm"
												leftIcon={<Trash />}
												colorScheme="red"
											>
												{formatMessage({ id: 'remove_job' })}
											</Button>
										</Popover>
									</Flex>
								</AccordionPanel>
							</AccordionItem>
						))}
					</Accordion>
				)}
				<Button
					mt={{ base: 4, sm: 0 }}
					ml={{ base: 0, sm: 4 }}
					leftIcon={<Plus />}
					colorScheme="blue"
					onClick={newJobFormModal.open}
				>
					{formatMessage({ id: 'add_job' })}
				</Button>
			</Flex>

			<FormModal
				state={newJobFormModal}
				id="new-job-form"
				title={formatMessage({ id: 'add_job' })}
				fields={[
					{ name: 'company' },
					{ name: 'position' },
					{ name: 'job_advertisement_link' },
					{
						name: 'language',
						options: {},
						controller: true,
						component: Select,
						props: {
							defaultValue: {
								label: locales[locale].title,
								value: `${locale}-${locales[locale].region}`,
							},
							options: Object.entries(locales).map(([l, v]) => ({
								label: v.title,
								value: `${l}-${v.region}`,
							})),
						},
					},
				]}
			/>

			<FormModal
				state={newDocFormModal}
				id="new-doc-form"
				title={(data) =>
					formatMessage({ id: 'add_document_to_job' }, { job: data.title })
				}
				fields={(data) => [
					{
						name: 'title',
						props: {
							placeholder: formatMessage({ id: 'document_title_placeholder' }),
							disabled: data?.doc,
						},
					},
					{
						name: 'file',
						props: {
							type: 'file',
							accept: 'application/pdf',
							sx: {
								'::file-selector-button': {
									height: '100%',
								},
							},
						},
					},
				]}
				size="xl"
			/>

			<Modal
				state={feedbackModal}
				title={formatMessage({ id: 'feedback' })}
				content={(data) => (
					<Stack
						direction="column"
						divider={<StackDivider borderColor="gray.200" />}
						spacing={4}
						align="stretch"
					>
						{jobs &&
							jobs
								.find((job) => job.id === data)
								.feedback.map(({ id, text, date_created }) => (
									<Box key={id}>
										<Text fontWeight="bold">
											{formatDate(date_created, {
												year: 'numeric',
												month: 'long',
												day: 'numeric',
												hour: 'numeric',
												minute: 'numeric',
											})}
										</Text>
										{text}
									</Box>
								))}
					</Stack>
				)}
				scrollBehavior="inside"
				size="xl"
			/>

			<Modal
				state={calendarModal}
				title={formatMessage({ id: 'schedule_job_interview' })}
				content={(data) => <BigCalendar job={data} />}
				size="4xl"
			/>
		</>
	);
}
