import {
  Box,
  Center,
  Collapse,
  Flex,
  useBreakpointValue,
  useColorMode,
} from '@chakra-ui/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import ReactDOMServer from 'react-dom/server';
import { useIntl } from 'react-intl';
import Measure from 'react-measure';
import { Document, Page, pdfjs } from 'react-pdf';
import { A11y, Controller, Keyboard, Navigation, Pagination } from 'swiper';
import { Swiper, SwiperSlide } from 'swiper/react';

import Loader from '@/components/common/Loader';
import { highlight } from '@/lib/search';
import { DocumentStore } from '@/stores/DocumentStore';
import workerSrc from '@/workers/pdf';

// See https://github.com/wojtekmaj/react-pdf/issues/136
pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

const MotionFlex = motion(Flex);

export default function Pdf({
  id,
  file,
  cardSwiper,
  setCardSwiper,
  fullscreen,
}) {
  const { colorMode } = useColorMode();
  const { formatMessage } = useIntl();

  const [transformedFile, setTransformedFile] = useState();
  const [documentLoaded, setDocumentLoaded] = useState(false);
  const [pageRendered, setPageRendered] = useState([]);
  const [totalPageNumber, setTotalPageNumber] = useState(null);
  const [fullscreenSwiper, setFullscreenSwiper] = useState(null);
  const [mesWidth, setWidth] = useState(-1);
  const [mesHeight, setHeight] = useState(-1);
  const screenSize = useBreakpointValue({
    base: 'base',
    sm: 'sm',
    md: 'md',
    lg: 'lg',
  });
  const currentPageIndex = DocumentStore.useState((s) => s.state[id], [id]);
  const results = DocumentStore.useState((s) => s.results[id], [id]);

  // Transform file object
  useEffect(() => {
    async function transformFile() {
      // Deep copy
      const newFile = JSON.parse(JSON.stringify(file));
      // If "Authorization" is a function replace it by its return value
      if (file?.httpHeaders?.Authorization instanceof Function) {
        newFile.httpHeaders.Authorization =
          await file.httpHeaders.Authorization();
      }
      setTransformedFile(newFile);
    }
    transformFile();
  }, [file]);

  // Stop event bubbling on swiper controls in fullscreen mode
  useEffect(() => {
    if (fullscreen) {
      document
        .querySelectorAll(
          `.chakra-modal__body .swiper-button-next,
          .chakra-modal__body .swiper-button-prev,
          .chakra-modal__body .swiper-pagination`
        )
        .forEach((el) =>
          el.addEventListener('click', (e) => e.stopPropagation())
        );
    }
  });

  // Set number of total pages once document has been loaded
  function onDocumentLoadSuccess({ numPages }) {
    setTotalPageNumber(numPages);
    setDocumentLoaded(true);
    // Add document to store (for current page state)
    DocumentStore.update((s) => {
      const existingDocument = s.state[id];
      // Set current page to the first one if document wasn't there
      if (!existingDocument) {
        s.state[id] = 0;
      }
    });
  }

  // Display error message
  function onDocumentLoadError() {
    setDocumentLoaded(true);
  }

  // Initialize page
  const onPageLoadSuccess = async (page) => {
    // Get text content of the page and add it to the search index
    const textContent = await page.getTextContent();
    DocumentStore.update((s) => {
      // Add document itself to index if not already there
      if (!s.index[id]) {
        s.index[id] = { pages: {} };
        // Add pages key if it not already there
      } else if (!s.index[id].pages) {
        s.index[id].pages = {};
      }
      // Only add page if it is not already stored
      if (!s.index[id].pages[page._pageIndex]) {
        s.index[id].pages[page._pageIndex] = textContent.items.map(
          (item) => item.str
        );
      }
    });
  };

  // Add page to list of rendered pages
  const addToPageRendered = ({ _pageIndex: page }) => {
    if (!pageRendered.includes(page)) {
      setPageRendered((oldArray) => [...oldArray, page]);
    }
  };

  // Custom text rendered for text highlighting
  const textRenderer = (textItem, itemIndex, pageIndex) => {
    if (results.pages[pageIndex].items[itemIndex]) {
      const highlightedTextItem = highlight(
        textItem,
        results.pages[pageIndex].items[itemIndex]
      );
      return ReactDOMServer.renderToStaticMarkup(highlightedTextItem);
    }
    return textItem;
  };

  // Go to last current page when component is reappearing
  useEffect(() => {
    if (
      cardSwiper !== null &&
      !cardSwiper.destroyed &&
      cardSwiper.activeIndex !== currentPageIndex
    ) {
      cardSwiper.slideTo(currentPageIndex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardSwiper]);

  // Switch to page where matches were found
  useEffect(() => {
    if (results) {
      // Only switch if current page has no matches
      if (results.pages[currentPageIndex].count === 0) {
        // Find page with highest amount of matches
        const pageWithMaxCount = Object.keys(results.pages).reduce(
          (prev, current) =>
            results.pages[prev].count > results.pages[current].count
              ? prev
              : current
        );
        if (
          cardSwiper !== null &&
          !cardSwiper.destroyed &&
          results.pages[pageWithMaxCount].count > 0
        ) {
          cardSwiper.slideTo(pageWithMaxCount);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, cardSwiper]);

  // Go to same slide on fullscreen swiper as in card swiper when opening fullscreen
  useEffect(() => {
    if (fullscreenSwiper !== null && !fullscreenSwiper.destroyed) {
      fullscreenSwiper.slideTo(cardSwiper.activeIndex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullscreenSwiper]);

  return (
    <Measure
      bounds
      onResize={(contentRect) => {
        setWidth(contentRect.bounds.width);
        setHeight(contentRect.bounds.height);
      }}
    >
      {({ measureRef }) => (
        <Box
          h={fullscreen && screenSize !== 'lg' ? '90%' : '100%'}
          w="100%"
          ref={measureRef}
        >
          <Collapse in={documentLoaded}>
            <Document
              file={transformedFile}
              loading=""
              error={
                <Center minH="150px">
                  <Box textAlign="center">
                    {formatMessage({ id: 'document_load_error_message' })}
                  </Box>
                </Center>
              }
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              externalLinkTarget="_blank"
            >
              <Box role="group">
                <Swiper
                  modules={[A11y, Controller, Keyboard, Navigation, Pagination]}
                  width={mesWidth}
                  simulateTouch={false}
                  navigation
                  pagination={{ clickable: true }}
                  keyboard={fullscreen}
                  onSwiper={fullscreen ? setFullscreenSwiper : setCardSwiper}
                  onSlideChange={({ activeIndex }) => {
                    // Update current page in store
                    DocumentStore.update((s) => {
                      s.state[id] = activeIndex;
                    });
                    // Sync card swiper with fullscreen swiper
                    if (fullscreen) {
                      cardSwiper.slideTo(activeIndex);
                    }
                  }}
                >
                  {Array.from(new Array(totalPageNumber), (_el, pageIndex) => (
                    <SwiperSlide key={pageIndex}>
                      <Center>
                        <Box pos="relative">
                          <Page
                            className={
                              colorMode === 'dark' &&
                              transformedFile?.mode === 'dark'
                                ? 'no-invert'
                                : undefined
                            }
                            canvasBackground={
                              colorMode === 'dark' &&
                              transformedFile?.mode === 'dark'
                                ? 'transparent'
                                : undefined
                            }
                            onClick={(e) => e.stopPropagation()}
                            loading=""
                            onRenderSuccess={addToPageRendered}
                            onLoadSuccess={onPageLoadSuccess}
                            customTextRenderer={
                              results &&
                              results.pages[currentPageIndex] &&
                              results.pages[currentPageIndex].count !== 0 &&
                              currentPageIndex === pageIndex
                                ? ({ str, itemIndex }) =>
                                    textRenderer(str, itemIndex, pageIndex)
                                : null
                            }
                            pageIndex={pageIndex}
                            width={
                              fullscreen && screenSize === 'lg'
                                ? null
                                : mesWidth + 1
                            }
                            height={
                              fullscreen && screenSize === 'lg'
                                ? mesHeight
                                : null
                            }
                          />
                          <AnimatePresence>
                            {!pageRendered.includes(pageIndex) && (
                              <MotionFlex
                                pos="absolute"
                                top="0"
                                left="0"
                                right="0"
                                bottom="0"
                                bg={colorMode === 'light' ? 'white' : '#191919'}
                                align="center"
                                justify="center"
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                              >
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{
                                    opacity: 1,
                                    transition: { delay: 0.5 },
                                  }}
                                >
                                  <Loader
                                    text={formatMessage({
                                      id: 'loading_document',
                                    })}
                                  />
                                </motion.div>
                              </MotionFlex>
                            )}
                          </AnimatePresence>
                        </Box>
                      </Center>
                    </SwiperSlide>
                  ))}
                </Swiper>
              </Box>
            </Document>
          </Collapse>
        </Box>
      )}
    </Measure>
  );
}
