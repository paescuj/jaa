import {
	Fade,
	IconButton,
	Input,
	InputGroup,
	InputLeftElement,
	InputRightElement,
	Spinner,
} from '@chakra-ui/react';
import { Cancel, Search as SearchIcon } from 'iconoir-react';
import { useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';

import { useDebounce } from '@/lib/debounce';
import { DocumentStore } from '@/stores/DocumentStore';

export default function Search(props) {
	const [loading, setLoading] = useState(false);
	const { formatMessage } = useIntl();

	const index = DocumentStore.useState((s) => s.index);
	const [query, setQuery] = useState(null);
	const debouncedQuery = useDebounce(query, 400);
	const inputRef = useRef(null);
	const workerRef = useRef();

	useEffect(() => {
		workerRef.current = new Worker(
			new URL('@/workers/search.js', import.meta.url),
		);
		workerRef.current.onmessage = (event) => {
			DocumentStore.update((s) => {
				s.results = event.data;
			});
			setLoading(false);
		};
		return () => {
			workerRef.current.terminate();
		};
	}, []);

	useEffect(() => {
		if (debouncedQuery !== null && debouncedQuery.trim()) {
			workerRef.current.postMessage({ query: debouncedQuery, index: index });
		} else {
			setLoading(false);
			DocumentStore.update((s) => {
				s.results = {};
			});
		}
	}, [debouncedQuery, index]);

	return (
		<InputGroup {...props}>
			<InputLeftElement pointerEvents="none" color="gray.500">
				<SearchIcon />
			</InputLeftElement>
			<Input
				ref={inputRef}
				type="search"
				placeholder={formatMessage({ id: 'search_documents' })}
				_placeholder={{ color: 'gray.500', fontSize: { base: 'sm', sm: 'md' } }}
				onChange={(e) => {
					setLoading(true);
					setQuery(e.target.value);
				}}
			/>
			<Fade in={loading} unmountOnExit>
				<InputRightElement>
					<Spinner />
				</InputRightElement>
			</Fade>
			<Fade in={!loading && inputRef.current?.value} unmountOnExit>
				<InputRightElement>
					<IconButton
						onClick={() => {
							inputRef.current.value = '';
							setQuery(null);
						}}
						title={formatMessage({ id: 'remove_filter' })}
						aria-label={formatMessage({ id: 'remove_filter' })}
						icon={<Cancel />}
						variant="unstyled"
						display="inline-flex"
					/>
				</InputRightElement>
			</Fade>
		</InputGroup>
	);
}
