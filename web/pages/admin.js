import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Avatar,
  Box,
  Button,
  ButtonGroup,
  Code,
  Collapse,
  Flex,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Image,
  Input,
  Link,
  ListItem,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverFooter,
  PopoverHeader,
  PopoverTrigger,
  Stack,
  Switch,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  Textarea,
  UnorderedList,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { Lock, Plus, Trash } from 'iconoir-react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import generatePassword from 'omgopass';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import Alert from '../components/Alert';
import Footer from '../components/Footer';
import Header from '../components/Header';
import JobPopup from '../components/JobPopup';
import Layout from '../components/Layout';
import Loader from '../components/Loader';
import Logo from '../components/Logo';
import { useDebounce } from '../lib/debounce';
import { checkSession, directus, getBearer, url } from '../lib/directus';
import { init } from '../lib/init';

function Preview({ name, previewUrl, type }) {
  const [previewImg, setPreviewImg] = useState('');

  useEffect(() => {
    if (previewUrl) {
      getBearer().then((bearer) => {
        fetch(
          `${process.env.NEXT_PUBLIC_API_URL}assets/${previewUrl}?fit=cover&width=100&height=100&quality=90`,
          {
            method: 'GET',
            headers: { Authorization: bearer },
          }
        ).then(async (response) => {
          const blob = await response.blob();
          const objectUrl = URL.createObjectURL(blob);
          setPreviewImg(objectUrl);
        });
      });
    }
  }, [previewUrl]);

  switch (type) {
    case 'avatar':
      return <Avatar name={name} src={previewImg} />;
    case 'image':
      return (
        <Image boxSize="100px" objectFit="cover" src={previewImg} alt={name} />
      );
  }
}

