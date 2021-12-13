import {
  Box,
  Flex,
  Heading,
  IconButton,
  Tooltip,
  useColorMode,
} from '@chakra-ui/react';
import { MDXProvider } from '@mdx-js/react';
import { ArrowLeft } from 'iconoir-react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';

import Layout from '../components/Layout';
import Logo from '../components/Logo';
import AboutMdx from '../data/about.mdx';
import { checkSession } from '../lib/directus';

const mdxComponents = {
  h1: (props) => <Heading as="h1" size="xl" mb="2" {...props} />,
  h2: (props) => <Heading as="h2" size="lg" {...props} />,
  h3: (props) => <Heading as="h3" size="md" {...props} />,
};

export default function About() {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);
  const { colorMode } = useColorMode();

  useEffect(() => {
    checkSession().then((user) => {
      if (user) {
        setLoggedIn(true);
      }
    });
  }, []);

  return (
    <>
      <Head>
        <title>Über die Applikation - Job Application Assistant</title>
      </Head>
      <Layout>
        <Flex as="header" justify="space-between" align="center">
          <Logo />
          <Tooltip hasArrow label={loggedIn ? 'Zurück' : 'Zur Startseite'}>
            <IconButton
              as="a"
              href={loggedIn ? '/home' : '/'}
              onClick={(e) => {
                e.preventDefault();
                router.push(e.currentTarget.href);
              }}
              variant="ghost"
              colorScheme={colorMode === 'light' ? 'blackAlpha' : 'gray'}
              color={colorMode === 'light' ? 'gray.600' : 'gray.400'}
              aria-label={loggedIn ? 'Zurück' : 'Zur Startseite'}
              icon={<ArrowLeft />}
            />
          </Tooltip>
        </Flex>

        <Box as="main" mt={6} maxW="800" fontSize={{ md: 18 }}>
          <MDXProvider components={mdxComponents}>
            <AboutMdx />
          </MDXProvider>
        </Box>
      </Layout>
    </>
  );
}
