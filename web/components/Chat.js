import { Button } from '@chakra-ui/react';
import Script from 'next/script';
import { useEffect, useRef } from 'react';

export function ChatToggle(props) {
  const buttonRef = useRef();

  useEffect(() => {
    if (buttonRef.current) {
      const button = buttonRef.current;

      const toggle = () => {
        button.addEventListener('click', () => window.$chatwoot.toggle());
      };

      window.addEventListener('chatwoot:ready', toggle);

      return () => {
        window.removeEventListener('chatwoot:ready', toggle);
        button.removeEventListener('click', () => window.$chatwoot.toggle());
      };
    }
  }, [buttonRef]);

  return (
    <Button {...props} ref={buttonRef}>
      {props.children}
    </Button>
  );
}

export default function Chat({ url, token, identifier, name, hash }) {
  useEffect(() => {
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
      window.$chatwoot.reset();
      document
        .querySelectorAll(
          '#woot-script, .woot--bubble-holder, .woot-widget-holder'
        )
        .forEach((el) => el.remove());
    };
  }, [hash, identifier, name]);

  return (
    <Script id="woot-script" strategy="lazyOnload">
      {`
        (function(d,t) {
              var BASE_URL="${url}";
              var g=d.createElement(t),s=d.getElementsByTagName(t)[0];
              g.src=BASE_URL+"/packs/js/sdk.js";
              s.parentNode.insertBefore(g,s);
              g.onload=function(){
                window.chatwootSDK.run({
                  websiteToken: '${token}',
                  baseUrl: BASE_URL
                })
              }
            })(document,"script");
      `}
    </Script>
  );
}
