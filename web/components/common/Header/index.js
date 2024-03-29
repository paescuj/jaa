import { Box, Flex, IconButton, Tooltip, useColorMode } from '@chakra-ui/react';
import { AnimatePresence, motion } from 'framer-motion';
import { LogOut, MoonSat, SunLight } from 'iconoir-react';
import NextLink from 'next/link';
import { useIntl } from 'react-intl';

import LocaleMenu from './LocaleMenu';

const MotionBox = motion(Box);

export default function Header({ title }) {
	const { colorMode, toggleColorMode } = useColorMode();
	const { formatMessage } = useIntl();

	// See '_app.js'
	const onToggleColorMode = () => {
		localStorage.setItem('chakra-ui-custom-color-mode', 'true');
		toggleColorMode();
	};

	return (
		<Flex as="header" justify="space-between" align="center">
			{title}
			<Flex>
				<LocaleMenu />

				<Tooltip
					hasArrow
					label={
						colorMode === 'light'
							? formatMessage({ id: 'light_mode' })
							: formatMessage({ id: 'dark_mode' })
					}
				>
					<IconButton
						onClick={onToggleColorMode}
						variant="ghost"
						overflow="hidden"
						colorScheme={colorMode === 'light' ? 'blackAlpha' : 'gray'}
						color={colorMode === 'light' ? 'gray.600' : 'gray.400'}
						aria-label={
							colorMode === 'light'
								? formatMessage({ id: 'light_mode' })
								: formatMessage({ id: 'dark_mode' })
						}
						icon={
							<AnimatePresence initial={false} mode="wait">
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

				<Tooltip hasArrow label={formatMessage({ id: 'logout' })}>
					<IconButton
						as={NextLink}
						href="/logout"
						variant="ghost"
						colorScheme={colorMode === 'light' ? 'blackAlpha' : 'gray'}
						color={colorMode === 'light' ? 'gray.600' : 'gray.400'}
						aria-label={formatMessage({ id: 'logout' })}
						icon={<LogOut />}
					/>
				</Tooltip>
			</Flex>
		</Flex>
	);
}
