import { Box } from '@chakra-ui/react';
import { pluginFactories } from '@react-page/plugins-slate';
import { motion } from 'framer-motion';

const MotionBox = motion(Box);

export default pluginFactories.createComponentPlugin({
  addHoverButton: true,
  addToolbarButton: true,
  type: 'motionItem',
  object: 'block',
  icon: <span style={{ fontSize: '0.6em' }}>Motion Item</span>,
  label: 'Motion Item',
  Component: ({ children }) => (
    <MotionBox
      variants={{
        hidden: { opacity: 0, translateY: '-20px' },
        show: { opacity: 1, translateY: 0 },
      }}
      transition={{ duration: 1 }}
      mb="4"
    >
      {children}
    </MotionBox>
  ),
});
