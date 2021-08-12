import 'animate.css';

import {
  Box,
  Button,
  ButtonGroup,
  Code,
  Flex,
  Heading,
  IconButton,
  SimpleGrid,
  Text,
  Tooltip,
  useBreakpointValue,
} from '@chakra-ui/react';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { EyeEmpty, List, ViewGrid } from 'iconoir-react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { Flipped, Flipper } from 'react-flip-toolkit';

import Alert from '../components/Alert';
import Card from '../components/Card';
import Chat from '../components/Chat';
import Footer from '../components/Footer';
import Header from '../components/Header';
import Layout from '../components/Layout';
import Loader from '../components/Loader';
import Search from '../components/Search';
import IntroductionMdx from '../data/introduction.mdx';
import {
  checkSession,
  directus,
  getBearer,
  url as directusUrl,
} from '../lib/directus';
import { DocumentStore } from '../store/DocumentStore';

function mapOrder(source, order, key) {
  const map = order.reduce((r, v, i) => ((r[v] = i), r), {});
  return source.slice().sort((a, b) => map[a[key]] - map[b[key]]);
}

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState({ state: true });
  const [user, setUser] = useState({});
  const [job, setJob] = useState({});
  const [settings, setSettings] = useState({});
  const [documents, setDocuments] = useState([]);
  const [documentsOrder, setDocumentsOrder] = useState([]);
  const results = DocumentStore.useState((s) => s.results);
  const [grid, setGrid] = useState(true);
  const [manuallyFilteredDocuments, setManuallyFilteredDocuments] = useState(
    []
  );
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  const isSmallScreen = useBreakpointValue({ base: true, lg: false });

  useEffect(() => {
    const fetchData = async () => {
      checkSession().then(async (user) => {
        if (!user) {
          // Go to instruction page if user is not logged in
          router.push('/');
        } else if (user.email?.startsWith('admin')) {
          // Go to admin page if user is admin
          router.push('/admin');
        } else {
          setLoading({ state: true, text: 'Bewerbung wird geladen...' });

          // Store infos about user
          setUser(user);

          let data = [];
          try {
            // Get info about job
            setJob(await directus.items('jobs').readOne(user.job));

            // Get global settings
            setSettings(await directus.singleton('settings').read());

            // Get documents
            const docs = await directus.items('docs').readMany({
              // display job-specific documents first
              sort: ['job'],
            });
            for (const doc of docs.data) {
              data.push({
                id: doc.id,
                title: doc.title,
                file: {
                  url: `${directusUrl}/assets/${doc.file[0]}`,
                  httpHeaders: {
                    Authorization: getBearer,
                  },
                  filename:
                    doc.title
                      .replace(/[^a-z0-9]/gi, '_')
                      .replace(/_{2,}/g, '_')
                      .toLowerCase() + '.pdf',
                },
              });
            }
            // Initial order
            setDocumentsOrder(data.map((document) => document.id));
            // Store data
            setDocuments(data);
            // Update index
            DocumentStore.update((s) => {
              data.map(({ id, title }) => {
                // Add document itself to index if not already there
                if (!s.index[id]) {
                  s.index[id] = {};
                }
                // Add document title to index
                s.index[id].title = title;
              });
            });
            setLoading({ state: false });
          } catch (error) {
            setLoading({ state: true, error: error });
          }
        }
      });
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addToManuallyFilteredDocuments = (id) =>
    setManuallyFilteredDocuments((oldArray) => [...oldArray, id]);

  function handleDragEnd(event) {
    const { active, over } = event;
    if (active.id !== over.id) {
      setDocumentsOrder((items) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  const numOfCardsToDisplay = documents.filter(
    ({ id }) =>
      !manuallyFilteredDocuments.includes(id) &&
      !(results[id] && results[id].count === 0)
  ).length;

  if (loading.state) {
    return (
      <>
        <Head>
          <title>Job Application Assistant</title>
        </Head>
        <Layout justify="center" align="center">
          <Loader text={loading.text} displayText={loading.text} />
        </Layout>
        {loading.error && (
          <Alert
            title="Es gibt ein Problem 🙈"
            message={
              <>
                <Text>
                  Beim Laden der Bewerbung ist leider ein Fehler aufgetreten.
                  Versuchen Sie die Seite neu zu laden oder melden Sie sich zu
                  einem späteren Zeitpunkt nochmals an.
                </Text>
                {loading.error.message && (
                  <>
                    <Text mt="4">Fehlermeldung:</Text>
                    <Code colorScheme="red">{loading.error.message}</Code>
                  </>
                )}
              </>
            }
            actions={[
              {
                text: 'Seite neu laden',
                leastDestructive: true,
                action: () => router.reload(),
              },
              {
                text: 'Abmelden',
                props: { as: 'a', href: '/logout', colorScheme: 'red' },
                action: (e) => {
                  e.preventDefault();
                  router.push(e.currentTarget.href);
                },
              },
            ]}
          />
        )}
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{job.company} - Job Application Assistant</title>
      </Head>
      <Layout>
        <Header
          title={
            <Heading as="h1" size="2xl">
              Hallo, {job.company}{' '}
              <span
                as="span"
                style={{ display: 'inline-block' }}
                role="img"
                aria-label="Winkende Hand"
                className="animate__animated animate__tada animate__slow"
                onMouseOver={(e) => e.target.classList.add('animate__infinite')}
                onFocus={(e) => e.target.classList.add('animate__infinite')}
                onMouseOut={(e) =>
                  e.target.classList.remove('animate__infinite')
                }
                onBlur={(e) => e.target.classList.remove('animate__infinite')}
              >
                👋
              </span>
            </Heading>
          }
        />

        <Flex as="main" direction="column" flex="1">
          <Box mt={6} maxW="800" fontSize={{ md: 18 }}>
            <IntroductionMdx
              job={job}
              chat={
                process.env.NEXT_PUBLIC_CHATWOOT_URL &&
                settings.chatwoot_website_token
              }
            />
          </Box>

          <Box mt={6} mb={4}>
            <Flex>
              <Search maxW="300px" mr="0.5em" />
              <Flex ml="auto">
                {manuallyFilteredDocuments.length > 0 &&
                  isSmallScreen === false && (
                    <Button
                      mr="0.5em"
                      variant="outline"
                      onClick={() => setManuallyFilteredDocuments([])}
                      leftIcon={<EyeEmpty />}
                    >
                      Versteckte Dokumente anzeigen
                    </Button>
                  )}
                <ButtonGroup
                  isAttached
                  variant="outline"
                  onClick={() => setGrid((prev) => !prev)}
                >
                  <Tooltip hasArrow label="Kartenansicht">
                    <IconButton
                      borderRightWidth="0.5px"
                      aria-label="Kartenansicht"
                      isActive={grid}
                      icon={<ViewGrid />}
                    />
                  </Tooltip>
                  <Tooltip hasArrow label="Listenansicht">
                    <IconButton
                      borderLeftWidth="0.5px"
                      aria-label="Listenansicht"
                      isActive={!grid}
                      icon={<List />}
                    />
                  </Tooltip>
                </ButtonGroup>
              </Flex>
            </Flex>
            {manuallyFilteredDocuments.length > 0 && isSmallScreen === true && (
              <Button
                mt="0.5em"
                variant="outline"
                minW={{ base: '100%', sm: '10' }}
                onClick={() => setManuallyFilteredDocuments([])}
                leftIcon={<EyeEmpty />}
              >
                Versteckte Dokumente anzeigen
              </Button>
            )}
          </Box>

          <Box flex="1" position="relative">
            {numOfCardsToDisplay === 0 && (
              <Text
                position="absolute"
                top="50%"
                left="50%"
                transform="translate(-50%, -50%)"
                textAlign="center"
              >
                Keine anzuzeigende Dokumente...
              </Text>
            )}
            <Flipper
              flipKey={`${grid}-${JSON.stringify(
                manuallyFilteredDocuments
              )}-${JSON.stringify(
                Object.keys(results).map((document) => results[document].count)
              )}-${JSON.stringify(documentsOrder)}`}
              spring="veryGentle"
              decisionData={{
                grid: grid,
              }}
              staggerConfig={{
                default: {
                  reverse: grid,
                },
              }}
            >
              <Flipped flipId="list">
                <Flipped inverseFlipId="list">
                  <SimpleGrid
                    columns={{ base: 1, sm: grid ? 2 : 1, lg: grid ? 3 : 1 }}
                    spacing={{
                      base: '1em',
                      md: grid && '1.5em',
                      lg: grid && '2em',
                    }}
                    alignItems="start"
                  >
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext items={documentsOrder}>
                        {mapOrder(documents, documentsOrder, 'id')
                          .filter(
                            ({ id }) =>
                              !manuallyFilteredDocuments.includes(id) &&
                              !(results[id] && results[id].count === 0)
                          )
                          .map(({ id, title, file }) => (
                            <Card
                              key={id}
                              id={id}
                              title={title}
                              file={file}
                              grid={grid}
                              addToFilteredDocuments={
                                addToManuallyFilteredDocuments
                              }
                            />
                          ))}
                      </SortableContext>
                    </DndContext>
                  </SimpleGrid>
                </Flipped>
              </Flipped>
            </Flipper>
          </Box>
        </Flex>

        <Footer isSmallScreen={isSmallScreen} />
      </Layout>

      {process.env.NEXT_PUBLIC_CHATWOOT_URL &&
        settings.chatwoot_website_token && (
          <Chat
            url={process.env.NEXT_PUBLIC_CHATWOOT_URL}
            token={settings.chatwoot_website_token}
            identifier={user.id}
            name={`${job.company} - ${job.position}`}
            hash={job.identity_hash}
          />
        )}
    </>
  );
}
