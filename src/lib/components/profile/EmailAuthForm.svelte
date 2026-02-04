<script lang="ts">
	import { _ } from "svelte-i18n";
	import { ArrowLeft } from "lucide-svelte";
	import { fade } from "svelte/transition";

	interface Props {
		mode: "auth" | "forgot-password";
		isLoading: boolean;
		errorMessage: string;
		successMessage: string;
		onsubmit: (email: string, password: string) => void;
		onregister?: (email: string, password: string) => void;
		ongoogle?: () => void;
		onback: () => void;
		onforgotPassword?: () => void;
	}

	let {
		mode,
		isLoading,
		errorMessage,
		successMessage,
		onsubmit,
		onregister,
		ongoogle,
		onback,
		onforgotPassword,
	}: Props = $props();

	let email = $state("");
	let password = $state("");

	function handleSubmit(e: Event) {
		e.preventDefault();
		onsubmit(email, password);
	}

	function handleRegister(e: Event) {
		e.preventDefault();
		if (onregister) onregister(email, password);
	}
</script>

<div class="auth-container" data-testid="profile-auth-container">
	{#if mode === "forgot-password"}
		<form class="email-form" onsubmit={handleSubmit}>
			<p class="form-title">
				{$_("profile.forgotPasswordTitle")}
			</p>
			<p class="form-subtitle">
				{$_("profile.forgotPasswordSubtitle")}
			</p>
			<p class="spam-warning">
				⚠️ {$_("profile.spamWarning")}
			</p>

			<input
				type="email"
				placeholder="Email"
				bind:value={email}
				class="input-field"
				data-testid="profile-forgot-password-email-input"
				autocomplete="email"
				required
			/>

			{#if errorMessage}
				<p class="error-msg">{errorMessage}</p>
			{/if}
			{#if successMessage}
				<p class="success-msg">{successMessage}</p>
			{/if}

			<button type="submit" class="primary-btn" disabled={isLoading}>
				{isLoading ? "..." : $_("profile.sendResetEmail")}
			</button>

			<button type="button" class="back-link" onclick={onback}>
				<ArrowLeft size={16} />
				{$_("profile.backToSignin")}
			</button>
		</form>
	{:else}
		<form class="email-form" onsubmit={handleSubmit}>
			<p class="form-title">
				{$_("profile.signinTitle")}
			</p>

			<input
				type="email"
				placeholder="Email"
				bind:value={email}
				class="input-field"
				data-testid="profile-auth-email-input"
				autocomplete="email"
				required
			/>

			<div class="password-wrapper">
				<input
					type="password"
					placeholder={$_("profile.passwordPlaceholderShort")}
					bind:value={password}
					class="input-field"
					data-testid="profile-auth-password-input"
					autocomplete="current-password"
					required
				/>
				{#if onforgotPassword}
					<button
						type="button"
						class="forgot-password-link"
						onclick={onforgotPassword}
					>
						{$_("profile.forgotPassword")}
					</button>
				{/if}
			</div>

			{#if errorMessage}
				<p class="error-msg">{errorMessage}</p>
			{/if}

			{#if isLoading}
				<div class="loading-hint" transition:fade>
					<div class="spinner-small"></div>
					<p>
						{$_("profile.errors.waitingGoogle")}
					</p>
				</div>
			{/if}

			<div class="actions-stack">
				<button
					type="submit"
					class="primary-btn"
					data-testid="profile-signin-email-btn"
					disabled={isLoading}
				>
					{isLoading ? "..." : $_("profile.login")}
				</button>

				<button
					type="button"
					class="secondary-btn"
					data-testid="profile-register-email-btn"
					onclick={handleRegister}
					disabled={isLoading}
				>
					{$_("profile.register")}
				</button>
			</div>

			<div class="divider">
				<span>{$_("common.or")}</span>
			</div>

			<button
				type="button"
				class="google-btn"
				data-testid="profile-google-btn"
				onclick={ongoogle}
				disabled={isLoading}
			>
				<svg viewBox="0 0 24 24" width="20" height="20">
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
				{$_("profile.googleAuth")}
			</button>

			<button type="button" class="back-link" onclick={onback}>
				<ArrowLeft size={16} />
				{$_("profile.back")}
			</button>
		</form>
	{/if}
</div>

<style>
	.auth-container {
		width: 100%;
	}

	.email-form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.form-title {
		font-size: 1.25rem;
		font-weight: 700;
		text-align: center;
		margin: 0 0 0.5rem;
		color: var(--text-primary);
	}

	.form-subtitle {
		font-size: 0.9rem;
		text-align: center;
		color: var(--text-secondary);
		margin: 0;
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

	.input-field {
		width: 100%;
		padding: 0.85rem 1rem;
		border-radius: 14px;
		border: 1px solid var(--border);
		background: var(--bg-primary);
		color: var(--text-primary);
		font-size: 1rem;
		transition: border-color 0.2s;
	}

	.input-field:focus {
		outline: none;
		border-color: var(--accent);
	}

	.password-wrapper {
		position: relative;
		display: flex;
		align-items: center;
	}

	.forgot-password-link {
		position: absolute;
		right: 1rem;
		background: none;
		border: none;
		color: var(--accent);
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		padding: 0.2rem;
	}

	.actions-stack {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-top: 0.5rem;
	}

	.primary-btn {
		width: 100%;
		padding: 0.85rem;
		border-radius: 14px;
		background: var(--accent);
		color: white;
		font-weight: 700;
		font-size: 1rem;
		transition: all 0.2s;
	}

	.primary-btn:hover:not(:disabled) {
		filter: brightness(1.1);
		transform: translateY(-1px);
	}

	.secondary-btn {
		width: 100%;
		padding: 0.85rem;
		border-radius: 14px;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid var(--border);
		color: var(--text-primary);
		font-weight: 600;
		font-size: 1rem;
		transition: all 0.2s;
	}

	.secondary-btn:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.08);
	}

	.google-btn {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		padding: 0.85rem;
		border-radius: 14px;
		background: white;
		color: #333;
		font-weight: 600;
		font-size: 0.95rem;
		border: 1px solid #ddd;
		transition: all 0.2s;
	}

	.google-btn:hover:not(:disabled) {
		background: #f5f5f5;
		transform: translateY(-1px);
	}

	.divider {
		display: flex;
		align-items: center;
		text-align: center;
		color: var(--text-secondary);
		font-size: 0.85rem;
		margin: 0.5rem 0;
	}

	.divider::before,
	.divider::after {
		content: "";
		flex: 1;
		border-bottom: 1px solid var(--border);
	}

	.divider span {
		padding: 0 0.75rem;
	}

	.back-link {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		background: none;
		border: none;
		color: var(--text-secondary);
		font-size: 0.9rem;
		margin-top: 0.5rem;
		transition: color 0.2s;
	}

	.back-link:hover {
		color: var(--text-primary);
	}

	.error-msg {
		color: var(--toast-error, #ef4444);
		font-size: 0.85rem;
		text-align: center;
		margin: 0;
	}

	.loading-hint {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 12px;
		margin: 0.5rem 0;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.loading-hint p {
		margin: 0;
		font-size: 0.85rem;
		color: var(--text-secondary);
		text-align: center;
		line-height: 1.4;
	}

	.spinner-small {
		width: 20px;
		height: 20px;
		border: 2px solid rgba(255, 255, 255, 0.1);
		border-top-color: var(--accent);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.success-msg {
		color: var(--toast-success, #22c55e);
		font-size: 0.85rem;
		text-align: center;
		margin: 0;
	}

	button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
