import { Box, Heading, keyframes } from '@chakra-ui/react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';

import Layout from '@/components/common/Layout';
import Loader from '@/components/common/Loader';
import { directus } from '@/lib/directus';
import { AuthStore } from '@/stores/AuthStore';

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
  const { formatMessage } = useIntl();

  useEffect(() => {
    async function logout() {
      // Update store
      AuthStore.update((s) => {
        s.user = false;
      });

      window.$chatwoot?.reset();

      try {
        // Try to logout
        await directus.auth.logout();
        // Display logout message
        setLoading(false);
      } catch {
        // Most likely there was no valid session - skip logout message in this case
        await router.push('/');
      }
    }
    // Call logout function
    logout();

    // Redirect to start page after timeout
    setTimeout(() => {
      router.push('/');
    }, 6000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Head>
        <title>
          {formatMessage({ id: 'logout' })} - Job Application Assistant
        </title>
      </Head>
      <Layout justify="center" align="center">
        {loading ? (
          <Loader text={formatMessage({ id: 'loading_page' })} />
        ) : (
          <main>
            <Heading as="h1" size="xl" textAlign="center">
              {formatMessage({ id: 'logout_success_title' })}
            </Heading>
            <Heading
              as="h2"
              size="md"
              fontWeight="normal"
              textAlign="center"
              pt={4}
            >
              {formatMessage({
                id: 'logout_success_message',
              })}
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
