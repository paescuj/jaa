import { Box, Heading, keyframes } from '@chakra-ui/react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

import Layout from '../components/Layout';
import Loader from '../components/Loader';
import { directus } from '../lib/directus';

const dots = keyframes`
  0% {
    content: ".";
  }
  33% {
    content: "..";
  }
  66% {
    content: "...";
  }
`;

export default function Logout() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function logout() {
      try {
        // Try to logout
        await directus.auth.logout();
        // Display logout message
        setLoading(false);
      } catch {
        // Most likely there was no valid session
        // Skip logout message in that case
        await router.push('/');
      }
    }
    // Call logout function
    logout();

    // Redirect to start page after 6 sec
    setTimeout(() => {
      router.push('/');
    }, 6000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Head>
        <title>Abmeldung - Job Application Assistant</title>
      </Head>
      <Layout justify="center" align="center">
        {loading ? (
          <Loader text="Lade Seite..." />
        ) : (
          <main>
            <Heading as="h1" size="xl" textAlign="center">
              Vielen Dank für Ihren Besuch!
            </Heading>
            <Heading
              as="h2"
              size="md"
              fontWeight="normal"
              textAlign="center"
              pt={4}
            >
              Sie wurden erfolgreich abgemeldet und werden in Kürze umgeleitet
              <Box
                as="span"
                _after={{
                  display: 'inline-block',
                  textAlign: 'left',
                  width: '3ch',
                  content: '"."',
                  animation: `${dots} 1.5s infinite`,
                }}
              />
            </Heading>
          </main>
        )}
      </Layout>
    </>
  );
}
