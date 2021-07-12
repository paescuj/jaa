import { Box, Flex, Link, Text } from '@chakra-ui/react';

export default function Footer({ linePadding = 4, isSmallScreen }) {
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
          {isSmallScreen && <br />} von{' '}
          <Link href="https://paescuj.ch" isExternal>
            Pascal Jufer
          </Link>
        </Text>
      </Flex>
    </footer>
  );
}
