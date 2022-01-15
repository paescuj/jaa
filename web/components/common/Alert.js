import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Button,
  useDisclosure,
} from '@chakra-ui/react';
import { useRef } from 'react';

export default function Alert({ title, message, actions }) {
  const { isOpen, onClose } = useDisclosure({ defaultIsOpen: true });
  const leastDestructiveRef = useRef();

  return (
    <AlertDialog
      isOpen={isOpen}
      leastDestructiveRef={leastDestructiveRef}
      onClose={onClose}
      closeOnEsc={false}
      closeOnOverlayClick={false}
      size="lg"
      isCentered
    >
      <AlertDialogOverlay>
        <AlertDialogContent>
          <AlertDialogHeader fontSize="xl" fontWeight="bold">
            {title}
          </AlertDialogHeader>

          <AlertDialogBody sx={{ whiteSpace: 'pre-line' }}>
            {message}
          </AlertDialogBody>

          <AlertDialogFooter>
            {actions.map((action, index) => (
              <Button
                key={index}
                ref={action.leastDestructive && leastDestructiveRef}
                {...action.props}
                ml={index !== 0 && 2}
                onClick={(e) => {
                  if (action.action) {
                    action.action(e);
                  }
                  if (action.close) {
                    onClose();
                  }
                }}
              >
                {action.text}
              </Button>
            ))}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
}
