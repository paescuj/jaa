import { Box, Flex, IconButton, Tooltip, useColorMode } from '@chakra-ui/react';
import { AnimatePresence, motion } from 'framer-motion';
import { LogOut, MoonSat, SunLight } from 'iconoir-react';
import { useRouter } from 'next/router';

const MotionBox = motion(Box);

export default function Header({ title }) {
  const router = useRouter();
  const { colorMode, toggleColorMode } = useColorMode();

  return (
    <Flex as="header" justify="space-between" align="center">
      {title}
      <Flex>
        <Tooltip
          hasArrow
          label={`Wechsle zu ${
            colorMode === 'light' ? 'Nachtmodus' : 'Tagesmodus'
          }`}
        >
          <IconButton
            onClick={toggleColorMode}
            variant="ghost"
            overflow="hidden"
            colorScheme={colorMode === 'light' ? 'blackAlpha' : 'gray'}
            color={colorMode === 'light' ? 'gray.600' : 'gray.400'}
            aria-label={`Wechsle zu ${
              colorMode === 'light' ? 'Nachtmodus' : 'Tagesmodus'
            }`}
            icon={
              <AnimatePresence initial={false} exitBeforeEnter>
                <MotionBox
                  key={colorMode}
                  initial={{ y: '110%', opacity: 0 }}
                  animate={{ y: '0%', opacity: 1 }}
                  exit={{ y: '110%', opacity: 0 }}
                >
                  {colorMode === 'light' ? <SunLight /> : <MoonSat />}
                </MotionBox>
              </AnimatePresence>
            }
          />
        </Tooltip>
        <Tooltip hasArrow label="Abmelden">
          <IconButton
            as="a"
            href="/logout"
            onClick={(e) => {
              e.preventDefault();
              router.push(e.currentTarget.href);
            }}
            variant="ghost"
            colorScheme={colorMode === 'light' ? 'blackAlpha' : 'gray'}
            color={colorMode === 'light' ? 'gray.600' : 'gray.400'}
            aria-label="Abmelden"
            icon={<LogOut />}
          />
        </Tooltip>
      </Flex>
    </Flex>
  );
}
