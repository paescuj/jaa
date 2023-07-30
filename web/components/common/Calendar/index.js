import 'react-big-calendar/lib/css/react-big-calendar.css';

import {
	Badge,
	Box,
	Button,
	ButtonGroup,
	Flex,
	Stack,
	Text,
	Textarea,
	useColorMode,
} from '@chakra-ui/react';
import format from 'date-fns/format';
import getDay from 'date-fns/getDay';
import isToday from 'date-fns/isToday';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import { Cancel, Check, Trash } from 'iconoir-react';
import { useEffect, useState } from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import { useIntl } from 'react-intl';

import FormModal, { useFormModal } from '@/components/common/FormModal';
import Loader from '@/components/common/Loader';
import Modal, { useModal } from '@/components/common/Modal';
import { directus } from '@/lib/directus';
import locales from '@/locales';
import { AuthStore } from '@/stores/AuthStore';
import { LocaleStore } from '@/stores/LocaleStore';

import DatePicker from './DatePicker';

// Custom calendar toolbar to match design and work in dark mode
function Toolbar({
	localizer: { messages },
	label,
	view,
	views,
	onView,
	onNavigate,
}) {
	return (
		<Flex mb={2} justifyContent="space-between" alignItems="center">
			<ButtonGroup variant="outline" isAttached>
				<Button onClick={() => onNavigate('TODAY')}>{messages.today}</Button>
				<Button onClick={() => onNavigate('PREV')}>{messages.previous}</Button>
				<Button onClick={() => onNavigate('NEXT')}>{messages.next}</Button>
			</ButtonGroup>
			<Box>{label}</Box>
			<ButtonGroup variant="outline" isAttached>
				{views.map((name) => (
					<Button
						key={name}
						isActive={name === view}
						onClick={() => onView(name)}
					>
						{messages[name]}
					</Button>
				))}
			</ButtonGroup>
		</Flex>
	);
}

const isWeekend = (date) => {
	return date.getDay() === 6 || date.getDay() === 0;
};

const minTime = new Date(new Date().setHours(7, 0, 0, 0));
const maxTime = new Date(new Date().setHours(18, 0, 0, 0));

const eventPropGetter = (event) => {
	switch (event.status) {
		case 'booked':
			return {
				style: {
					backgroundColor: 'var(--chakra-colors-green-300)',
				},
			};
		case 'declined':
			return {
				style: {
					backgroundColor: 'var(--chakra-colors-red-300)',
				},
			};
		default:
			return {
				style: {
					backgroundColor: 'var(--chakra-colors-blue-300)',
				},
			};
	}
};

