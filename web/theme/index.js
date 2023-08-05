import { extendTheme } from '@chakra-ui/react';

import Drawer from './components/drawer';
import Heading from './components/heading';
import Modal from './components/modal';
import typography from './foundations/typography';
import styles from './styles';

const config = {
	initialColorMode: 'system',
	useSystemColorMode: true,
};

const theme = {
	semanticTokens: {
		colors: {
			bg: {
				_light: '#C8C6D7',
				_dark: 'gray.700',
			},
		},
	},
	...typography,
	components: {
		Drawer,
		Heading,
		Modal,
	},
	styles,
	config,
};

export default extendTheme(theme);
