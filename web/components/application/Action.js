import {
	Box,
	Button,
	IconButton,
	Menu,
	MenuButton,
	MenuItem,
	MenuList,
	Stack,
	StackDivider,
	Text,
	Textarea,
	useBreakpointValue,
	useColorMode,
	useOutsideClick,
	useToast,
	Wrap,
	WrapItem,
} from '@chakra-ui/react';
import {
	Calendar,
	ChatBubble,
	DataTransferBoth,
	MessageText,
} from 'iconoir-react';
import { useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';

import { ChatToggle } from '@/components/application/Chat';
import BigCalendar from '@/components/common/Calendar';
import FormModal, { useFormModal } from '@/components/common/FormModal';
import Modal, { useModal } from '@/components/common/Modal';
import { directus } from '@/lib/directus';
import { ActionStore } from '@/stores/ActionStore';

export function ActionToggle(props) {
	const ref = useRef();
	useEffect(() => {
		let toggle;
		if (ref.current) {
			toggle = ref.current;
			ActionStore.update((s) => {
				const toggles = new Set(s.menuToggles);
				toggles.add(toggle);
				s.menuToggles = [...toggles];
			});
		}

		return function cleanup() {
			if (ref) {
				ActionStore.update((s) => {
					s.menuToggles = s.menuToggles.filter((item) => item !== toggle);
				});
			}
		};
	}, [ref]);

	return (
		<Box
			ref={ref}
			onClick={() =>
				ActionStore.update((s) => {
					s.menuIsOpen = !s.menuIsOpen;
				})
			}
			{...props}
		>
			{props.children}
		</Box>
	);
}

export default function Action({ chatEnabled }) {
	const { colorMode } = useColorMode();
	const screenSize = useBreakpointValue({
		base: 'small',
		xl: 'large',
	});
	const toast = useToast();
	const { formatMessage, formatDate } = useIntl();

	const feedbackTexts = [
		{
			text: formatMessage({ id: 'application_getting_reviewed' }),
			color: 'green',
		},
		{ text: formatMessage({ id: 'we_will_get_back_to_you' }), color: 'blue' },
		{ text: formatMessage({ id: 'please_contact_us' }), color: 'orange' },
		{ text: formatMessage({ id: 'application_reject' }), color: 'red' },
	];

	const { menuIsOpen, menuToggles } = ActionStore.useState((s) => s);
	const menuRef = useRef();
	useOutsideClick({
		enabled: menuIsOpen,
		ref: menuRef,
		handler: (e) => {
			if (!menuToggles.includes(e.target)) {
				ActionStore.update((s) => {
					s.menuIsOpen = false;
				});
			}
		},
	});

	const [feedback, setFeedback] = useState([]);

	// Feedback Form Modal
	const feedbackFormModal = useFormModal({
		modalOptions: {
			onOpen: async () =>
				setFeedback((await directus.items('feedback').readByQuery()).data),
		},
		onSubmit: onSubmitFeedback,
	});
	async function onSubmitFeedback({ message }) {
		try {
			await directus.items('feedback').createOne({
				text: message,
			});

			feedbackFormModal.close();
			feedbackFormModal.reset();

			toast({
				title: formatMessage({ id: 'feedback_sent' }),
				status: 'success',
				duration: 4000,
				isClosable: true,
			});
		} catch {
			// TODO: Display error
		}
	}

	// Feedback History Modal
	const feedbackHistoryModal = useModal();

	// Calendar Modal
	const calendarModal = useModal();

	return (
		<>
			<Box ref={menuRef}>
				<Menu
					isOpen={menuIsOpen}
					onOpen={() =>
						ActionStore.update((s) => {
							s.menuIsOpen = true;
						})
					}
					onClose={() =>
						ActionStore.update((s) => {
							s.menuIsOpen = false;
						})
					}
					closeOnBlur={false}
				>
					<MenuButton
						as={IconButton}
						h={14}
						w={14}
						boxShadow="dark-lg"
						_focus={{ boxShadow: 'dark-lg' }}
						size="lg"
						zIndex={2}
						position="fixed"
						borderRadius="full"
						bottom={screenSize === 'small' ? 4 : 8}
						right={screenSize === 'small' ? 4 : 8}
						colorScheme={colorMode === 'light' ? 'blue' : 'gray'}
						color="white"
						aria-label="Action"
						icon={<DataTransferBoth />}
					>
						Actions
					</MenuButton>
					<MenuList>
						<MenuItem icon={<MessageText />} onClick={feedbackFormModal.open}>
							{formatMessage({ id: 'leave_feedback' })}
						</MenuItem>
						<MenuItem icon={<Calendar />} onClick={calendarModal.open}>
							{formatMessage({ id: 'schedule_job_interview' })}
						</MenuItem>
						{chatEnabled && (
							<ChatToggle as={MenuItem} icon={<ChatBubble />}>
								{formatMessage({ id: 'chat' })}
							</ChatToggle>
						)}
					</MenuList>
				</Menu>
			</Box>

			<FormModal
				state={feedbackFormModal}
				id="feedback-form"
				title={formatMessage({ id: 'leave_feedback' })}
				submitTextId="send"
				fields={[
					{ name: 'message', component: Textarea },
					{
						name: 'use_quick_text',
						register: false,
						component: Wrap,
						props: {
							children: (
								<>
									{feedbackTexts.map((text, index) => (
										<WrapItem key={index}>
											<Button
												size="sm"
												variant="outline"
												colorScheme={text.color}
												onClick={() =>
													feedbackFormModal.setValue('message', text.text)
												}
											>
												{text.text}
											</Button>
										</WrapItem>
									))}
								</>
							),
						},
					},
				]}
				secondaryActions={[
					feedback.length > 0 && {
						text: formatMessage({ id: 'show_previous_feedback' }),
						action: feedbackHistoryModal.open,
					},
				]}
				size="xl"
			/>

			<Modal
				blockScrollOnMount={false}
				state={feedbackHistoryModal}
				title={formatMessage({ id: 'previous_feedback' })}
				content={
					<Stack
						direction="column"
						divider={<StackDivider borderColor="gray.200" />}
						spacing={4}
						align="stretch"
					>
						{feedback.map(({ text, date_created }, index) => (
							<Box key={index}>
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
				}
				scrollBehavior="inside"
				size="xl"
			/>

			<Modal
				state={calendarModal}
				title={formatMessage({ id: 'schedule_job_interview' })}
				content={<BigCalendar />}
				size="4xl"
			/>
		</>
	);
}
