import { Box, Heading } from '@chakra-ui/react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

import Layout from '../components/Layout';
import Loader from '../components/Loader';
import Logo from '../components/Logo';
import { checkSession } from '../lib/directus';

export default function Job() {
  const [loading, setLoading] = useState(true);
  const [checks, setChecks] = useState([]);
  const router = useRouter();

  useEffect(() => {
    const { components, isReady, query, pathname } = router;

    if (isReady && pathname === '/[[...job]]') {
      // Check session only if not redirected from other page
      if (
        !Object.prototype.hasOwnProperty.call(components, '/login') &&
        !Object.prototype.hasOwnProperty.call(components, '/home') &&
        !Object.prototype.hasOwnProperty.call(components, '/logout')
      ) {
        // Go to start page if user is already logged in
        checkSession().then(async (user) => {
          if (user) {
            const redirect = user.email?.startsWith('admin@')
              ? '/admin'
              : '/home';
            await router.push(redirect);
          } else {
            // Mark session check as done (not logged in)
            setChecks((prev) => [...prev, 'session']);
          }
        });
      } else {
        // Mark session check as done (redirected)
        setChecks((prev) => [...prev, 'session']);
      }

      // Go to login page when "job" params are present
      if (query.job?.length === 2) {
        router.push({
          pathname: '/login',
          query: {
            company: query.job[0],
            job: query.job[1],
          },
        });
      } else {
        // Otherwise show instructions
        setChecks((prev) => [...prev, 'params']);
      }
    }
  }, [router]);

  useEffect(() => {
    if (checks.includes('session') && checks.includes('params')) {
      setLoading(false);
    }
  }, [checks]);

  return (
    <>
      <Head>
        <title>Job Application Assistant</title>
      </Head>
      <Layout justify="center" align="center">
        {loading ? (
          <Loader text="Lade Seite..." />
        ) : (
          <main>
            <Logo textAlign="center" />
            <Heading
              as="h2"
              size="md"
              fontWeight="normal"
              pt={6}
              textAlign="center"
            >
              Bitte geben Sie die vollständige URL ein, um zur Bewerbung zu
              gelangen.
            </Heading>
            <Heading
              as="h3"
              size="sm"
              fontWeight="normal"
              pt={4}
              textAlign="center"
            >
              Beispiel:{' '}
              <Box as="span" fontStyle="italic">
                {window.location.origin}/firma/1
              </Box>
            </Heading>
          </main>
        )}
      </Layout>
    </>
  );
}
