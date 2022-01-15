import { Box, Flex, Link, Text } from '@chakra-ui/react';
import { useIntl } from 'react-intl';

export default function Footer({ linePadding = 4, isSmallScreen }) {
  const { formatMessage } = useIntl();

  return (
    <footer>
      <Box py={linePadding}>
        <hr />
      </Box>
      <Flex justify="center">
        <Text textAlign="center">
          <Link href="https://github.com/paescuj/jaa" isExternal>
            «Job Application Assistant»
          </Link>
          {isSmallScreen && <br />} {formatMessage({ id: 'by' })}{' '}
          <Link href="https://paescuj.ch" isExternal>
            Pascal Jufer
          </Link>
        </Text>
      </Flex>
    </footer>
  );
}
