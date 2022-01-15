import '@react-page/editor/lib/index.css';

import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
} from '@chakra-ui/react';
import Editor from '@react-page/editor';
import { useCallback, useEffect, useState } from 'react';
import { useIntl } from 'react-intl';

import { useDebounce } from '@/lib/debounce';
import { directus } from '@/lib/directus';
import {
  customSlateAbout,
  customSlateIntroduction,
} from '@/lib/react-page/plugins';
import locales from '@/locales';

export default function Customization({ settings }) {
  const { formatMessage, locale } = useIntl();
  const [introductionText, setIntroductionText] = useState(
    settings?.introduction_text
  );
  const [aboutText, setAboutText] = useState(settings?.about_text);
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
    // Should never be empty, even without any content
    if (debouncedIntroductionText) {
      updateIntroductionText();
    }
  }, [debouncedIntroductionText]);

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
    // Should never be empty, even without any content
    if (debouncedAboutText) {
      updateAboutText();
    }
  }, [debouncedAboutText]);

  return (
    <>
      <Accordion flex="1" allowToggle>
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
