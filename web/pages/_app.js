import '@fontsource/quicksand/latin-400.css';
import '@fontsource/quicksand/latin-500.css';
// Unfortunately we have to import css files here to prevent having unstyled instances during page transitions
// (see https://github.com/vercel/next.js/issues/17464)
// eslint-disable-next-line import/no-unresolved
import 'swiper/css';
// eslint-disable-next-line import/no-unresolved
import 'swiper/css/navigation';
// eslint-disable-next-line import/no-unresolved
import 'swiper/css/pagination';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';

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
