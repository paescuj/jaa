import {
  Box,
  Button,
  Center,
  Divider,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerOverlay,
  Grid,
  Heading,
  IconButton,
  Tooltip,
  useBreakpointValue,
  useColorMode,
  useDisclosure,
} from '@chakra-ui/react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Download, DragHandGesture, EyeOff, ZoomIn } from 'iconoir-react';
import { createRef, useCallback, useState } from 'react';
import { Flipped, spring } from 'react-flip-toolkit';

import { highlight } from '../lib/search';
import { DocumentStore } from '../store/DocumentStore';
import Pdf from './Pdf';

const onElementAppear = (el, index) =>
  spring({
    onUpdate: (val) => {
      el.style.opacity = val;
    },
    delay: index * 50,
  });

const onExit = (type) => (el, index, removeElement) => {
  // Optimize exit effect
  el.style.pointerEvents = 'none';
  if (type === 'grid') {
    el.querySelector('.react-pdf__Document').style.display = 'none';
  }
  spring({
    config: { overshootClamping: true },
    onUpdate: (val) => {
      el.style.opacity = (val - 1) * -1;
      el.style.transform = `scale${type === 'grid' ? 'X' : 'Y'}(${1 - val})`;
    },
    delay: index * 50,
    onComplete: removeElement,
  });

  return () => {
    removeElement();
  };
};
const onGridExit = onExit('grid');
const onListExit = onExit('list');

function VariableButton({
  variant,
  text,
  Icon,
  onClick,
  buttonProps,
  tooltipProps,
}) {
  switch (variant) {
    case 'Button':
      return (
        <Button
          size="sm"
          variant="ghost"
          colorScheme="blue"
          onClick={onClick}
          aria-label={text}
          leftIcon={<Icon />}
          {...buttonProps}
        >
          {text}
        </Button>
      );
    case 'IconButton':
    default:
      return (
        <Tooltip hasArrow label={text} {...tooltipProps}>
          <IconButton
            size="sm"
            variant="ghost"
            colorScheme="blue"
            onClick={onClick}
            aria-label={text}
            icon={<Icon />}
            {...buttonProps}
          />
        </Tooltip>
      );
  }
}

