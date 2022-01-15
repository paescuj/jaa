import '@react-page/plugins-slate/lib/index.css';

import { Heading, Link } from '@chakra-ui/react';
import slate from '@react-page/plugins-slate';
import NextLink from 'next/link';

import actionTogglePlugin from './actionTogglePlugin';
import jobPopupPlugin from './jobPopupPlugin';
import motionItemPlugin from './motionItemPlugin';
import motionWrapperPlugin from './motionWrapperPlugin';

const components = (config) => ({
  link: {
    ...config.plugins.link,
    link: config.plugins.link.link((def) => ({
      ...def,
      Component: ({ href, openInNewWindow, color, children }) => (
        <NextLink href={href} passHref>
          <Link isExternal={openInNewWindow} color={color} fontWeight="bold">
            {children}
          </Link>
        </NextLink>
      ),
      controls: {
        ...def.controls,
        schema: {
          ...def.controls.schema,
          properties: {
            ...def.controls.schema.properties,
            color: {
              type: 'string',
            },
          },
        },
      },
    })),
  },
  headings: {
    h1: config.plugins.headings.h1((def) => ({
      ...def,
      Component: ({ style, children }) => (
        <Heading as="h1" size="2xl" mb="2" style={style}>
          {children}
        </Heading>
      ),
    })),
    h2: config.plugins.headings.h2((def) => ({
      ...def,
      Component: ({ style, children }) => (
        <Heading as="h2" size="xl" mb="2" style={style}>
          {children}
        </Heading>
      ),
    })),
    h3: config.plugins.headings.h3((def) => ({
      ...def,
      Component: ({ style, children }) => (
        <Heading as="h3" size="lg" style={style}>
          {children}
        </Heading>
      ),
    })),
    h4: config.plugins.headings.h4((def) => ({
      ...def,
      Component: ({ style, children }) => (
        <Heading as="h4" size="md" style={style}>
          {children}
        </Heading>
      ),
    })),
    h5: config.plugins.headings.h5((def) => ({
      ...def,
      Component: ({ style, children }) => (
        <Heading as="h5" size="sm" style={style}>
          {children}
        </Heading>
      ),
    })),
    h6: config.plugins.headings.h6((def) => ({
      ...def,
      Component: ({ style, children }) => (
        <Heading as="h6" size="xs" style={style}>
          {children}
        </Heading>
      ),
    })),
  },
});

export const customSlateIntroduction = slate((config) => {
  return {
    ...config,
    plugins: {
      ...config.plugins,
      ...components(config),
      customPlugins: {
        actionToggle: actionTogglePlugin,
        jobPopup: jobPopupPlugin,
      },
    },
  };
});

export const customSlateAbout = slate((config) => {
  return {
    ...config,
    plugins: {
      ...config.plugins,
      ...components(config),
      customPlugins: {
        motionWrapper: motionWrapperPlugin,
        motionItem: motionItemPlugin,
      },
    },
  };
});
