import { Box } from '@chakra-ui/react';
import { useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';

export function ChatToggle(props) {
  const ref = useRef();

  useEffect(() => {
    if (ref.current) {
      const button = ref.current;

      const toggle = () => {
        button.addEventListener('click', () => window.$chatwoot.toggle());
      };

      window.addEventListener('chatwoot:ready', toggle);

      return () => {
        window.removeEventListener('chatwoot:ready', toggle);
        button.removeEventListener('click', () => window.$chatwoot.toggle());
      };
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
  const [chatLoaded, setChatLoaded] = useState(false);

  useEffect(() => {
    window.chatwootSettings = {
      darkMode: 'auto',
      hideMessageBubble: true,
    };

    (function (d, t) {
      var BASE_URL = url;
      var g = d.createElement(t),
        s = d.getElementsByTagName(t)[0];
      g.id = 'woot-script';
      g.src = BASE_URL + '/packs/js/sdk.js';
      g.defer = true;
      g.async = true;
      s.parentNode.insertBefore(g, s);
      g.onload = function () {
        window.chatwootSDK.run({
          websiteToken: token,
          baseUrl: BASE_URL,
        });
      };
    })(document, 'script');

    const setup = () => {
      setChatLoaded(true);
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
      window.$chatwoot.reset();
      document
        .querySelectorAll(
          '#woot-script, .woot--bubble-holder, .woot-widget-holder'
        )
        .forEach((el) => el.remove());
    };
  }, [hash, identifier, name, token, url]);

  useEffect(() => {
    if (chatLoaded) {
      window.$chatwoot.setLocale(locale);
      // See https://github.com/chatwoot/chatwoot/issues/1374
    }
  }, [chatLoaded, locale]);

  return null;
}
