import '@react-page/editor/lib/index.css';

import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  Button,
  ButtonGroup,
} from '@chakra-ui/react';
import Editor from '@react-page/editor';
import isEqual from 'lodash.isequal';
import { useCallback, useEffect, useState } from 'react';
import { RgbaColorPicker } from 'react-colorful';
import { useIntl } from 'react-intl';

import { defaultBackgroundColor } from '@/lib/color';
import { useDebounce } from '@/lib/debounce';
import { directus } from '@/lib/directus';
import {
  customSlateAbout,
  customSlateIntroduction,
} from '@/lib/react-page/plugins';
import locales from '@/locales';
import { ThemeStore } from '@/stores/ThemeStore';

export default function Customization() {
  const { formatMessage, locale } = useIntl();
  const theme = ThemeStore.useState((s) => s.theme);
  const backgroundColor = ThemeStore.useState((s) => s.theme?.backgroundColor);
  const [savedBackgroundColor, setSavedBackgroundColor] =
    useState(backgroundColor);
  const [introductionText, setIntroductionText] = useState();
  const [aboutText, setAboutText] = useState();
  const [textsLoaded, setTextsLoaded] = useState(false);
  const [translations, setTranslations] = useState();

  useEffect(() => {
    async function load() {
      let t = {};
      if (locale !== 'en') {
        t = (await import(`@/lib/react-page/locales/${locale}.json`)).default;
      }
      setTranslations(t);
    }
    load();
  }, [locale]);

  const uiTranslator = useCallback(
    (label) => {
      if (translations?.[label] !== undefined) {
        return translations[label];
      }
      return label;
    },
    [translations]
  );

  useEffect(() => {
    async function loadTexts() {
      try {
        const settings = await directus
          .singleton('settings')
          .read({ fields: ['introduction_text', 'about_text'] });
        setIntroductionText(settings?.introduction_text);
        setAboutText(settings?.about_text);
      } catch {
        // Ignore error
      } finally {
        setTextsLoaded(true);
      }
    }
    loadTexts();
  }, []);

  const changeBackgroundColor = (color) => {
    ThemeStore.update((s) => {
      s.theme = { ...s.theme, backgroundColor: color };
    });
  };

  const saveBackgroundColor = async (reset) => {
    const color = reset ? defaultBackgroundColor : backgroundColor;
    if (!isEqual(color, savedBackgroundColor)) {
      try {
        await directus.singleton('settings').update({
          theme: { ...theme, backgroundColor: color },
        });
      } catch {
        // TODO: Show error message
      }
    }
    setSavedBackgroundColor(color);
    if (reset) {
      ThemeStore.update((s) => {
        s.theme = { ...s.theme, backgroundColor: color };
      });
    }
  };

  const debouncedIntroductionText = useDebounce(introductionText, 500);
  useEffect(() => {
    async function updateIntroductionText() {
      try {
        await directus.singleton('settings').update({
          introduction_text: debouncedIntroductionText,
        });
      } catch {
        // TODO: Show error message
      }
    }
    if (textsLoaded) {
      updateIntroductionText();
    }
  }, [debouncedIntroductionText, textsLoaded]);

  const debouncedAboutText = useDebounce(aboutText, 500);
  useEffect(() => {
    async function updateAboutText() {
      try {
        await directus.singleton('settings').update({
          about_text: debouncedAboutText,
        });
      } catch {
        // TODO: Show error message
      }
    }
    if (textsLoaded) {
      updateAboutText();
    }
  }, [debouncedAboutText, textsLoaded]);

  return (
    <>
      <Accordion flex="1" defaultIndex={[0]} allowToggle allowMultiple>
        <AccordionItem>
          <h2>
            <AccordionButton>
              <Box flex="1" textAlign="left" fontSize="lg" fontWeight="bold">
                {formatMessage({ id: 'background_color' })}
              </Box>
              <AccordionIcon />
            </AccordionButton>
          </h2>
          <AccordionPanel pb={4}>
            <Box width="max-content" className="react-colorful-full-width">
              <RgbaColorPicker
                color={backgroundColor}
                onChange={changeBackgroundColor}
              />
              <ButtonGroup width="100%" mt={2}>
                <Button
                  colorScheme="blue"
                  flex="1"
                  isDisabled={savedBackgroundColor === backgroundColor}
                  onClick={() => saveBackgroundColor(false)}
                >
                  {formatMessage({ id: 'save' })}
                </Button>
                <Button
                  flex="1"
                  isDisabled={
                    savedBackgroundColor === backgroundColor &&
                    isEqual(savedBackgroundColor, defaultBackgroundColor)
                  }
                  onClick={() => saveBackgroundColor(true)}
                >
                  {formatMessage({ id: 'reset' })}
                </Button>
              </ButtonGroup>
            </Box>
          </AccordionPanel>
        </AccordionItem>

        <AccordionItem>
          <h2>
            <AccordionButton>
              <Box flex="1" textAlign="left" fontSize="lg" fontWeight="bold">
                {formatMessage({ id: 'introduction_text' })}
              </Box>
              <AccordionIcon />
            </AccordionButton>
          </h2>
          <AccordionPanel pb={4}>
            <Box mt={6} maxW="700" fontSize={{ md: 18 }}>
              <Editor
                cellPlugins={[customSlateIntroduction]}
                value={introductionText}
                onChange={setIntroductionText}
                lang={locale}
                languages={Object.entries(locales).map(([l, v]) => ({
                  lang: l,
                  label: v.title,
                }))}
                childConstraints={{
                  maxChildren: 1,
                }}
                uiTranslator={uiTranslator}
              />
            </Box>
          </AccordionPanel>
        </AccordionItem>

        <AccordionItem>
          <h2>
            <AccordionButton>
              <Box flex="1" textAlign="left" fontSize="lg" fontWeight="bold">
                {formatMessage({ id: 'about_text' })}
              </Box>
              <AccordionIcon />
            </AccordionButton>
          </h2>
          <AccordionPanel pb={4}>
            <Box
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
                onChange={setAboutText}
                lang={locale}
                languages={Object.entries(locales).map(([l, v]) => ({
                  lang: l,
                  label: v.title,
                }))}
                uiTranslator={uiTranslator}
              />
            </Box>
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </>
  );
}
