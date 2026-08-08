<!-- src/lib/components/auth/AuthForm.svelte -->
<script lang="ts">
	import PasswordInput from '$lib/components/ui/PasswordInput.svelte';
	import { Mail } from 'lucide-svelte';
	import { _ } from 'svelte-i18n';

	interface Props {
		mode?: 'auth' | 'forgot';
		loading?: boolean;
		error?: string;
		info?: string;
		withGoogle?: boolean;
		onlogin: (email: string, password: string) => void;
		onregister: (email: string, password: string) => void;
		onforgot: (email: string) => void;
		ongoogle?: () => void;
		onmode: (m: 'auth' | 'forgot') => void;
	}

	let {
		mode = 'auth',
		loading = false,
		error = '',
		info = '',
		withGoogle = false,
		onlogin,
		onregister,
		onforgot,
		ongoogle,
		onmode
	}: Props = $props();

	let email = $state('');
	let password = $state('');

	function handleLoginSubmit(e: Event) {
		e.preventDefault();
		onlogin(email, password);
	}

	function handleForgotSubmit(e: Event) {
		e.preventDefault();
		onforgot(email);
	}
</script>

<div class="auth-card" data-testid="auth-card">
	{#if mode === 'forgot'}
		<h2 class="auth-title">
			{$_('profile.forgotPasswordTitle') || $_('auth.resetTitle') || 'Відновлення пароля'}
		</h2>
		<p class="auth-subtitle">
			{$_('profile.forgotPasswordSubtitle') || 'Введіть email, на який зареєстровано акаунт'}
		</p>
		<p class="spam-warning">
			⚠️ {$_('profile.spamWarning') || 'Лист може потрапити в папку «Спам», оскільки додаток новий.'}
		</p>

		<form onsubmit={handleForgotSubmit}>
			<div class="input-with-icon">
				<Mail size={18} class="input-icon lead" aria-hidden="true" />
				<input
					id="reset-email"
					type="email"
					bind:value={email}
					class="form-input"
					placeholder=" "
					autocomplete="email"
					required
					data-testid="reset-email-input"
				/>
				<label for="reset-email" class="floating-label">Email</label>
			</div>

			{#if error}<p class="auth-error" data-testid="reset-error">{error}</p>{/if}
			{#if info}<p class="auth-info" data-testid="reset-info-message">{info}</p>{/if}

			<button class="btn-primary" type="submit" disabled={loading} data-testid="reset-submit-btn">
				{loading ? '…' : $_('profile.sendResetEmail') || $_('auth.sendReset') || 'Надіслати лист'}
			</button>

			<button
				class="btn-link back-link"
				type="button"
				onclick={() => onmode('auth')}
				data-testid="reset-back-btn"
			>
				{$_('profile.backToSignin') || $_('auth.backToLogin') || 'Повернутись до входу'}
			</button>
		</form>
	{:else}
		<h2 class="auth-title">
			{$_('profile.signinTitle') || $_('auth.title') || 'Вхід або реєстрація'}
		</h2>

		{#if withGoogle}
			<button class="btn-google" type="button" onclick={ongoogle} disabled={loading} data-testid="auth-google-btn">
				<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
					<path
						fill="#4285F4"
						d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
					/>
					<path
						fill="#34A853"
						d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
					/>
					<path
						fill="#FBBC05"
						d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
					/>
					<path
						fill="#EA4335"
						d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
					/>
				</svg>
				<span>{$_('profile.googleAuth') || $_('auth.google') || 'Авторизація через Google'}</span>
			</button>
			<div class="divider"><span>{$_('common.or') || 'або'}</span></div>
		{/if}

		<form onsubmit={handleLoginSubmit}>
			<div class="input-with-icon">
				<Mail size={18} class="input-icon lead" aria-hidden="true" />
				<input
					id="auth-email"
					type="email"
					bind:value={email}
					class="form-input"
					placeholder=" "
					autocomplete="email"
					required
					data-testid="auth-email-input"
				/>
				<label for="auth-email" class="floating-label">Email</label>
			</div>

			<PasswordInput
				id="auth-password"
				testId="auth-password"
				label={$_('profile.passwordPlaceholderShort') || 'Пароль'}
				autocomplete="current-password"
				bind:value={password}
			/>

			<!-- «Відновити пароль» — окремим рядком ПІД полем (не в полі: там CapsLock/розкладка/око) -->
			<button
				class="btn-link reset-link"
				type="button"
				onclick={() => onmode('forgot')}
				data-testid="auth-forgot-btn"
			>
				{$_('profile.forgotPasswordTitle') || $_('auth.resetPassword') || 'Відновити пароль'}
			</button>

			{#if error}<p class="auth-error" data-testid="auth-error">{error}</p>{/if}
			{#if info}<p class="auth-info" data-testid="auth-info-message">{info}</p>{/if}

			<div class="auth-actions">
				<button class="btn-primary" type="submit" disabled={loading} data-testid="auth-login-btn">
					{loading ? '…' : $_('profile.login') || $_('auth.login') || 'Увійти'}
				</button>
				<button
					class="btn-secondary"
					type="button"
					onclick={() => onregister(email, password)}
					disabled={loading}
					data-testid="auth-register-btn"
				>
					{$_('profile.register') || $_('auth.register') || 'Зареєструватись'}
				</button>
			</div>
		</form>
	{/if}
</div>

<style>
	.auth-card {
		width: 100%;
		max-width: 440px;
		margin-inline: auto; /* §2: не вузько */
		padding: 2rem;
		border-radius: 20px;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		background: var(--bg-surface, var(--bg-primary, #fff));
		box-sizing: border-box;
	}

	@media (max-width: 480px) {
		.auth-card {
			max-width: 100%;
			padding: 1.25rem;
			border-radius: 0;
		}
	}

	.auth-title {
		text-align: center;
		margin: 0 0 0.25rem;
		font-size: 1.35rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	.auth-subtitle {
		font-size: 0.88rem;
		text-align: center;
		color: var(--text-secondary);
		margin: 0 0 0.5rem;
	}

	.spam-warning {
		font-size: 0.85rem;
		text-align: center;
		color: var(--toast-warning, #f59e0b);
		margin: 0;
		padding: 0.5rem;
		background: rgba(245, 158, 11, 0.1);
		border-radius: 8px;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.reset-link {
		align-self: flex-end;
		margin-top: -0.5rem;
		font-size: 0.85rem;
	} /* під полем пароля */

	.auth-actions {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.btn-primary,
	.btn-secondary,
	.btn-google {
		width: 100%;
		padding: 0.85rem;
		border-radius: 14px;
		cursor: pointer;
		font-weight: 600;
		font-size: 0.95rem;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		transition: transform 0.15s, filter 0.15s, background-color 0.15s;
		box-sizing: border-box;
	}

	.btn-primary {
		background: var(--accent, #3b82f6);
		color: #fff;
		border: none;
	}

	.btn-primary:hover:not(:disabled) {
		filter: brightness(1.08);
	}

	.btn-secondary {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid var(--border, rgba(128, 128, 128, 0.3));
		color: var(--text-primary);
	}

	.btn-secondary:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.1);
	}

	.btn-google {
		background: #fff;
		color: #333;
		border: 1px solid #ddd;
	}

	.btn-google:hover:not(:disabled) {
		background: #f8f9fa;
	}

	.btn-link {
		background: none;
		border: none;
		color: var(--accent, #3b82f6);
		cursor: pointer;
		padding: 0.25rem 0;
	}

	.btn-link:hover {
		text-decoration: underline;
	}

	.back-link {
		align-self: center;
		margin-top: 0.5rem;
	}

	.divider {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		color: var(--text-secondary);
		font-size: 0.85rem;
	}

	.divider::before,
	.divider::after {
		content: '';
		flex: 1;
		border-bottom: 1px solid var(--border, rgba(128, 128, 128, 0.3));
	}

	.auth-error {
		color: var(--toast-error, #ef4444);
		text-align: center;
		margin: 0;
		font-size: 0.9rem;
	}

	.auth-info {
		color: var(--toast-success, #22c55e);
		text-align: center;
		margin: 0;
		font-size: 0.9rem;
	}

	button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	/* Email-поле з floating-label — канон [FORM-INPUTS-v7 § 1] */
	.input-with-icon {
		position: relative;
		display: flex;
		align-items: center;
		width: 100%;
		--input-icon-color: var(--text-secondary, #6b7280);
		--input-bg: var(--bg-surface, var(--bg-primary, #fff));
	}

	:global(.input-icon.lead) {
		position: absolute;
		left: 1rem;
		opacity: 0.65;
		color: var(--input-icon-color);
		pointer-events: none;
		z-index: 1;
	}

	.form-input {
		width: 100%;
		box-sizing: border-box;
		padding: 0.9rem 1rem 0.9rem 3rem;
		background: var(--input-bg);
		border: 1px solid var(--border, rgba(128, 128, 128, 0.3));
		border-radius: 14px;
		color: var(--text-primary, #000);
		font-size: 1rem;
		transition: border-color 0.2s;
	}

	.form-input:focus {
		outline: none;
		border-color: var(--accent, #3b82f6);
	}

	.floating-label {
		position: absolute;
		left: 3rem;
		top: 50%;
		transform: translateY(-50%);
		color: var(--input-icon-color);
		pointer-events: none;
		background: var(--input-bg);
		padding: 0 0.25rem;
		transition: top 0.15s, transform 0.15s, color 0.15s;
		border-radius: 4px;
	}

	.form-input:focus ~ .floating-label,
	.form-input:not(:placeholder-shown) ~ .floating-label {
		top: 0;
		transform: translateY(-50%) scale(0.82);
		color: var(--accent, #3b82f6);
	}
</style>
