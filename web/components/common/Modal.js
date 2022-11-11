import {
  Box,
  Button,
  ButtonGroup,
  Modal as ChakraModal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  useDisclosure,
} from '@chakra-ui/react';
import { useRef, useState } from 'react';

export function useModal({
  initialData,
  clearDataOnClose,
  onOpen,
  onClose,
} = {}) {
  const [d, setD] = useState(initialData);
  const {
    isOpen,
    onOpen: o,
    onClose: c,
  } = useDisclosure({
    onOpen,
    onClose: () => {
      if (clearDataOnClose) {
        setD();
      }
      if (onClose) {
        onClose();
      }
    },
  });

  const open = (data) => {
    if (data) {
      setD(data);
    }
    o();
  };

  return {
    isOpen,
    open,
    close: c,
    data: d,
    setData: setD,
  };
}

export default function Modal({
  state,
  title,
  content,
  actions,
  secondaryActions,
  ...props
}) {
  if (state) {
    props.isOpen = state.isOpen;
    props.onOpen = state.open;
    props.onClose = state.close;
  }

  let t;
  if (title instanceof Function && state.data) {
    t = title(state.data);
  } else {
    t = title;
  }

  let c;
  if (content instanceof Function && state.data) {
    c = content(state.data);
  } else {
    c = content;
  }

  let a;
  if (actions instanceof Function) {
    a = actions(state.data);
  } else {
    a = actions;
  }

  const ref = useRef();
  if (a?.some((action) => action.initialFocus)) {
    props.initialFocusRef = ref;
  }

  return (
    <ChakraModal {...props}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{t}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>{c}</ModalBody>
        <ModalFooter>
          {secondaryActions && (
            <Box flex="1">
              {secondaryActions.map((action, index) => (
                <Button
                  key={index}
                  variant="link"
                  onClick={(e) => {
                    if (action.action) {
                      action.action(e);
                    }
                    if (action.close) {
                      props.onClose();
                    }
                  }}
                  {...action.props}
                >
                  {action.text}
                </Button>
              ))}
            </Box>
          )}
          {a && (
            <ButtonGroup spacing="2">
              {a.map((action, index) => (
                <Button
                  key={index}
                  ref={action.initialFocus && ref}
                  onClick={(e) => {
                    if (action.action) {
                      action.action(e);
                    }
                    if (action.close) {
                      props.onClose();
                    }
                  }}
                  {...action.props}
                >
                  {action.text}
                </Button>
              ))}
            </ButtonGroup>
          )}
        </ModalFooter>
      </ModalContent>
    </ChakraModal>
  );
}
