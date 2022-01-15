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

const CustomInput = ({ value, onClick, onChange }, ref) => (
  <Input onClick={onClick} value={value} ref={ref} onChange={onChange} />
);
const DateInput = forwardRef(CustomInput);

const filterTime = (time) => {
  const currentDate = new Date();
  const selectedDate = new Date(time);
  return currentDate.getTime() < selectedDate.getTime();
};

export default function DatePicker({
  value,
  onChange,
  minDate = new Date(),
  maxDate,
  minTime,
  maxTime,
}) {
  const [loading, setLoading] = useState(true);
  const { formatMessage } = useIntl();
  const locale = LocaleStore.useState((s) => s.locale);

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
      customInput={<DateInput />}
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
}
