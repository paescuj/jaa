import { Box, Flex, IconButton, Tooltip, useColorMode } from '@chakra-ui/react';
import Editor from '@react-page/editor';
import { ArrowLeft } from 'iconoir-react';
import Head from 'next/head';
import NextLink from 'next/link';
import React, { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';

import Layout from '@/components/common/Layout';
import Loader from '@/components/common/Loader';
import Logo from '@/components/common/Logo';
import { directus } from '@/lib/directus';
import { customSlateAbout } from '@/lib/react-page/plugins';

export default function About() {
  const { colorMode } = useColorMode();
  const { formatMessage, locale } = useIntl();
  const [loading, setLoading] = useState(true);
  const [aboutText, setAboutText] = useState();

  useEffect(() => {
    const loadText = async () => {
      try {
        const settings = await directus
          .singleton('settings')
          .read({ fields: ['about_text'] });
        setAboutText(settings?.about_text);
      } catch {
        //
      }
      setLoading(false);
    };
    loadText();
  }, []);

  if (loading) {
    return (
      <>
        <Head>
          <title>
            {formatMessage({ id: 'about_application' })} - Job Application
            Assistant
          </title>
        </Head>
        <Layout justify="center" align="center">
          <Loader />
        </Layout>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>
          {formatMessage({ id: 'about_application' })} - Job Application
          Assistant
        </title>
      </Head>
      <Layout>
        <Flex as="header" justify="space-between" align="center">
          <Logo />
          <Tooltip hasArrow label={formatMessage({ id: 'to_start_page' })}>
            <IconButton
              as={NextLink}
              href="/"
              variant="ghost"
              colorScheme={colorMode === 'light' ? 'blackAlpha' : 'gray'}
              color={colorMode === 'light' ? 'gray.600' : 'gray.400'}
              aria-label={formatMessage({ id: 'to_start_page' })}
              icon={<ArrowLeft />}
            />
          </Tooltip>
        </Flex>
        <Box
          as="main"
          mt={6}
          maxW="800"
          fontSize={{ md: 18 }}
          sx={{
            'ul,ol': {
              marginTop: 'var(--chakra-space-2)',
            },
            li: {
              marginInlineStart: '1em',
            },
            'li:not(:last-child)': {
              marginBottom: 'var(--chakra-space-2)',
            },
          }}
        >
          <Editor
            cellPlugins={[customSlateAbout]}
            value={aboutText}
            readOnly
            lang={locale}
          />
        </Box>
      </Layout>
    </>
  );
}
