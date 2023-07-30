import 'react-datepicker/dist/react-datepicker.css';

import {
	Input,
	InputGroup,
	InputRightElement,
	Spinner,
} from '@chakra-ui/react';
import { forwardRef, useEffect, useState } from 'react';
import ReactDatePicker, {
	registerLocale,
	setDefaultLocale,
} from 'react-datepicker';
import { useIntl } from 'react-intl';

import locales from '@/locales';
import { LocaleStore } from '@/stores/LocaleStore';

const filterTime = (time) => {
	const currentDate = new Date();
	const selectedDate = new Date(time);
	return currentDate.getTime() < selectedDate.getTime();
};

const DatePicker = forwardRef(
	(
		{ value, onChange, minDate = new Date(), maxDate, minTime, maxTime },
		ref,
	) => {
		const [loading, setLoading] = useState(true);
		const { formatMessage } = useIntl();
		const locale = LocaleStore.useState((s) => s.locale);

		const CustomInput = forwardRef(({ value, onClick, onChange }, innerRef) => (
			<Input
				onClick={onClick}
				value={value}
				ref={innerRef}
				onChange={onChange}
			/>
		));
		CustomInput.displayName = 'CustomInput';

		const filterDate = (date) => {
			if (
				maxDate &&
				new Date(date.toDateString()) > new Date(minDate.toDateString())
			) {
				return false;
			}

			if (
				date.toDateString() == new Date().toDateString() &&
				new Date().getTime() > maxTime.getTime()
			) {
				return false;
			}

			return (
				new Date(date.toDateString()) >= new Date(minDate.toDateString()) &&
				date.getDay() !== 6 &&
				date.getDay() !== 0
			);
		};

		useEffect(() => {
			async function load() {
				const date_fns = (
					await import(`date-fns/locale/${locales[locale].date_fns}/index.js`)
				).default;
				registerLocale('de', date_fns);
				setDefaultLocale('de');
				setLoading(false);
			}
			load();
		}, [locale]);

		if (loading) {
			return (
				<InputGroup>
					<Input />
					<InputRightElement>
						<Spinner />
					</InputRightElement>
				</InputGroup>
			);
		}

		return (
			<ReactDatePicker
				customInput={<CustomInput ref={ref} />}
				selected={value}
				onChange={onChange}
				timeCaption={formatMessage({ id: 'time' })}
				showTimeSelect
				minTime={minTime}
				maxTime={maxTime}
				filterDate={filterDate}
				filterTime={filterTime}
				timeFormat="p"
				timeIntervals={15}
				dateFormat="Pp"
				showPopperArrow={false}
			/>
		);
	},
);

DatePicker.displayName = 'DatePicker';

export default DatePicker;
