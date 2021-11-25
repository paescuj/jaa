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
  useColorMode,
  useDisclosure,
  useTheme,
  useToast,
} from '@chakra-ui/react';
import crypto from 'crypto';
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
import {
  checkSession,
  directus,
  getBearer,
  url as directusUrl,
} from '../lib/directus';
import { init } from '../lib/init';

function Preview({ name, previewUrl, type }) {
  const [previewImg, setPreviewImg] = useState('');

  useEffect(() => {
    if (previewUrl) {
      getBearer().then((bearer) => {
        fetch(
          `${directusUrl}/assets/${previewUrl}?fit=cover&width=100&height=100&quality=90`,
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

function CopyCodeButton({ code }) {
  const { colorMode } = useColorMode();
  const toast = useToast();

  const copyToast = () => {
    toast({
      id: 'copy-code',
      description: 'Code kopiert',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  if (window.isSecureContext) {
    return (
      <Button
        ml="2"
        size="sm"
        variant="outline"
        colorScheme={colorMode === 'dark' && 'black'}
        onClick={() => {
          navigator.clipboard.writeText(code).then(() => {
            // If toast already exists, close it and create a new one
            if (toast.isActive('copy-code')) {
              toast.close('copy-code');
              // Timeout required, otherwise new toast gets closed as well
              setTimeout(() => copyToast(), 100);
            } else {
              copyToast();
            }
          });
        }}
      >
        Kopieren
      </Button>
    );
  } else {
    return null;
  }
}

export default function Admin() {
  const [loading, setLoading] = useState({ state: true });
  const router = useRouter();
  const [jobs, setJobs] = useState({});
  const [docs, setDocs] = useState({});
  const [settings, setSettings] = useState({});
  const [directusInfo, setDirectusInfo] = useState({});

  const [notes, setNotes] = useState({});
  const [notesSaved, setNotesSaved] = useState(false);
  const debouncedNotes = useDebounce(notes, 400);

  const toast = useToast();

  const theme = useTheme();

  const [tabIndex, setTabIndex] = useState(0);
  useEffect(() => {
    if (router.query.tab) {
      setTabIndex(parseInt(router.query.tab));
    }
  }, [router.query.tab]);

  function changeTab(index) {
    router.push(
      {
        query: { tab: index },
      },
      undefined,
      { shallow: true }
    );
  }

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
    setValue: newDocSetValue,
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
    isOpen: chatwootSetupIsOpen,
    onOpen: onOpenChatwootSetup,
    onClose: onCloseChatwootSetup,
  } = useDisclosure();
  const {
    formState: chatwootSetupFormState,
    handleSubmit: chatwootSetupHandleSubmit,
    register: chatwootSetupRegister,
    reset: chatwootSetupReset,
    setError: chatwootSetupSetError,
  } = useForm();
  const chatwootSetupInitialRef = useRef();
  const { ref: chatwootSetupUserTokenRef, ...chatwootSetupUserTokenRest } =
    chatwootSetupRegister('chatwootUserToken', {
      required: true,
    });

  useEffect(() => {
    const fetchData = async () => {
      checkSession().then(async (user) => {
        if (!user) {
          // Go to login page if user is not logged in
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

            // Assuming the backend isn't initialized if 'Companies' role is missing
            const roles = await directus.roles.readMany();
            const result = roles.data.find((obj) => {
              return obj.name === 'Companies';
            });
            if (result === undefined) {
              // Initialize backend
              setLoading({ state: true, text: 'Initialisierung...' });
              await init(directus);
            }

            setLoading({ state: true, text: 'Lade Daten...' });
            const jobs = await directus.items('jobs').readMany();
            setJobs(jobs.data);
            const docs = await directus.items('docs').readMany({
              sort: ['job'],
            });
            setDocs(docs.data);

            const settings = await directus.singleton('settings').read();
            setSettings(settings);

            const directusInfo = await directus.server.info();
            setDirectusInfo(directusInfo);

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

  async function refreshSettings() {
    const settings = await directus.singleton('settings').read();
    setSettings(settings);
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
          <Flex align="center">
            {code}
            <CopyCodeButton code={code} />
          </Flex>
        ),
        status: 'success',
        duration: 15000,
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

  async function updateJobSent(jobId, enabled) {
    const value = enabled ? new Date() : null;
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
    const user = await directus.users.createOne({
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
    const preview = await fetch(`${directusUrl}/files`, {
      method: 'POST',
      headers: { Authorization: bearer },
      body: formData,
    });
    const previewData = await preview.json();
    const previewId = previewData.data.id;

    const identity_hash = settings.chatwoot_hmac_token
      ? crypto
          .createHmac('sha256', settings.chatwoot_hmac_token)
          .update(user.id)
          .digest('hex')
      : null;

    // Update job
    await directus.items('jobs').updateOne(job.id, {
      preview: [previewId],
      identity_hash: identity_hash,
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
          <Link href={getAccessLink(company, job.id)} isExternal>
            {getAccessLink(company, job.id)}
          </Link>
          <br />
          <Flex align="center">
            <span>
              <span style={{ fontWeight: 'bold' }}>Code:</span> {code}
            </span>
            <CopyCodeButton code={code} />
          </Flex>
        </>
      ),
      status: 'success',
      duration: 20000,
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
    if (!newDocTarget?.doc) {
      formData.append('title', `preview-${title}`);
      formData.append('file', await pdfPreview.blob());
    }
    formData.append('title', title);
    formData.append('file', await file[0]);
    const files = await fetch(`${directusUrl}/files`, {
      method: 'POST',
      headers: { Authorization: bearer },
      body: formData,
    });
    const filesResponse = await files.json();
    const filesData = filesResponse.data;

    // Create / update doc entry
    if (!newDocTarget?.doc) {
      await directus.items('docs').createOne({
        title: title,
        preview: [
          filesData.find((file) => file.title === `preview-${title}`).id,
        ],
        file: [filesData.find((file) => file.title === title).id],
        global: newDocTarget?.job ? false : true,
        job: newDocTarget?.job ?? null,
      });
    } else {
      await directus.items('docs').updateOne(newDocTarget.doc, {
        file_dark: [filesData.id],
      });
    }

    refreshDocs();
    onCloseNewDoc();
    newDocReset();
  }

  async function onSubmitChatwootSetup({ chatwootUserToken }) {
    const profile = await fetch(
      `${process.env.NEXT_PUBLIC_CHATWOOT_URL}/api/v1/profile`,
      {
        headers: { api_access_token: chatwootUserToken },
      }
    );
    const profileResponse = await profile.json();

    if (!profileResponse.account_id) {
      chatwootSetupSetError('chatwootUserToken', {
        type: 'manual',
        message: 'Token funktioniert nicht',
      });
      return false;
    }

    const inboxBody = {
      name: 'Pascal Jufer',
      greeting_enabled: false,
      channel: {
        type: 'web_widget',
        website_url: `https://${process.env.NEXT_PUBLIC_DOMAIN}`,
        welcome_title: 'Chatten Sie mit mir!',
        welcome_tagline:
          'Sollte ich gerade offline sein, so können Sie mir gerne eine Nachricht hinterlassen und ich werde Ihnen baldmöglichst unter Ihrer angegebenen E-Mail-Adresse antworten 😃',
        widget_color: theme.colors.blue[500],
        hmac_mandatory: true,
      },
    };
    const inbox = await fetch(
      `${process.env.NEXT_PUBLIC_CHATWOOT_URL}/api/v1/accounts/${profileResponse.account_id}/inboxes`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          api_access_token: chatwootUserToken,
        },
        body: JSON.stringify(inboxBody),
      }
    );
    const inboxResponse = await inbox.json();

    const membersBody = {
      inbox_id: inboxResponse.id,
      user_ids: [profileResponse.account_id],
    };
    await fetch(
      `${process.env.NEXT_PUBLIC_CHATWOOT_URL}/api/v1/accounts/${profileResponse.account_id}/inbox_members`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          api_access_token: chatwootUserToken,
        },
        body: JSON.stringify(membersBody),
      }
    );

    // Update existing jobs
    Object.values(jobs).forEach(async (job) => {
      const identity_hash = crypto
        .createHmac('sha256', inboxResponse.hmac_token)
        .update(job.user[0])
        .digest('hex');
      await directus.items('jobs').updateOne(job.id, {
        identity_hash: identity_hash,
      });
    });

    await directus.singleton('settings').update({
      chatwoot_website_token: inboxResponse.website_token,
      chatwoot_hmac_token: inboxResponse.hmac_token,
    });

    refreshSettings();
    onCloseChatwootSetup();
    chatwootSetupReset();
  }

  useEffect(() => {
    async function updateNotes() {
      try {
        await directus.items('jobs').updateOne(debouncedNotes.jobId, {
          notes: debouncedNotes.value,
        });
        setNotesSaved(true);
      } catch {
        setNotesSaved('error');
      }
    }
    if (debouncedNotes.jobId) {
      updateNotes();
    }
  }, [debouncedNotes]);

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
          <Tabs index={tabIndex} onChange={(index) => changeTab(index)}>
            <TabList>
              <Tab>Jobs</Tab>
              <Tab>Allgemeine Dokumente</Tab>
              <Tab>Einstellungen & Informationen</Tab>
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
                              <Flex flex="1" wrap="wrap">
                                <Preview
                                  name={job.company}
                                  previewUrl={job.preview[0]}
                                  type="avatar"
                                />
                                <Box
                                  ml="3"
                                  alignSelf="center"
                                  fontSize="lg"
                                  textAlign="left"
                                >
                                  <Text fontWeight="bold" lineHeight="1">
                                    {job.company}
                                  </Text>
                                  <Text>{job.position}</Text>
                                </Box>
                                <Box
                                  flex="1"
                                  textAlign="right"
                                  mr="1"
                                  fontSize="sm"
                                  alignSelf="center"
                                >
                                  <Text>
                                    {new Date(
                                      job.date_created
                                    ).toLocaleDateString('de-CH', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric',
                                    })}
                                  </Text>
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
                                                <Button
                                                  variant="link"
                                                  minWidth="0"
                                                >
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
                                                  <Button
                                                    mt={2}
                                                    size="sm"
                                                    colorScheme="blue"
                                                    disabled={
                                                      doc.file_dark.length > 0
                                                    }
                                                    onClick={() => {
                                                      setNewDocTarget({
                                                        job: job.id,
                                                        title: `${job.company} - ${job.position}`,
                                                        doc: doc.id,
                                                      });
                                                      newDocSetValue(
                                                        'title',
                                                        doc.title
                                                      );
                                                      onOpenNewDoc();
                                                    }}
                                                  >
                                                    Dunkle Variante hinzufügen
                                                  </Button>
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
                                      setNewDocTarget({
                                        job: job.id,
                                        title: `${job.company} - ${job.position}`,
                                      });
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
                                    Am{' '}
                                    {job.sent &&
                                      `${new Date(job.sent).toLocaleDateString(
                                        'de-CH',
                                        {
                                          year: 'numeric',
                                          month: 'long',
                                          day: 'numeric',
                                          hour: 'numeric',
                                          minute: 'numeric',
                                        }
                                      )}`}
                                  </Collapse>
                                </Box>
                                <Box>
                                  <Text fontWeight="bold">Notizen</Text>
                                  <Textarea
                                    maxW="500"
                                    defaultValue={job.notes}
                                    onChange={(e) => {
                                      setNotesSaved(false);
                                      setNotes({
                                        jobId: job.id,
                                        value: e.target.value,
                                      });
                                    }}
                                    placeholder="Noch keine Notizen eingetragen"
                                    _placeholder={{
                                      color: 'gray.500',
                                    }}
                                    focusBorderColor={
                                      notes.jobId === job.id && notesSaved
                                        ? 'green.500'
                                        : notesSaved === 'error' && 'red.500'
                                    }
                                  />
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
                                    <Text fontSize="lg" fontWeight="bold">
                                      {doc.title}
                                    </Text>
                                  </Flex>
                                </Flex>
                                <AccordionIcon />
                              </AccordionButton>
                            </h2>

                            <AccordionPanel pb={4}>
                              <Popover>
                                {({ onClose }) => (
                                  <>
                                    <Button
                                      size="sm"
                                      leftIcon={<Plus />}
                                      colorScheme="blue"
                                      disabled={doc.file_dark.length > 0}
                                      mr={{ base: 0, sm: 4 }}
                                      mb={{ base: 4, sm: 0 }}
                                      onClick={() => {
                                        setNewDocTarget({
                                          doc: doc.id,
                                        });
                                        newDocSetValue('title', doc.title);
                                        onOpenNewDoc();
                                      }}
                                    >
                                      Dunkle Variante hinzufügen
                                    </Button>
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
                <Accordion
                  flex="1"
                  defaultIndex={[0]}
                  allowToggle
                  allowMultiple
                >
                  <AccordionItem>
                    <h2>
                      <AccordionButton>
                        <Box
                          flex="1"
                          textAlign="left"
                          fontSize="lg"
                          fontWeight="bold"
                        >
                          Chatwoot
                        </Box>
                        <AccordionIcon />
                      </AccordionButton>
                    </h2>
                    <AccordionPanel pb={4}>
                      <Stack flex="1" spacing={4}>
                        <Box>
                          <Text fontWeight="bold">Instanz</Text>
                          <Link
                            color="blue.500"
                            href={process.env.NEXT_PUBLIC_CHATWOOT_URL}
                            isExternal
                          >
                            {process.env.NEXT_PUBLIC_CHATWOOT_URL}
                          </Link>
                        </Box>
                        <Box>
                          <Text fontWeight="bold">Status</Text>
                          {!settings.chatwoot_website_token ||
                          !settings.chatwoot_hmac_token ? (
                            <Box>
                              <Text>Noch nicht eingerichtet</Text>
                              <Button
                                mt={4}
                                colorScheme="blue"
                                onClick={() => {
                                  onOpenChatwootSetup();
                                }}
                              >
                                Jetzt einrichten
                              </Button>
                            </Box>
                          ) : (
                            <Box>
                              <Text>Ist eingerichtet</Text>
                              <Button
                                mt={4}
                                colorScheme="blue"
                                onClick={() => {
                                  onOpenChatwootSetup();
                                }}
                              >
                                Erneut einrichten
                              </Button>
                            </Box>
                          )}
                        </Box>
                      </Stack>
                    </AccordionPanel>
                  </AccordionItem>
                  <AccordionItem>
                    <h2>
                      <AccordionButton>
                        <Box
                          flex="1"
                          textAlign="left"
                          fontSize="lg"
                          fontWeight="bold"
                        >
                          Directus
                        </Box>
                        <AccordionIcon />
                      </AccordionButton>
                    </h2>
                    <AccordionPanel pb={4}>
                      <Stack flex="1" spacing={4}>
                        <Box>
                          <Text fontWeight="bold">Instanz</Text>
                          <Link color="blue.500" href={directusUrl} isExternal>
                            {directusUrl}
                          </Link>
                        </Box>
                        <Box>
                          <Text fontWeight="bold">Version</Text>
                          <Text>{directusInfo.directus.version}</Text>
                        </Box>
                        <Box>
                          <Text fontWeight="bold">Gestartet</Text>
                          <Text>
                            {new Intl.RelativeTimeFormat('de', {
                              numeric: 'auto',
                            }).format(
                              -Math.floor(
                                directusInfo.node.uptime / (3600 * 24)
                              ),
                              'day'
                            )}
                          </Text>
                        </Box>
                      </Stack>
                    </AccordionPanel>
                  </AccordionItem>
                </Accordion>
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
            {newDocTarget?.job
              ? `Dokument zu Job "${newDocTarget.title}" hinzufügen`
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
                  disabled={newDocTarget?.doc}
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

      <Modal
        initialFocusRef={chatwootSetupInitialRef}
        isOpen={chatwootSetupIsOpen}
        onClose={onCloseChatwootSetup}
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Chatwoot einrichten</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <form
              id="chatwoot-setup-form"
              onSubmit={chatwootSetupHandleSubmit(onSubmitChatwootSetup)}
            >
              <FormControl
                isInvalid={chatwootSetupFormState.errors.chatwootUserToken}
              >
                <FormLabel>Benutzer-Token</FormLabel>
                <Input
                  {...chatwootSetupUserTokenRest}
                  ref={(e) => {
                    chatwootSetupUserTokenRef(e);
                    chatwootSetupInitialRef.current = e;
                  }}
                />
                <FormErrorMessage>
                  {chatwootSetupFormState.errors.chatwootUserToken?.message}
                </FormErrorMessage>
              </FormControl>
            </form>
          </ModalBody>

          <ModalFooter>
            <Button
              isLoading={chatwootSetupFormState.isSubmitting}
              type="submit"
              form="chatwoot-setup-form"
              colorScheme="blue"
              mr={3}
            >
              Speichern
            </Button>
            <Button onClick={onCloseChatwootSetup}>Abbrechen</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
