import {
  Button,
  Image,
  Popover,
  PopoverContent,
  PopoverTrigger,
  useColorMode,
  VStack,
} from '@chakra-ui/react';
import NextImage from 'next/image';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';

import { directus } from '@/lib/directus';
import locales from '@/locales';
import { LocaleStore } from '@/stores/LocaleStore';

export default function LocaleMenu() {
  const { formatMessage } = useIntl();
  const locale = LocaleStore.useState((s) => s.locale);
  const { colorMode } = useColorMode();
  const [icons, setIcons] = useState({});

  useEffect(() => {
    async function getIcons() {
      const i = {};
      for (const l of Object.keys(locales)) {
        i[l] = (await import(`language-icons/icons/${l}.svg`)).default;
      }
      setIcons(i);
    }
    getIcons();
  }, []);

  if (Object.keys(icons).length === 0) {
    return (
      <Button
        colorScheme={colorMode === 'light' ? 'blackAlpha' : 'gray'}
        variant="ghost"
        aria-label={formatMessage({ id: 'language' })}
        isLoading={true}
      />
    );
  }
  return (
    <Popover isLazy lazyBehavior="keepMounted" trigger="hover">
      {({ isOpen, onClose }) => (
        <>
          <PopoverTrigger>
            <Button
              display="block"
              padding={1.5}
              colorScheme={colorMode === 'light' ? 'blackAlpha' : 'gray'}
              variant="ghost"
              aria-label={formatMessage({ id: 'language' })}
            >
              <Image
                as={NextImage}
                transition="0.2s filter ease-in-out"
                filter={
                  isOpen
                    ? 'grayscale(0%) opacity(1)'
                    : 'grayscale(60%) opacity(0.8)'
                }
                borderRadius="full"
                layout="responsive"
                src={icons[locale]}
                alt={locales[locale].title}
                title={locales[locale].title}
              />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            border="none"
            boxShadow="none"
            backgroundColor="transparent"
            width="max-content"
          >
            <VStack spacing={1.5}>
              {Object.keys(locales)
                .filter((l) => l !== locale)
                .map((l) => (
                  <Button
                    key={l}
                    transition="transform .4s ease-in-out"
                    _hover={{
                      transform: 'scale(1.1)',
                    }}
                    variant="ghost"
                    colorScheme=""
                    aria-label={locales[l].title}
                    title={locales[l].title}
                    onClick={async () => {
                      onClose();
                      LocaleStore.update((s) => {
                        s.locale = l;
                      });
                      try {
                        await directus.users.me.update({
                          language: `${l}-${locales[l].region}`,
                        });
                      } catch {
                        // Ignore error
                      }
                    }}
                  >
                    <Image
                      as={NextImage}
                      borderRadius="full"
                      layout="fill"
                      src={icons[l]}
                      alt={locales[l].title}
                    />
                  </Button>
                ))}
            </VStack>
          </PopoverContent>
        </>
      )}
    </Popover>
  );
}
