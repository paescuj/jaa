import {
  Button,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Heading,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  useDisclosure,
} from '@chakra-ui/react';
import { EyeEmpty, EyeOff } from 'iconoir-react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import Layout from '../components/Layout';
import Loader from '../components/Loader';
import { checkSession, directus } from '../lib/directus';

export default function Login() {
  const [checks, setChecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const { formState, handleSubmit, register, setError } = useForm();
  const { isOpen, onToggle } = useDisclosure();
  const inputRef = useRef(null);
  const { ref, ...rest } = register('code', {
    required: 'Zugangscode darf nicht leer sein',
  });
  const router = useRouter();

  useEffect(() => {
    const { components, isReady, query, pathname } = router;

    if (isReady && pathname === '/login') {
      // Check session only if not redirected from other page
      if (
        !Object.prototype.hasOwnProperty.call(components, '/[[...job]]') &&
        !Object.prototype.hasOwnProperty.call(components, '/admin')
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

      // Go to instruction page if params are missing
      if ((query.company && query.job) || query.admin) {
        setChecks((prev) => [...prev, 'params']);
      } else {
        router.push('/');
      }
    }
  }, [router]);

  // Display page once all checks have passed
  useEffect(() => {
    if (checks.includes('session') && checks.includes('params')) {
      setLoading(false);
    }
  }, [checks]);

  // Try to login with submitted code
  async function onSubmit({ code }) {
    const { company, job, admin } = router.query;
    // Use domain from env or current domain for users email address
    const host = process.env.NEXT_PUBLIC_DOMAIN || window.location.host;

    await directus.auth
      .login({
        email: admin ? `admin@${host}` : `${company}-${job}@${host}`,
        password: code,
      })
      .then(async () => {
        await router.push({
          pathname: admin ? '/admin' : '/home',
        });
      })
      .catch((error) => {
        const message = {
          'Network Error': 'Keine Verbindung zum Server',
          'Invalid user credentials.': 'Zugangscode oder URL ist ungültig',
          default: 'Ein unbekannter Fehler ist aufgetreten',
        };
        setError('code', {
          type: 'manual',
          message: message[error.message] || message['default'],
        });
      });
  }

  // Reveal password
  const onClickReveal = () => {
    // Toggle state
    onToggle();
    // Put focus back to input and move cursor to end
    const input = inputRef.current;
    if (input) {
      input.focus({ preventScroll: true });
      const length = input.value.length * 2;
      requestAnimationFrame(() => {
        input.setSelectionRange(length, length);
      });
    }
  };

  return (
    <>
      <Head>
        <title>Anmeldung - Job Application Assistant</title>
      </Head>
      <Layout justify="center" align="center">
        {loading ? (
          <Loader text="Lade Seite..." />
        ) : (
          <main>
            <Heading as="h1" size="2xl" pb={6} textAlign="center">
              Willkommen!
            </Heading>
            <form onSubmit={handleSubmit(onSubmit)}>
              <FormControl isInvalid={formState.errors.code}>
                <FormLabel htmlFor="code">
                  Bitte geben Sie Ihren Zugangscode ein
                </FormLabel>
                <InputGroup>
                  <Input
                    type={isOpen ? 'text' : 'password'}
                    name="code"
                    placeholder="Code"
                    {...rest}
                    ref={(e) => {
                      ref(e);
                      inputRef.current = e;
                    }}
                  />
                  <InputRightElement>
                    <IconButton
                      type="button"
                      tabIndex="0"
                      variant="unstyled"
                      display="inline-flex"
                      title={isOpen ? 'Code verbergen' : 'Code anzeigen'}
                      aria-label={isOpen ? 'Code verbergen' : 'Code anzeigen'}
                      icon={isOpen ? <EyeEmpty /> : <EyeOff />}
                      onClick={onClickReveal}
                    />
                  </InputRightElement>
                </InputGroup>
                <FormErrorMessage>
                  {formState.errors.code?.message}
                </FormErrorMessage>
              </FormControl>
              <Button
                mt={4}
                w="100%"
                colorScheme="blue"
                disabled={
                  formState.isSubmitting ||
                  (formState.errors.code &&
                    formState.errors.code.type !== 'manual')
                }
                isLoading={formState.isSubmitting}
                type="submit"
              >
                Login
              </Button>
            </form>
          </main>
        )}
      </Layout>
    </>
  );
}
