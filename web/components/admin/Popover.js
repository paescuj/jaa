import {
  Button,
  ButtonGroup,
  Popover as ChakraPopover,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverFooter,
  PopoverHeader,
  PopoverTrigger,
} from '@chakra-ui/react';
import { useRef } from 'react';
import { useIntl } from 'react-intl';

export default function Popover({
  mode,
  onConfirm,
  children,
  header,
  body,
  actions,
  ...props
}) {
  const ref = useRef();
  const { formatMessage } = useIntl();

  if (mode === 'confirmation') {
    header ??= formatMessage({
      id: 'confirmation',
    });
    actions ??= [
      {
        text: formatMessage({
          id: 'cancel',
        }),
        initialFocus: true,
        close: true,
      },
      {
        text: formatMessage({
          id: 'confirm',
        }),
        action: onConfirm,
        close: true,
        props: { colorScheme: 'red' },
      },
    ];
  }

  if (actions?.some((action) => action.initialFocus)) {
    props.initialFocusRef = ref;
  }

  return (
    <ChakraPopover isLazy lazyBehavior="keepMounted" {...props}>
      {({ onClose }) => (
        <>
          <PopoverTrigger>{children}</PopoverTrigger>
          <PopoverContent>
            <PopoverHeader fontWeight="semibold">{header}</PopoverHeader>
            <PopoverArrow />
            <PopoverCloseButton />
            <PopoverBody>{body}</PopoverBody>
            {actions && (
              <PopoverFooter d="flex" justifyContent="flex-end">
                <ButtonGroup d="flex" size="sm">
                  {actions.map((action, index) => (
                    <div key={index}>
                      {action.confirmation ? (
                        <Popover mode="confirmation" {...action.confirmation}>
                          <Button {...action.props}>{action.text}</Button>
                        </Popover>
                      ) : (
                        <Button
                          ref={action.initialFocus && ref}
                          onClick={(e) => {
                            if (action.action) {
                              action.action(e);
                            }
                            if (action.close) {
                              onClose();
                            }
                          }}
                          {...action.props}
                        >
                          {action.text}
                        </Button>
                      )}
                    </div>
                  ))}
                </ButtonGroup>
              </PopoverFooter>
            )}
          </PopoverContent>
        </>
      )}
    </ChakraPopover>
  );
}
