import { Box, Spinner, VStack } from '@chakra-ui/react';
import { AnimatePresence, motion } from 'framer-motion';

const MotionBox = motion(Box);

export default function Loader({ text, displayText }) {
  return (
    <MotionBox
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { delay: 0.5 } }}
    >
      <VStack>
        <Spinner
          thickness="4px"
          speed="0.65s"
          color="blue.500"
          label={text}
          size="xl"
        />
        <AnimatePresence exitBeforeEnter>
          {displayText && (
            <MotionBox
              key={text}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { delay: 0.5 } }}
            >
              {text}
            </MotionBox>
          )}
        </AnimatePresence>
      </VStack>
    </MotionBox>
  );
}

Loader.defaultProps = {
  text: 'Loading...',
};
