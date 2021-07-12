import '@fontsource/quicksand/latin-400.css';
import '@fontsource/quicksand/latin-500.css';
// Unfortunately we have to import swiper css here to prevent having unstyled instances during page transition
// (see https://github.com/vercel/next.js/issues/17464)
import 'swiper/swiper.min.css';
import 'swiper/components/navigation/navigation.min.css';
import 'swiper/components/pagination/pagination.min.css';

import { ChakraProvider } from '@chakra-ui/react';
import { AnimatePresence } from 'framer-motion';

import theme from '../theme';

function MyApp({ Component, pageProps, router }) {
  return (
    <ChakraProvider theme={theme}>
      <AnimatePresence exitBeforeEnter>
        <Component {...pageProps} key={router.route} />
      </AnimatePresence>
    </ChakraProvider>
  );
}

export default MyApp;
