import 'tippy.js/dist/tippy.css';

import { Box, Link } from '@chakra-ui/react';
import Tippy from '@tippyjs/react';
import { OpenInWindow } from 'iconoir-react';
import { useEffect, useState } from 'react';
import { followCursor } from 'tippy.js';

import { getBearer, url as directusUrl } from '../lib/directus';

// Hide tooltip when loosing focus (keyboard navigation)
const hideOnPopperBlur = {
  name: 'hideOnPopperBlur',
  defaultValue: true,
  fn(instance) {
    return {
      onCreate() {
        instance.popper.addEventListener('focusout', (event) => {
          if (
            instance.props.hideOnPopperBlur &&
            event.relatedTarget &&
            !instance.popper.contains(event.relatedTarget)
          ) {
            instance.hide();
          }
        });
      },
    };
  },
};

export default function JobPopup({ link, previewUrl, children }) {
  const [previewImg, setPreviewImg] = useState('');

  useEffect(() => {
    if (previewUrl) {
      getBearer().then((bearer) => {
        fetch(`${directusUrl}/assets/${previewUrl}`, {
          method: 'GET',
          headers: { Authorization: bearer },
        }).then(async (response) => {
          const blob = await response.blob();
          const objectUrl = URL.createObjectURL(blob);
          setPreviewImg(objectUrl);
        });
      });
    }
  }, [previewUrl]);

  return (
    <span>
      <Tippy
        followCursor
        interactive
        placement="bottom"
        theme="chakra"
        offset={[0, 20]}
        plugins={[followCursor, hideOnPopperBlur]}
        content={
          <>
            <Link
              d="inline-flex"
              alignContent="center"
              mb="1"
              href={link}
              isExternal
            >
              Stelleninserat auf {new URL(link).hostname}
              <Box
                as="span"
                d="inline-flex"
                sx={{ alignItems: 'center' }}
                ml="1"
              >
                <OpenInWindow width="1em" height="1em" />
              </Box>
            </Link>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewImg} alt="Job-Vorschau" />
          </>
        }
      >
        <button>{children}</button>
      </Tippy>
    </span>
  );
}
