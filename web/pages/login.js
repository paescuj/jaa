import env from '@beam-australia/react-env';
import {
	Button,
	FormControl,
	FormErrorMessage,
	FormLabel,
	Heading,
	IconButton,
	Input,
	InputGroup,
	InputRightElement,
	useDisclosure,
} from '@chakra-ui/react';
import { EyeEmpty, EyeOff } from 'iconoir-react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useIntl } from 'react-intl';

import Layout from '@/components/common/Layout';
import Loader from '@/components/common/Loader';
import { login } from '@/lib/directus';
import { AuthStore } from '@/stores/AuthStore';

export default function Login() {
	const [loading, setLoading] = useState(true);
	const { formatMessage } = useIntl();

	const user = AuthStore.useState((s) => s.user);
	const router = useRouter();
	useEffect(() => {
		// Check user
		if (user) {
			// Redirect if user is already logged in
			const redirect = user.email?.startsWith('admin@')
				? '/admin'
				: '/application';
			router.push(redirect);
		} else {
			// Check query
			const { isReady, query } = router;
			if (isReady) {
				if ((query.company && query.job) || query.admin) {
					setLoading(false);
				} else {
					// Go to instruction page if params are missing
					router.push('/');
				}
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const { formState, handleSubmit, register, setError } = useForm();
	const { isOpen: codeIsRevealed, onToggle: onToggleCode } = useDisclosure();
	const codeRef = useRef(null);
	const { ref, ...rest } = register('code', {
		required: formatMessage({ id: 'access_code_empty' }),
	});

	// Reveal password
	const onClickReveal = () => {
		// Toggle state
		onToggleCode();
		// Put focus back to input and move cursor to end
		const input = codeRef.current;
		if (input) {
			input.focus({ preventScroll: true });
			const length = input.value.length * 2;
			requestAnimationFrame(() => {
				input.setSelectionRange(length, length);
			});
		}
	};

	// Try to login with submitted code
	async function onSubmit({ code }) {
		const { company, job, admin } = router.query;
		// Use configured domain from env for users email address
		const host = env('DOMAIN');

		try {
			await login(admin ? `admin@${host}` : `${company}-${job}@${host}`, code);
			// Redirect
			await router.push({
				pathname: admin ? '/admin' : '/application',
			});
		} catch (error) {
			const messages = {
				'Network Error': formatMessage({ id: 'no_connection' }),
				'Invalid user credentials.': formatMessage({
					id: 'access_code_or_url_invalid',
				}),
				default: formatMessage({ id: 'unknown_error' }),
			};
			setError('code', {
				type: 'manual',
				message: messages[error.message] || messages['default'],
			});
		}
	}

	return (
		<>
			<Head>
				<title>
					{formatMessage({ id: 'login_title' })} - Job Application Assistant
				</title>
			</Head>
			<Layout justify="center" align="center">
				{loading ? (
					<Loader text={formatMessage({ id: 'loading_page' })} />
				) : (
					<main>
						<Heading as="h1" size="2xl" pb={6} textAlign="center">
							{formatMessage({ id: 'welcome' })}
						</Heading>
						<form onSubmit={handleSubmit(onSubmit)}>
							<FormControl isInvalid={formState.errors.code}>
								<FormLabel htmlFor="code">
									{formatMessage({ id: 'enter_access_code' })}
								</FormLabel>
								<InputGroup>
									<Input
										type={codeIsRevealed ? 'text' : 'password'}
										name="code"
										placeholder={formatMessage({ id: 'code' })}
										{...rest}
										ref={(e) => {
											ref(e);
											codeRef.current = e;
										}}
									/>
									<InputRightElement>
										<IconButton
											type="button"
											tabIndex="0"
											variant="unstyled"
											display="inline-flex"
											title={
												codeIsRevealed
													? formatMessage({ id: 'hide_code' })
													: formatMessage({ id: 'reveal_code' })
											}
											aria-label={
												codeIsRevealed
													? formatMessage({ id: 'hide_code' })
													: formatMessage({ id: 'reveal_code' })
											}
											icon={codeIsRevealed ? <EyeEmpty /> : <EyeOff />}
											onClick={onClickReveal}
										/>
									</InputRightElement>
								</InputGroup>
								<FormErrorMessage>
									{formState.errors.code?.message}
								</FormErrorMessage>
							</FormControl>
							<Button
								mt={4}
								w="100%"
								colorScheme="blue"
								disabled={
									formState.isSubmitting ||
									(formState.errors.code &&
										formState.errors.code.type !== 'manual')
								}
								isLoading={formState.isSubmitting}
								type="submit"
							>
								{formatMessage({ id: 'login' })}
							</Button>
						</form>
					</main>
				)}
			</Layout>
		</>
	);
}