export default function Calendar({ job }) {
	const { colorMode } = useColorMode();
	const { formatMessage, formatDate } = useIntl();
	const [localizer, setLocalizer] = useState();
	const [currentDate, setCurrentDate] = useState(new Date());
	const [currentView, setCurrentView] = useState('work_week');
	const [events, setEvents] = useState([]);
	const user = AuthStore.useState((s) => s.user);

	const refreshEvents = async () => {
		const filter = job
			? {
					filter: {
						job: {
							_eq: job,
						},
					},
			  }
			: {};
		try {
			setEvents((await directus.items('dates').readByQuery(filter)).data);
		} catch {
			//
		}
	};

	useEffect(() => {
		refreshEvents();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const locale = LocaleStore.useState((s) => s.locale);
	useEffect(() => {
		async function load() {
			const date_fns = (
				await import(`date-fns/locale/${locales[locale].date_fns}/index.js`)
			).default;
			const l = {
				[locale]: date_fns,
			};
			setLocalizer(
				dateFnsLocalizer({
					format,
					parse,
					startOfWeek,
					getDay,
					locales: l,
				}),
			);
		}
		load();
	}, [locale]);

	const isBlocked = (start, end) => {
		return (
			start <= new Date() ||
			isWeekend(start) ||
			events.some(
				(event) => start >= new Date(event.start) && end <= new Date(event.end),
			)
		);
	};

	const messages = {
		date: formatMessage({ id: 'date' }),
		time: formatMessage({ id: 'time' }),
		event: formatMessage({ id: 'event' }),
		work_week: formatMessage({ id: 'work_week' }),
		day: formatMessage({ id: 'day' }),
		month: formatMessage({ id: 'month' }),
		previous: formatMessage({ id: 'back' }),
		next: formatMessage({ id: 'next' }),
		yesterday: formatMessage({ id: 'yesterday' }),
		tomorrow: formatMessage({ id: 'tomorrow' }),
		today: formatMessage({ id: 'today' }),
		agenda: formatMessage({ id: 'agenda' }),
		noEventsInRange: formatMessage({ id: 'no_events_in_range' }),
		showMore: (total) => formatMessage({ id: 'show_more' }, { total: total }),
	};

	const dayPropGetter = (date) => {
		if (isToday(date) && colorMode === 'dark') {
			return {
				style: {
					backgroundColor: 'var(--chakra-colors-gray-500)',
				},
			};
		}
		if (
			(date.getMonth() === currentDate.getMonth() ||
				currentView === 'work_week') &&
			(new Date(date.toDateString()) < new Date(new Date().toDateString()) ||
				isWeekend(date))
		) {
			return {
				style: {
					backgroundColor:
						colorMode === 'light'
							? 'var(--chakra-colors-red-50)'
							: 'var(--chakra-colors-red-300)',
				},
			};
		}
	};

	// Add Event
	const addEventFormModal = useFormModal({ onSubmit: onSubmitAddEvent });
	async function onSubmitAddEvent({ start, end, remark }) {
		try {
			await directus.items('dates').createOne({
				job,
				start,
				end,
				remark,
			});

			refreshEvents();
			addEventFormModal.close();
			addEventFormModal.reset();
		} catch {
			// TODO: Display error
		}
	}
	const watchDateInputs = addEventFormModal.useWatch({
		control: addEventFormModal.control,
		name: ['start', 'end'],
	});
	useEffect(() => {
		if (watchDateInputs[0] >= watchDateInputs[1]) {
			addEventFormModal.setValue(
				'end',
				new Date(watchDateInputs[0].getTime() + 30 * 60000),
			);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [watchDateInputs]);

	// Event Detail
	const eventDetailModal = useModal();
	async function updateStatus(id, status) {
		await directus.items('dates').updateOne(id, { status: status });

		refreshEvents();
		eventDetailModal.close();
	}
	async function deleteEvent(id) {
		await directus.items('dates').deleteOne(id);

		refreshEvents();
		eventDetailModal.close();
	}

	if (!localizer) {
		return <Loader />;
	}

	return (
		<>
			<BigCalendar
				components={{ toolbar: Toolbar }}
				localizer={localizer}
				culture={locale}
				messages={messages}
				titleAccessor={(event) => formatMessage({ id: event.status })}
				startAccessor={(event) => new Date(event.start)}
				endAccessor={(event) => new Date(event.end)}
				date={currentDate}
				views={['month', 'work_week', 'day', 'agenda']}
				view={currentView}
				events={events}
				style={{ height: 500 }}
				step={15}
				timeslots={4}
				scrollToTime={new Date()}
				min={minTime}
				max={maxTime}
				onNavigate={(date) => setCurrentDate(date)}
				onView={(view) => setCurrentView(view)}
				selectable
				eventPropGetter={eventPropGetter}
				dayPropGetter={dayPropGetter}
				onSelectEvent={(event) => {
					eventDetailModal.open(event);
				}}
				onSelecting={({ start, end }) => {
					return !isBlocked(start, end);
				}}
				onSelectSlot={({ start, end }) => {
					if (!isBlocked(start, end)) {
						if (currentView === 'month') {
							setCurrentDate(start);
							setCurrentView('day');
						} else {
							addEventFormModal.setValue('start', start);
							addEventFormModal.setValue('end', end);
							addEventFormModal.open();
						}
					}
				}}
			/>

			<FormModal
				blockScrollOnMount={false}
				state={addEventFormModal}
				id="add-event"
				title={formatMessage({ id: 'submit_date_proposal' })}
				fields={[
					{
						name: 'start',
						controller: true,
						component: DatePicker,
						props: { minTime, maxTime },
					},
					{
						name: 'end',
						controller: true,
						component: DatePicker,
						props: {
							minDate: watchDateInputs[0],
							maxDate: watchDateInputs[0],
							minTime: watchDateInputs[0]
								? new Date(watchDateInputs[0].getTime() + 15 * 60000)
								: minTime,
							maxTime,
						},
					},
					{
						name: 'remark',
						options: {},
						component: Textarea,
						props: {
							placeholder: formatMessage({ id: 'message_placeholder' }),
						},
					},
				]}
				size="xl"
			/>

			<Modal
				blockScrollOnMount={false}
				state={eventDetailModal}
				title={(data) => (
					<>
						{formatMessage({ id: 'event_details' })}
						<Badge ml="2" colorScheme="blue">
							{formatMessage({
								id:
									data?.user_created === user.id
										? 'created_by_you'
										: job
										? 'created_by_applicant'
										: 'created_by_company',
							})}
						</Badge>
					</>
				)}
				content={(data) => (
					<Stack spacing={4}>
						<Box>
							<Text fontWeight="bold">{formatMessage({ id: 'status' })}</Text>
							{data?.status && formatMessage({ id: data.status })}
						</Box>
						<Box>
							<Text fontWeight="bold">{formatMessage({ id: 'start' })}</Text>
							{formatDate(data?.start, {
								year: 'numeric',
								month: 'long',
								day: 'numeric',
								hour: 'numeric',
								minute: 'numeric',
							})}
						</Box>
						<Box>
							<Text fontWeight="bold">{formatMessage({ id: 'end' })}</Text>
							{formatDate(data?.end, {
								year: 'numeric',
								month: 'long',
								day: 'numeric',
								hour: 'numeric',
								minute: 'numeric',
							})}
						</Box>
						{data?.remark && (
							<Box>
								<Text fontWeight="bold">{formatMessage({ id: 'remark' })}</Text>
								{data.remark}
							</Box>
						)}
					</Stack>
				)}
				actions={(data) => {
					if (data?.status === 'proposal') {
						if (data.user_created === user.id) {
							return [
								{
									text: formatMessage({ id: 'delete' }),
									action: () => deleteEvent(data.id),
									props: { leftIcon: <Trash />, colorScheme: 'red' },
								},
							];
						} else {
							return [
								{
									text: formatMessage({ id: 'decline' }),
									action: () => updateStatus(data.id, 'declined'),
									props: { leftIcon: <Cancel />, colorScheme: 'red' },
								},
								{
									text: formatMessage({ id: 'book' }),
									action: () => updateStatus(data.id, 'booked'),
									props: { leftIcon: <Check />, colorScheme: 'green' },
								},
							];
						}
					}
				}}
				size="xl"
			/>
		</>
	);
}
