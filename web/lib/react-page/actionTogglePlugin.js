import { Button } from '@chakra-ui/react';
import { pluginFactories } from '@react-page/plugins-slate';

import { ActionToggle } from '@/components/application/Action';

export default pluginFactories.createComponentPlugin({
  addHoverButton: true,
  addToolbarButton: false,
  type: 'actionToggle',
  object: 'inline',
  icon: <span style={{ fontSize: '0.6em' }}>Action Toggle</span>,
  label: 'Action Toggle',
  Component: ({ children }) => (
    <ActionToggle
      as={Button}
      fontSize="inherit"
      variant="link"
      colorScheme="black"
      fontWeight="bold"
      verticalAlign="inherit"
    >
      {children}
    </ActionToggle>
  ),
});
