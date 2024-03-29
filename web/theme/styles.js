import { mode } from '@chakra-ui/theme-tools';

// Fixes and additions for PDFs
const pdf = (props) => ({
	'.react-pdf__Page__textContent span': {
		opacity: '0.15',
	},
	'.react-pdf__Page__textContent span::selection': {
		backgroundColor: 'blue',
	},
	'.react-pdf__Page': {
		filter: mode('', 'invert(90%)')(props),
	},
	'.no-invert': {
		filter: 'invert(0%)',
	},
	'.no-invert .react-pdf__Page__textContent': {
		filter: 'invert(90%)',
	},
});

// Use theme colors for swiper
const swiper = (props) => ({
	'.swiper': {
		'--swiper-theme-color': mode(
			props.theme.colors.blue[500],
			props.theme.colors.blue[200],
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
	'[role="group"]:hover :not(.swiper-button-hidden) .swiper-button-disabled': {
		opacity: '0.35 !important',
	},
	'.swiper-pagination-bullet:not(.swiper-pagination-bullet-active)': {
		bg: mode('#000', 'gray.200')(props),
	},
});

const calendar = (props) => ({
	// Disable 'all day' row
	'.rbc-allday-cell': {
		display: 'none',
	},
	// Fix agenda date cell background
	'.rbc-agenda-date-cell': {
		backgroundColor: mode('gray.200', 'gray.500')(props),
	},
});

const styles = {
	global: (props) => ({
		body: {
			bg: 'bg',
		},
		...pdf(props),
		...swiper(props),
		...calendar(props),
		// Hide cancel button on search input in Safari
		'input[type="search"]::-webkit-search-cancel-button': {
			WebkitAppearance: 'none',
		},
	}),
};

export default styles;
