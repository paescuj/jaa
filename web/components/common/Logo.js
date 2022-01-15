import { Heading } from '@chakra-ui/react';
import { motion } from 'framer-motion';

const MotionHeading = motion(Heading);

export default function Logo(props) {
  return (
    <MotionHeading
      as="h1"
      size="2xl"
      bgGradient="linear-gradient(to right, #12c2e9, #c471ed, #f64f59)"
      bgClip="text"
      initial={{
        backgroundPosition: '200% 0%',
        backgroundSize: '250% 100%',
      }}
      animate={{
        backgroundPosition: '0% 0%',
        backgroundSize: '100% 100%',
      }}
      transition={{
        duration: 2,
      }}
      {...props}
    >
      Job Application Assistant
    </MotionHeading>
  );
}
