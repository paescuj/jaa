import { Box } from '@chakra-ui/react';
import Script from 'next/script';
import { useEffect, useRef } from 'react';
import { useIntl } from 'react-intl';

export function ChatToggle(props) {
  const ref = useRef();

  useEffect(() => {
    if (ref.current) {
      const button = ref.current;

      const toggle = () => {
        button.addEventListener('click', () => window.$chatwoot.toggle());
      };

      if (window.$chatwoot?.hasLoaded) {
        toggle();
      } else {
        window.addEventListener('chatwoot:ready', toggle);
        return () => {
          window.removeEventListener('chatwoot:ready', toggle);
          button.removeEventListener('click', () => window.$chatwoot.toggle());
        };
      }
    }
  }, [ref]);

  return (
    <Box {...props} ref={ref}>
      {props.children}
    </Box>
  );
}

export default function Chat({ hash, identifier, name, token, url }) {
  const { locale } = useIntl();

  useEffect(() => {
    window.chatwootSettings = {
      darkMode: 'auto',
      hideMessageBubble: true,
    };

    const setup = () => {
      window.$chatwoot.setUser(identifier, {
        name: name,
        identifier_hash: hash,
      });
      window.$chatwoot.setCustomAttributes({
        job: name,
      });
    };

    window.addEventListener('chatwoot:ready', setup);

    return () => {
      window.removeEventListener('chatwoot:ready', setup);
      window.$chatwoot.toggle('close');
    };
  }, [hash, identifier, name, token, url]);

  useEffect(() => {
    if (window.$chatwoot?.hasLoaded) {
      // See https://github.com/chatwoot/chatwoot/issues/1374
      window.$chatwoot.setLocale(locale);
    }
  }, [locale]);

  return (
    <>
      <Script
        src={url + '/packs/js/sdk.js'}
        onLoad={() => {
          window.chatwootSDK.run({
            websiteToken: token,
            baseUrl: url,
          });
        }}
      />
    </>
  );
}
