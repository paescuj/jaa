// Unfortunately we have to import some css files here to prevent having unstyled elements during page transitions
// (see https://github.com/vercel/next.js/issues/17464)
import '@fontsource/quicksand/latin-400.css';
import '@fontsource/quicksand/latin-500.css';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';

import { ChakraProvider, extendTheme, useColorMode } from '@chakra-ui/react';
import { mode } from '@chakra-ui/theme-tools';
import { AnimatePresence } from 'framer-motion';
import Script from 'next/script';
import { useEffect, useState } from 'react';
import { IntlProvider } from 'react-intl';

import Layout from '@/components/common/Layout';
import Loader from '@/components/common/Loader';
import {
  convertToHex,
  defaultBackgroundColor,
  isHighBrightness,
} from '@/lib/color';
import { checkSession, directus } from '@/lib/directus';
import locales, { defaultLocale } from '@/locales';
import { AuthStore } from '@/stores/AuthStore';
import { LocaleStore } from '@/stores/LocaleStore';
import { ThemeStore } from '@/stores/ThemeStore';
import theme from '@/theme';

function Theme({ children }) {
  const { setColorMode } = useColorMode();
  const themeStore = ThemeStore.useState((s) => s.theme);
  useEffect(() => {
    if (themeStore?.backgroundColor) {
      setColorMode(
        isHighBrightness(themeStore.backgroundColor) ? 'light' : 'dark'
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeStore]);

  return children;
}

function MyApp({ Component, pageProps, router }) {
  const [checks, setChecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dynamicTheme, setDynamicTheme] = useState(theme);

  const themeStore = ThemeStore.useState((s) => s.theme);
  useEffect(() => {
    if (themeStore?.backgroundColor) {
      const styles = {
        global: (props) => ({
          body: {
            bg: isHighBrightness(themeStore.backgroundColor)
              ? mode(
                  convertToHex(themeStore.backgroundColor),
                  'gray.700'
                )(props)
              : convertToHex(themeStore.backgroundColor),
          },
        }),
      };
      setDynamicTheme(extendTheme({ styles }, theme));
    }
  }, [themeStore]);

  // Load theme & user
  useEffect(() => {
    const loadTheme = async () => {
      // Fallback theme
      let customTheme = { backgroundColor: defaultBackgroundColor };
      try {
        const settings = await directus
          .singleton('settings')
          .read({ fields: ['theme'] });
        if (settings.theme?.backgroundColor) {
          customTheme = settings.theme;
        }
      } catch {
        // Ignore error
      }
      ThemeStore.update((s) => {
        s.theme = customTheme;
      });
    };

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

    loadTheme();
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
      <Script strategy="beforeInteractive" src="/__ENV.js"></Script>
      <ChakraProvider theme={dynamicTheme}>
        <Theme>
          <AnimatePresence exitBeforeEnter>
            {loading ? (
              <Layout justify="center" align="center">
                <Loader />
              </Layout>
            ) : (
              <IntlProvider
                otherKey={locale}
                locale={locale}
                defaultLocale={defaultLocale}
                messages={messages}
              >
                <Component {...pageProps} key={router.route} />
              </IntlProvider>
            )}
          </AnimatePresence>
        </Theme>
      </ChakraProvider>
    </>
  );
}

export default MyApp;
