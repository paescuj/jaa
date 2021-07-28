import { mode } from '@chakra-ui/theme-tools';

// Apply tooltip theme to tippy
const tippy = (props) => ({
  '.tippy-box[data-theme~="chakra"]': {
    ...props.theme.components.Tooltip.baseStyle(props),
  },
  '.tippy-box[data-theme~="chakra"][data-placement^="bottom"] > .tippy-arrow::before':
    {
      borderBottomColor: props.theme.components.Tooltip.baseStyle(props).bg,
    },
});

// Fixes for PDFs
const pdf = (props) => ({
  '.react-pdf__Page__textContent span': {
    opacity: '0.15',
  },
  '.react-pdf__Page__textContent span::selection': {
    backgroundColor: 'blue',
  },
  // See https://github.com/wojtekmaj/react-pdf/issues/332#issuecomment-585180825
  '.react-pdf__Document': {
    lineHeight: '1',
  },
  '.react-pdf__Page': {
    filter: mode('', 'invert(90%)')(props),
  },
});

// Use theme colors for swiper
const swiper = (props) => ({
  '.swiper-container': {
    '--swiper-theme-color': mode(
      props.theme.colors.blue[500],
      props.theme.colors.blue[200]
    )(props),
  },
  '.swiper-button-prev, .swiper-button-next': {
    transition: 'opacity ease-in-out 0.3s',
    opacity: '0 !important',
  },
  '[role="group"]:hover :not(.swiper-button-hidden) .swiper-button-prev, [role="group"]:hover :not(.swiper-button-hidden) .swiper-button-next':
    {
      opacity: '1 !important',
    },
  ':not(.swiper-button-hidden) :not(.swiper-button-disabled).swiper-button-prev:focus, :not(.swiper-button-hidden) :not(.swiper-button-disabled).swiper-button-next:focus':
    {
      opacity: '1 !important',
    },
  ':not(.swiper-button-hidden) .swiper-button-disabled.swiper-button-prev:focus, :not(.swiper-button-hidden) .swiper-button-disabled.swiper-button-next:focus':
    {
      opacity: '0.35 !important',
    },
  '[role="group"]:hover :not(.swiper-button-hidden) .swiper-button-disabled': {
    opacity: '0.35 !important',
  },
  '.swiper-pagination-bullet:not(.swiper-pagination-bullet-active)': {
    bg: mode('#000', 'gray.200')(props),
  },
});

const styles = {
  global: (props) => ({
    body: {
      bg: mode('#C8C6D7', 'gray.700')(props),
    },
    ...tippy(props),
    ...pdf(props),
    ...swiper(props),
    // Hide cancel button on search input in Safari
    'input[type="search"]::-webkit-search-cancel-button': {
      WebkitAppearance: 'none',
    },
  }),
};

export default styles;
