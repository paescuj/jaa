import { ColorModeScript } from '@chakra-ui/react';
import NextDocument, { Head, Html, Main, NextScript } from 'next/document';
import Script from 'next/script';

import theme from '@/theme';

export default class Document extends NextDocument {
  render() {
    return (
      <Html>
        <Head>
          <link rel="apple-touch-icon-precomposed" href="/favicon-180.png" />
        </Head>
        <body>
          <ColorModeScript initialColorMode={theme.config.initialColorMode} />
          <Main />
          <NextScript />
          <Script strategy="beforeInteractive" src="/__ENV.js"></Script>
        </body>
      </Html>
    );
  }
}
