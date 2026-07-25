<script lang="ts">
	import AuthForm from '../auth/AuthForm.svelte';

	interface Props {
		mode: 'auth' | 'forgot-password';
		isLoading?: boolean;
		errorMessage?: string;
		successMessage?: string;
		onsubmit: (email: string, password: string) => void;
		onregister?: (email: string, password: string) => void;
		ongoogle?: () => void;
		onback?: () => void;
		onforgotPassword?: () => void;
	}

	let {
		mode,
		isLoading = false,
		errorMessage = '',
		successMessage = '',
		onsubmit,
		onregister,
		ongoogle,
		onback,
		onforgotPassword
	}: Props = $props();

	let currentMode = $derived<'auth' | 'forgot'>(mode === 'forgot-password' ? 'forgot' : 'auth');

	function handleModeChange(newMode: 'auth' | 'forgot') {
		if (newMode === 'forgot' && onforgotPassword) {
			onforgotPassword();
		} else if (newMode === 'auth' && onback) {
			onback();
		}
	}
</script>

<AuthForm
	mode={currentMode}
	loading={isLoading}
	error={errorMessage}
	info={successMessage}
	withGoogle={Boolean(ongoogle)}
	onlogin={onsubmit}
	onregister={(email, pass) => {
		if (onregister) onregister(email, pass);
		else onsubmit(email, pass);
	}}
	onforgot={(email) => {
		onsubmit(email, '');
	}}
	{ongoogle}
	onmode={handleModeChange}
/>
