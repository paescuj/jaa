// Unfortunately we have to import some css files here to prevent having unstyled elements during page transitions
// (see https://github.com/vercel/next.js/issues/17464)
import '@fontsource/quicksand/latin-400.css';
import '@fontsource/quicksand/latin-500.css';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';

import { ChakraProvider } from '@chakra-ui/react';
import { AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { IntlProvider } from 'react-intl';

import Layout from '@/components/common/Layout';
import Loader from '@/components/common/Loader';
import { checkSession } from '@/lib/directus';
import locales, { defaultLocale } from '@/locales';
import { AuthStore } from '@/stores/AuthStore';
import { LocaleStore } from '@/stores/LocaleStore';
import theme from '@/theme';

function MyApp({ Component, pageProps, router }) {
  const [checks, setChecks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load user
  useEffect(() => {
    const loadUser = async () => {
      const user = await checkSession();
      let language;
      if (user) {
        // Update store
        AuthStore.update((s) => {
          s.user = user;
        });
        // Get language from user
        language = user.language;
      }
      // If language has not been retrieved from user, try to get it from the browser
      language = (
        language ??
        (navigator.language || navigator.userLanguage)
      )?.split(/[-_]/)[0];
      // Update store if language is available
      if (language in locales) {
        LocaleStore.update((s) => {
          s.locale = language;
        });
      }
      // Mark session check as done
      setChecks((prev) => [...prev, 'session']);
    };

    loadUser();
  }, []);

  // Load locale
  const locale = LocaleStore.useState((s) => s.locale);
  const [messages, setMessages] = useState({});
  useEffect(() => {
    async function load() {
      setMessages((await import(`@/locales/${locale}.json`)).default);

      // Mark locale check as done
      setChecks((prev) => [...prev, 'locale']);
    }
    load();
  }, [locale]);

  // Display page once all checks are done
  useEffect(() => {
    if (checks.includes('locale') && checks.includes('session')) {
      setLoading(false);
    }
  }, [checks]);

  return (
    <>
      <ChakraProvider theme={theme}>
        <IntlProvider
          otherKey={locale}
          locale={locale}
          defaultLocale={defaultLocale}
          messages={messages}
        >
          <AnimatePresence mode="wait">
            {loading ? (
              <Layout justify="center" align="center">
                <Loader />
              </Layout>
            ) : (
              <Component {...pageProps} key={router.route} />
            )}
          </AnimatePresence>
        </IntlProvider>
      </ChakraProvider>
    </>
  );
}

export default MyApp;