export default function Admin() {
  const [loading, setLoading] = useState({ state: true });
  const router = useRouter();
  const [jobs, setJobs] = useState({});
  const [docs, setDocs] = useState({});
  const [settings, setSettings] = useState({});

  const [feedback, setFeedback] = useState({});
  const [feedbackSaved, setFeedbackSaved] = useState(false);
  const debouncedFeedback = useDebounce(feedback, 400);

  const toast = useToast();

  const {
    isOpen: newJobIsOpen,
    onOpen: onOpenNewJob,
    onClose: onCloseNewJob,
  } = useDisclosure();
  const {
    formState: newJobFormState,
    handleSubmit: newJobHandleSubmit,
    register: newJobRegister,
    reset: newJobReset,
    setError: newJobSetError,
  } = useForm();
  const newJobInitialRef = useRef();
  const { ref: jobCompanyRef, ...jobCompanyRest } = newJobRegister('company', {
    required: true,
  });

  const [newDocTarget, setNewDocTarget] = useState();
  const {
    isOpen: newDocIsOpen,
    onOpen: onOpenNewDoc,
    onClose: onCloseNewDoc,
  } = useDisclosure({ onClose: () => setNewDocTarget() });
  const {
    formState: newDocFormState,
    handleSubmit: newDocHandleSubmit,
    register: newDocRegister,
    reset: newDocReset,
  } = useForm();
  const newDocInitialRef = useRef();
  const { ref: newDocTitleRef, ...newDocTitleRest } = newDocRegister('title', {
    required: true,
  });

  const {
    formState: settingsFormState,
    handleSubmit: settingsHandleSubmit,
    register: settingsRegister,
  } = useForm();

  useEffect(() => {
    const fetchData = async () => {
      checkSession().then(async (user) => {
        if (!user) {
          // Go to instruction page if user is not logged in
          await router.push({
            pathname: '/login',
            query: { admin: true },
          });
        } else if (!user.email?.startsWith('admin@')) {
          // Go to start page if user is not admin
          await router.push('/home');
        } else {
          try {
            setLoading({ state: true, text: 'Überprüfe Applikation...' });

            // Assuming the backend isn't initialized if 'job' collection is missing
            const collections = await directus.collections.readMany();
            const result = collections.data.find((obj) => {
              return obj.collection === 'jobs';
            });
            if (result === undefined) {
              // Initialize backend
              setLoading({ state: true, text: 'Initialisierung...' });
              await init(directus);
            }

            setLoading({ state: true, text: 'Lade Daten...' });
            const jobs = await directus.items('jobs').readMany();
            setJobs(jobs.data);
            const docs = await directus.items('docs').readMany();
            setDocs(docs.data);

            const settings = await directus.singleton('settings').read();
            delete settings.id;
            setSettings(settings);

            setLoading({ state: false });
          } catch (error) {
            setLoading({ state: true, error: error });
          }
        }
      });
    };
    fetchData();

    // Close all toasts on page left
    return () => {
      toast.closeAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshJobs() {
    const jobs = await directus.items('jobs').readMany();
    setJobs(jobs.data);
  }

  async function refreshDocs() {
    const docs = await directus.items('docs').readMany();
    setDocs(docs.data);
  }

  async function deleteJob(jobId) {
    await directus.items('jobs').deleteOne(jobId);
    refreshJobs();
  }

  async function deleteDoc(docId) {
    await directus.items('docs').deleteOne(docId);
    refreshDocs();
  }

  async function newCode(userId) {
    const code = generatePassword();
    directus.users.updateOne(userId, { password: code });

    const codeToast = () => {
      toast({
        id: 'new-code',
        title: 'Neuer Zugangscode',
        description: (
          <>
            {code}
            {window.isSecureContext && (
              <Button
                ml="2"
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(code);
                }}
              >
                Kopieren
              </Button>
            )}
          </>
        ),
        status: 'success',
        duration: 30000,
        isClosable: true,
      });
    };

    // If toast already exists, close it and create a new one
    if (toast.isActive('new-code')) {
      toast.close('new-code');
      // Timeout required, otherwise new toast gets closed as well
      setTimeout(() => codeToast(), 100);
    } else {
      codeToast();
    }
  }

  async function updateJobSent(jobId, value) {
    await directus.items('jobs').updateOne(jobId, { sent: value });
    refreshJobs();
  }

  function getAccessEmail(company, jobId) {
    const transformedCompany = company.toLowerCase().replace(/\s/g, '-');
    const host = process.env.NEXT_PUBLIC_DOMAIN || window.location.host;
    return `${transformedCompany}-${jobId}@${host}`;
  }

  function getAccessLink(company, jobId) {
    const transformedCompany = company.toLowerCase().replace(/\s/g, '-');
    return `${window.location.origin}/${transformedCompany}/${jobId}`;
  }

  async function onSubmitNewJob({ company, position, link }) {
    // Validate link
    try {
      new URL(link);
    } catch {
      newJobSetError('link', {
        type: 'manual',
        message: 'Link ist ungültig',
      });
      return false;
    }

    // Create job
    const job = await directus.items('jobs').createOne({
      company: company,
      position: position,
      link: link,
    });

    // Create associated user
    const role = await directus.roles.readMany({
      search: 'Companies',
    });
    let code = generatePassword();
    await directus.users.createOne({
      email: getAccessEmail(company, job.id),
      password: code,
      role: role.data[0].id,
      job: job.id,
    });

    // Get preview image of link
    const bearer = await getBearer();
    const webPreview = await fetch('/api/web-preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: bearer },
      body: JSON.stringify({ url: link }),
    });
    // Upload and link preview
    const formData = new FormData();
    formData.append('title', `preview-${job.id}`);
    formData.append('file', await webPreview.blob());
    const preview = await fetch(`${url}files`, {
      method: 'POST',
      headers: { Authorization: bearer },
      body: formData,
    });
    const previewData = await preview.json();
    const previewId = previewData.data.id;
    await directus.items('jobs').updateOne(job.id, {
      preview: [previewId],
    });

    newJobReset();
    refreshJobs();
    onCloseNewJob();

    // Show access data
    toast({
      title: 'Job wurde hinzugefügt',
      description: (
        <>
          Die Zugangsdaten lauten wie folgt:
          <br />
          <span style={{ fontWeight: 'bold' }}>Link:</span>{' '}
          <Link
            color="blue.500"
            href={getAccessLink(company, job.id)}
            isExternal
          >
            {getAccessLink(company, job.id)}
          </Link>
          <br />
          <span style={{ fontWeight: 'bold' }}>Code:</span> {code}
          {window.isSecureContext && (
            <Button
              ml="2"
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(code);
              }}
            >
              Kopieren
            </Button>
          )}
        </>
      ),
      status: 'success',
      duration: 30000,
      isClosable: true,
    });
  }

  async function onSubmitNewDoc({ title, file }) {
    const bearer = await getBearer();

    // Get preview image of pdf
    const pdfPreview = await fetch('/api/pdf-preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/pdf', Authorization: bearer },
      body: file[0],
    });
    // Upload preview and pdf itself
    const formData = new FormData();
    formData.append('title', `preview-${title}`);
    formData.append('file', await pdfPreview.blob());
    formData.append('title', title);
    formData.append('file', await file[0]);
    const files = await fetch(`${url}files`, {
      method: 'POST',
      headers: { Authorization: bearer },
      body: formData,
    });
    const filesResponse = await files.json();
    const filesData = filesResponse.data;

    // Create doc entry
    await directus.items('docs').createOne({
      title: title,
      preview: [filesData.find((file) => file.title === `preview-${title}`).id],
      file: [filesData.find((file) => file.title === title).id],
      global: !newDocTarget ? true : false,
      job: newDocTarget ? newDocTarget : null,
    });

    refreshDocs();
    onCloseNewDoc();
    newDocReset();
  }

  async function onSubmitSettings(data) {
    await directus.singleton('settings').update(data);
  }

  useEffect(() => {
    async function updateFeedback() {
      await directus.items('jobs').updateOne(debouncedFeedback.jobId, {
        feedback: debouncedFeedback.value,
      });
      setFeedbackSaved(true);
    }
    if (debouncedFeedback.jobId) {
      updateFeedback();
    }
  }, [debouncedFeedback]);

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
                  Beim Laden des Adminbereichs ist leider ein Fehler
                  aufgetreten. Versuche die Seite neu zu laden oder melde dich
                  zu einem späteren Zeitpunkt nochmals an.
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
        <title>Admin - Job Application Assistant</title>
      </Head>
      <Layout>
        <Header title={<Logo />} />
        <Box as="main" flex="1" mt={10}>
          <Tabs>
            <TabList>
              <Tab>Jobs</Tab>
              <Tab>Allgemeine Dokumente</Tab>
              <Tab>Einstellungen</Tab>
            </TabList>

            <TabPanels>
              <TabPanel>
                <Flex direction={{ base: 'column', sm: 'row' }}>
                  {jobs.length === 0 ? (
                    <Text flex="1">Noch keine Jobs</Text>
                  ) : (
                    <Accordion flex="1" allowToggle allowMultiple>
                      {jobs.map((job) => (
                        <AccordionItem key={job.id}>
                          <h2>
                            <AccordionButton>
                              <Flex flex="1">
                                <Preview
                                  name={job.company}
                                  previewUrl={job.preview[0]}
                                  type="avatar"
                                />
                                <Box ml="3">
                                  <Text fontWeight="bold" textAlign="left">
                                    {job.company}
                                  </Text>
                                  <Text fontSize="sm">{job.position}</Text>
                                </Box>
                              </Flex>
                              <AccordionIcon />
                            </AccordionButton>
                          </h2>
                          <AccordionPanel pb={4}>
                            <Flex wrap="wrap">
                              <Stack flex="1" spacing={4}>
                                <Box>
                                  <Text fontWeight="bold">Stelleninserat</Text>
                                  <JobPopup
                                    link={job.link}
                                    previewUrl={job.preview[0]}
                                  >
                                    <Text color="blue.500">
                                      {new URL(job.link).hostname}
                                    </Text>
                                  </JobPopup>
                                </Box>
                                <Box>
                                  <Text fontWeight="bold">Dokumente</Text>
                                  {docs.filter((doc) => doc.job === job.id)
                                    .length > 0 ? (
                                    <UnorderedList>
                                      {docs
                                        .filter((doc) => doc.job === job.id)
                                        .map((doc) => (
                                          <ListItem key={doc.id}>
                                            <Popover>
                                              <PopoverTrigger>
                                                <Button variant="link">
                                                  {doc.title}
                                                </Button>
                                              </PopoverTrigger>
                                              <PopoverContent>
                                                <PopoverHeader fontWeight="semibold">
                                                  {doc.title}
                                                </PopoverHeader>
                                                <PopoverArrow />
                                                <PopoverCloseButton />
                                                <PopoverBody>
                                                  <Preview
                                                    name={doc.title}
                                                    previewUrl={doc.preview[0]}
                                                    type="image"
                                                  />
                                                </PopoverBody>
                                                <PopoverFooter
                                                  d="flex"
                                                  justifyContent="flex-end"
                                                >
                                                  <ButtonGroup size="sm">
                                                    <Popover>
                                                      {({ onClose }) => (
                                                        <>
                                                          <PopoverTrigger>
                                                            <Button colorScheme="red">
                                                              Entfernen
                                                            </Button>
                                                          </PopoverTrigger>
                                                          <PopoverContent>
                                                            <PopoverHeader fontWeight="semibold">
                                                              Bestätigung
                                                            </PopoverHeader>
                                                            <PopoverArrow />
                                                            <PopoverCloseButton />
                                                            <PopoverBody>
                                                              Möchtest du dieses
                                                              Dokument wirklich
                                                              entfernen?
                                                            </PopoverBody>
                                                            <PopoverFooter
                                                              d="flex"
                                                              justifyContent="flex-end"
                                                            >
                                                              <ButtonGroup size="sm">
                                                                <Button
                                                                  variant="outline"
                                                                  onClick={
                                                                    onClose
                                                                  }
                                                                >
                                                                  Abbrechen
                                                                </Button>
                                                                <Button
                                                                  colorScheme="red"
                                                                  onClick={() =>
                                                                    deleteDoc(
                                                                      doc.id
                                                                    )
                                                                  }
                                                                >
                                                                  Entfernen
                                                                </Button>
                                                              </ButtonGroup>
                                                            </PopoverFooter>
                                                          </PopoverContent>
                                                        </>
                                                      )}
                                                    </Popover>
                                                  </ButtonGroup>
                                                </PopoverFooter>
                                              </PopoverContent>
                                            </Popover>
                                          </ListItem>
                                        ))}
                                    </UnorderedList>
                                  ) : (
                                    <Text>Keine Dokumente</Text>
                                  )}
                                  <Button
                                    mt="2"
                                    size="sm"
                                    leftIcon={<Plus />}
                                    onClick={() => {
                                      setNewDocTarget(job.id);
                                      onOpenNewDoc();
                                    }}
                                  >
                                    Dokument hinzufügen
                                  </Button>
                                </Box>
                                <Box>
                                  <Text fontWeight="bold">Status</Text>
                                  Bewerbung abgeschickt:{' '}
                                  <Switch
                                    defaultChecked={job.sent}
                                    onChange={(e) =>
                                      updateJobSent(
                                        job.id,
                                        e.currentTarget.checked
                                      )
                                    }
                                  />
                                  <Collapse in={job.sent}>
                                    <Text>Feedback:</Text>
                                    <Textarea
                                      maxW="500"
                                      defaultValue={job.feedback}
                                      onChange={(e) => {
                                        setFeedbackSaved(false);
                                        setFeedback({
                                          jobId: job.id,
                                          value: e.target.value,
                                        });
                                      }}
                                      placeholder="Noch kein Feedback eingetragen"
                                      _placeholder={{
                                        color: 'gray.500',
                                      }}
                                      focusBorderColor={
                                        feedback.jobId === job.id &&
                                        feedbackSaved &&
                                        'green.500'
                                      }
                                    />
                                  </Collapse>
                                </Box>
                                <Box>
                                  <Text fontWeight="bold">Zugangslink</Text>
                                  <Link
                                    color="blue.500"
                                    href={getAccessLink(job.company, job.id)}
                                    isExternal
                                  >
                                    {getAccessLink(job.company, job.id)}
                                  </Link>
                                  <Box mt="2">
                                    <Popover>
                                      {({ onClose }) => (
                                        <>
                                          <PopoverTrigger>
                                            <Button
                                              size="sm"
                                              leftIcon={<Lock />}
                                            >
                                              Neuen Zugangscode generieren
                                            </Button>
                                          </PopoverTrigger>
                                          <PopoverContent>
                                            <PopoverHeader fontWeight="semibold">
                                              Bestätigung
                                            </PopoverHeader>
                                            <PopoverArrow />
                                            <PopoverCloseButton />
                                            <PopoverBody>
                                              Möchtest wirklich einen neuen
                                              Zugangscode generieren? Der
                                              bisherige Code wird überschrieben.
                                            </PopoverBody>
                                            <PopoverFooter
                                              d="flex"
                                              justifyContent="flex-end"
                                            >
                                              <ButtonGroup size="sm">
                                                <Button
                                                  variant="outline"
                                                  onClick={onClose}
                                                >
                                                  Abbrechen
                                                </Button>
                                                <Button
                                                  colorScheme="red"
                                                  onClick={() => {
                                                    onClose();
                                                    newCode(job.user);
                                                  }}
                                                >
                                                  Zugangscode erstellen
                                                </Button>
                                              </ButtonGroup>
                                            </PopoverFooter>
                                          </PopoverContent>
                                        </>
                                      )}
                                    </Popover>
                                  </Box>
                                </Box>
                              </Stack>
                              <Popover>
                                {({ onClose }) => (
                                  <>
                                    <PopoverTrigger>
                                      <Button
                                        mt={{ base: 4, sm: 0 }}
                                        size="sm"
                                        leftIcon={<Trash />}
                                        colorScheme="red"
                                      >
                                        Job entfernen
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent>
                                      <PopoverHeader fontWeight="semibold">
                                        Bestätigung
                                      </PopoverHeader>
                                      <PopoverArrow />
                                      <PopoverCloseButton />
                                      <PopoverBody>
                                        Möchtest du diesen Job wirklich
                                        entfernen?
                                      </PopoverBody>
                                      <PopoverFooter
                                        d="flex"
                                        justifyContent="flex-end"
                                      >
                                        <ButtonGroup size="sm">
                                          <Button
                                            variant="outline"
                                            onClick={onClose}
                                          >
                                            Abbrechen
                                          </Button>
                                          <Button
                                            colorScheme="red"
                                            onClick={() => deleteJob(job.id)}
                                          >
                                            Entfernen
                                          </Button>
                                        </ButtonGroup>
                                      </PopoverFooter>
                                    </PopoverContent>
                                  </>
                                )}
                              </Popover>
                            </Flex>
                          </AccordionPanel>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  )}
                  <Button
                    mt={{ base: 4, sm: 0 }}
                    ml={{ base: 0, sm: 4 }}
                    leftIcon={<Plus />}
                    colorScheme="blue"
                    variant="solid"
                    onClick={onOpenNewJob}
                  >
                    Job hinzufügen
                  </Button>
                </Flex>
              </TabPanel>

              <TabPanel>
                <Flex direction={{ base: 'column', sm: 'row' }}>
                  {docs.filter((doc) => doc.global === true).length === 0 ? (
                    <Text flex="1">Noch keine allgemeine Dokumente</Text>
                  ) : (
                    <Accordion flex="1" allowToggle allowMultiple>
                      {docs
                        .filter((doc) => doc.global === true)
                        .map((doc) => (
                          <AccordionItem key={doc.id}>
                            <h2>
                              <AccordionButton>
                                <Flex flex="1">
                                  <Preview
                                    name={doc.title}
                                    previewUrl={doc.preview[0]}
                                    type="avatar"
                                  />
                                  <Flex ml="3" align="center">
                                    <Text fontWeight="bold">{doc.title}</Text>
                                  </Flex>
                                </Flex>
                                <AccordionIcon />
                              </AccordionButton>
                            </h2>

                            <AccordionPanel pb={4}>
                              <Popover>
                                {({ onClose }) => (
                                  <>
                                    <PopoverTrigger>
                                      <Button
                                        size="sm"
                                        leftIcon={<Trash />}
                                        colorScheme="red"
                                      >
                                        Dokument entfernen
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent>
                                      <PopoverHeader fontWeight="semibold">
                                        Bestätigung
                                      </PopoverHeader>
                                      <PopoverArrow />
                                      <PopoverCloseButton />
                                      <PopoverBody>
                                        Möchtest du dieses Dokument wirklich
                                        entfernen?
                                      </PopoverBody>
                                      <PopoverFooter
                                        d="flex"
                                        justifyContent="flex-end"
                                      >
                                        <ButtonGroup size="sm">
                                          <Button
                                            variant="outline"
                                            onClick={onClose}
                                          >
                                            Abbrechen
                                          </Button>
                                          <Button
                                            colorScheme="red"
                                            onClick={() => deleteDoc(doc.id)}
                                          >
                                            Entfernen
                                          </Button>
                                        </ButtonGroup>
                                      </PopoverFooter>
                                    </PopoverContent>
                                  </>
                                )}
                              </Popover>
                            </AccordionPanel>
                          </AccordionItem>
                        ))}
                    </Accordion>
                  )}
                  <Button
                    mt={{ base: 4, sm: 0 }}
                    ml={{ base: 0, sm: 4 }}
                    leftIcon={<Plus />}
                    colorScheme="blue"
                    variant="solid"
                    onClick={() => {
                      setNewDocTarget();
                      onOpenNewDoc();
                    }}
                  >
                    Dokument hinzufügen
                  </Button>
                </Flex>
              </TabPanel>

              <TabPanel>
                <form onSubmit={settingsHandleSubmit(onSubmitSettings)}>
                  {Object.keys(settings).map((key, index) => {
                    return (
                      <FormControl mt={index > 0 && 4} key={index} id={key}>
                        <FormLabel>
                          {key
                            .replace(/((?<!^)[A-Z](?![A-Z]))(?=\S)/g, ' $1')
                            .replace(/^./, (s) => s.toUpperCase())}
                        </FormLabel>
                        <Input
                          id={key}
                          defaultValue={settings[key]}
                          maxW="500"
                          {...settingsRegister(key)}
                        />
                      </FormControl>
                    );
                  })}
                  <Button
                    mt={4}
                    isLoading={settingsFormState.isSubmitting}
                    colorScheme="blue"
                    type="submit"
                  >
                    Speichern
                  </Button>
                </form>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>
        <Footer />
      </Layout>

      <Modal
        initialFocusRef={newJobInitialRef}
        isOpen={newJobIsOpen}
        onClose={onCloseNewJob}
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Job hinzufügen</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <form
              id="new-job-form"
              onSubmit={newJobHandleSubmit(onSubmitNewJob)}
            >
              <FormControl isInvalid={newJobFormState.errors.company}>
                <FormLabel>Firma</FormLabel>
                <Input
                  placeholder="Acme Corporation"
                  {...jobCompanyRest}
                  ref={(e) => {
                    jobCompanyRef(e);
                    newJobInitialRef.current = e;
                  }}
                />
              </FormControl>

              <FormControl mt={4} isInvalid={newJobFormState.errors.position}>
                <FormLabel>Position</FormLabel>
                <Input
                  placeholder="System Engineer"
                  {...newJobRegister('position', { required: true })}
                />
              </FormControl>

              <FormControl mt={4} isInvalid={newJobFormState.errors.link}>
                <FormLabel>Link zur Stellenausschreibung</FormLabel>
                <Input
                  placeholder="https://example.org/job/1"
                  {...newJobRegister('link', { required: true })}
                />
                <FormErrorMessage>
                  {newJobFormState.errors.link?.message}
                </FormErrorMessage>
              </FormControl>
            </form>
          </ModalBody>

          <ModalFooter>
            <Button
              isLoading={newJobFormState.isSubmitting}
              type="submit"
              form="new-job-form"
              colorScheme="blue"
              mr={3}
            >
              Speichern
            </Button>
            <Button onClick={onCloseNewJob}>Abbrechen</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal
        initialFocusRef={newDocInitialRef}
        isOpen={newDocIsOpen}
        onClose={onCloseNewDoc}
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {newDocTarget
              ? `Dokument zu Job "${newDocTarget}" hinzufügen`
              : 'Allgemeines Dokument hinzufügen'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <form
              id="new-doc-form"
              onSubmit={newDocHandleSubmit(onSubmitNewDoc)}
            >
              <FormControl isInvalid={newDocFormState.errors.title}>
                <FormLabel>Titel</FormLabel>
                <Input
                  placeholder="Arbeitszeugnis"
                  {...newDocTitleRest}
                  ref={(e) => {
                    newDocTitleRef(e);
                    newDocInitialRef.current = e;
                  }}
                />
              </FormControl>

              <FormControl mt={4} isInvalid={newDocFormState.errors.file}>
                <FormLabel>Dokument</FormLabel>
                <Input
                  type="file"
                  variant="unstyled"
                  accept="application/pdf"
                  {...newDocRegister('file', { required: true })}
                />
              </FormControl>
            </form>
          </ModalBody>

          <ModalFooter>
            <Button
              isLoading={newDocFormState.isSubmitting}
              type="submit"
              form="new-doc-form"
              colorScheme="blue"
              mr={3}
            >
              Speichern
            </Button>
            <Button onClick={onCloseNewDoc}>Abbrechen</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
