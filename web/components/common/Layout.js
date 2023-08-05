import { Flex } from '@chakra-ui/react';
import { motion } from 'framer-motion';

const MotionFlex = motion(Flex);

export default function Layout(props) {
	return (
		<MotionFlex
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			direction="column"
			p={4}
			maxW={{ xl: '1200px' }}
			minH="100vh"
			m="0 auto"
			{...props}
		/>
	);
}
