import { Store } from 'pullstate';

import { defaultLocale } from '@/locales';

export const LocaleStore = new Store({
  locale: defaultLocale,
});