export default function Card({
  id,
  title,
  file,
  grid,
  addToFilteredDocuments,
}) {
  const flipId = `card-${id}`;
  const {
    isOpen: drawerIsOpen,
    onOpen: drawerOnOpen,
    onClose: drawerOnClose,
  } = useDisclosure();
  const shouldFlip = (prev, current) => {
    if (prev.grid !== current.grid) {
      return true;
    }
    return false;
  };
  const [cardSwiper, setCardSwiper] = useState(null);
  const [gridAfterAnimation, setGridAfterAnimation] = useState();
  const screenSize = useBreakpointValue({
    base: 'small',
    sm: 'small',
    md: 'large',
  });
  const results = DocumentStore.useState((s) => s.results[id], [id]);
  const { colorMode } = useColorMode();
  const downloadLink = createRef();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging && 999,
  };

  const renderTitle = useCallback(
    (text) => {
      if (results && results.title !== undefined) {
        return highlight(text, results.title, 'rgba(0, 0, 255, 0.1)');
      } else {
        return text;
      }
    },
    [results]
  );

  // Update grid value once animation is completed
  const onComplete = () => {
    setGridAfterAnimation(grid);
  };

  const generateDownload = async (e) => {
    // Skip if already generated
    if (downloadLink.current.getAttribute('href') !== '#') {
      return;
    }
    // Prevent link action
    e.preventDefault();
    // Deep copy file object to modify authorization header
    const newFile = JSON.parse(JSON.stringify(file));
    // If "Authorization" is a function replace it by its return value
    if (file?.httpHeaders?.Authorization instanceof Function) {
      newFile.httpHeaders.Authorization =
        await file.httpHeaders.Authorization();
    }
    const result = await fetch(`${newFile.url}?download`, {
      headers: { ...newFile.httpHeaders },
    });
    const blob = await result.blob();
    const href = window.URL.createObjectURL(blob);
    downloadLink.current.download = newFile.filename;
    downloadLink.current.href = href;
    downloadLink.current.click();
  };

  return (
    <>
      <Flipped
        flipId={flipId}
        onAppear={onElementAppear}
        onExit={grid ? onGridExit : onListExit}
        onComplete={onComplete}
        stagger
        shouldInvert={shouldFlip}
      >
        <Box
          ref={setNodeRef}
          style={style}
          bg={colorMode === 'light' ? 'white' : '#191919'}
          borderRadius="md"
          sx={{ transition: 'box-shadow 0.3s linear' }}
          _hover={{
            boxShadow: '2xl',
          }}
          overflow="hidden"
        >
          <Flipped inverseFlipId={flipId}>
            <Box>
              <Grid
                p="3"
                templateColumns="1fr repeat(2, auto)"
                alignItems="center"
              >
                <Flipped
                  flipId={`${flipId}-content`}
                  translate
                  shouldFlip={shouldFlip}
                  delayUntil={flipId}
                >
                  <Heading as="h4" size="md" isTruncated>
                    {renderTitle(title)}
                  </Heading>
                </Flipped>
                <Flipped
                  flipId={`${flipId}-menu`}
                  translate
                  shouldFlip={shouldFlip}
                  delayUntil={flipId}
                >
                  <Box
                    gridRow={!grid && screenSize === 'small' && 2}
                    gridColumn={!grid && screenSize === 'small' && 'span 3'}
                  >
                    {screenSize !== 'small' && (
                      <VariableButton
                        variant={
                          !gridAfterAnimation && !grid ? 'Button' : 'IconButton'
                        }
                        text="Vollbild"
                        Icon={ZoomIn}
                        onClick={drawerOnOpen}
                      />
                    )}
                    <VariableButton
                      variant={
                        !gridAfterAnimation && !grid ? 'Button' : 'IconButton'
                      }
                      buttonProps={{
                        as: 'a',
                        href: '#',
                        ref: downloadLink,
                      }}
                      text="Herunterladen"
                      Icon={Download}
                      onClick={generateDownload}
                    />
                    <VariableButton
                      variant={
                        !gridAfterAnimation && !grid ? 'Button' : 'IconButton'
                      }
                      text="Verstecken"
                      Icon={EyeOff}
                      onClick={() => addToFilteredDocuments(id)}
                    />
                  </Box>
                </Flipped>
                {(!grid || screenSize !== 'small') && (
                  <Flipped
                    flipId={`${flipId}-drag`}
                    translate
                    shouldFlip={shouldFlip}
                    delayUntil={flipId}
                  >
                    <Box>
                      <VariableButton
                        variant={
                          !gridAfterAnimation && !grid && screenSize !== 'small'
                            ? 'Button'
                            : 'IconButton'
                        }
                        buttonProps={{
                          size: 'sm',
                          variant: 'ghost',
                          ...attributes,
                          ...listeners,
                          cursor: 'grab',
                          _active: { cursor: 'grabbing' },
                          sx: { touchAction: 'none' },
                        }}
                        tooltipProps={{ isDisabled: isDragging }}
                        text="Verschieben"
                        Icon={DragHandGesture}
                      />
                    </Box>
                  </Flipped>
                )}
              </Grid>
              {grid && gridAfterAnimation && <Divider />}
              {grid && (
                <Pdf
                  id={id}
                  file={file}
                  cardSwiper={cardSwiper}
                  setCardSwiper={setCardSwiper}
                />
              )}
            </Box>
          </Flipped>
        </Box>
      </Flipped>
      <Drawer
        isOpen={drawerIsOpen}
        placement="top"
        isCentered
        isFullHeight
        onClose={drawerOnClose}
      >
        <DrawerOverlay>
          <DrawerContent>
            <DrawerCloseButton colorScheme={colorMode === 'dark' && 'gray'} />
            <DrawerBody onClick={drawerOnClose}>
              <Center h="100%">
                <Pdf id={id} file={file} cardSwiper={cardSwiper} fullscreen />
              </Center>
            </DrawerBody>
          </DrawerContent>
        </DrawerOverlay>
      </Drawer>
    </>
  );
}
