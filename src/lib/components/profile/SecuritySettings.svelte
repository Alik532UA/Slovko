<script lang="ts">
	import { _ } from "svelte-i18n";
	import { ArrowLeft } from "lucide-svelte";
	import { authStore } from "../../firebase/authStore.svelte";
	import { logService } from "../../services/logService";

	interface Props {
		mode: "change-password" | "delete-account";
		onback: () => void;
		onclose?: () => void;
	}

	let { mode, onback, onclose }: Props = $props();

	let isLinking = $state(false);
	let errorMessage = $state("");
	let successMessage = $state("");

	function getAuthErrorMessage(code: string): string {
		const errors: Record<string, string> = {
			"auth/email-already-in-use": $_("profile.errors.emailInUse"),
			"auth/weak-password": $_("profile.errors.weakPassword"),
			"auth/invalid-email": $_("profile.errors.invalidEmail"),
			"auth/user-not-found": $_("profile.errors.invalidCredentials"),
			"auth/wrong-password": $_("profile.errors.invalidCredentials"),
			"auth/invalid-credential": $_("profile.errors.invalidCredentials"),
			"auth/popup-closed-by-user": $_("profile.errors.popupClosed"),
			"auth/cancelled-by-user": $_("profile.errors.popupClosed"),
			ACCOUNT_EXISTS_EMAIL: $_("profile.errors.accountExistsEmail"),
			GOOGLE_ALREADY_LINKED_ELSEWHERE: $_("profile.errors.googleAlreadyLinked"),
		};
		return errors[code] || code;
	}

	async function handlePasswordChange(e: Event) {
		e.preventDefault();
		const target = e.target as HTMLFormElement;
		const formData = new FormData(target);
		const current = formData.get("currentPassword") as string;
		const newPass = formData.get("newPassword") as string;
		const confirmPass = formData.get("confirmPassword") as string;

		if (newPass !== confirmPass) {
			errorMessage = $_("profile.errors.passwordsDoNotMatch");
			return;
		}

		isLinking = true;
		errorMessage = "";
		try {
			await authStore.changePassword(current, newPass);
			successMessage = $_("profile.passwordChangedSuccess");
			setTimeout(() => {
				onback();
			}, 2000);
		} catch (e: any) {
			errorMessage = getAuthErrorMessage(e.code) || e.message;
		} finally {
			isLinking = false;
		}
	}

	async function handleDeleteAccount(e: Event) {
		e.preventDefault();
		const target = e.target as HTMLFormElement;
		const formData = new FormData(target);
		const password = formData.get("password") as string || "";

		const isGoogleUser = authStore.user.providerId === "google.com";

		if (!password && !isGoogleUser) {
			errorMessage = $_("profile.errors.enterPassword", {
				default: "Введіть пароль",
			});
			return;
		}

		isLinking = true;
		errorMessage = "";
		try {
			await authStore.deleteAccount(password);
			if (onclose) onclose();
		} catch (e: any) {
			logService.error("auth", "Account deletion failed", e);
			errorMessage = getAuthErrorMessage(e.code) || e.message || "Помилка";
		} finally {
			isLinking = false;
		}
	}
</script>

{#if mode === "change-password"}
	<div class="form-section" data-testid="change-password-section">
		<p class="form-title" data-testid="change-password-title">
			{$_("profile.changePasswordTitle", {
				default: "Змінити пароль",
			})}
		</p>

		{#if authStore.user.providerId === "google.com"}
			<div class="info-box" data-testid="google-password-info">
				<p class="form-subtitle">
					{$_("profile.googlePasswordInfo", {
						default:
							"Ви використовуєте Google-авторизацію для входу в систему. Пароль для вашого акаунта Slovko не встановлено, оскільки автентифікація керується вашим Google-профілем.",
					})}
				</p>
			</div>
			<button
				class="back-btn"
				onclick={onback}
				data-testid="change-password-back-btn"
			>
				<ArrowLeft size={16} />
				{$_("profile.back", { default: "Назад" })}
			</button>
		{:else}
			<form
				class="email-form"
				data-testid="change-password-form"
				onsubmit={handlePasswordChange}
			>
				<input
					type="password"
					name="currentPassword"
					placeholder={$_("profile.currentPasswordPlaceholder", {
						default: "Поточний пароль",
					})}
					class="input-field"
					data-testid="current-password-input"
					required
				/>
				<input
					type="password"
					name="newPassword"
					placeholder={$_("profile.newPasswordPlaceholder", {
						default: "Новий пароль",
					})}
					class="input-field"
					data-testid="new-password-input"
					required
				/>
				<input
					type="password"
					name="confirmPassword"
					placeholder={$_("profile.confirmPasswordPlaceholder", {
						default: "Підтвердіть новий пароль",
					})}
					class="input-field"
					data-testid="confirm-password-input"
					required
				/>

				{#if errorMessage}
					<p class="error-msg">{errorMessage}</p>
				{/if}
				{#if successMessage}
					<p class="success-msg">{successMessage}</p>
				{/if}

				<button
					type="submit"
					class="primary-btn"
					disabled={isLinking}
					data-testid="submit-change-password-btn"
				>
					{isLinking
						? "..."
						: $_("profile.updatePasswordBtn", { default: "Оновити пароль" })}
				</button>

				<button
					type="button"
					class="back-btn"
					onclick={onback}
					data-testid="change-password-back-btn"
				>
					<ArrowLeft size={16} />
					{$_("profile.back", { default: "Назад" })}
				</button>
			</form>
		{/if}
	</div>
{:else if mode === "delete-account"}
	<div class="delete-warning" data-testid="delete-account-section">
		<p class="warning-text" data-testid="delete-account-warning">
			{$_("profile.deleteWarning", {
				default: "Увага! Цю дію неможливо скасувати.",
			})}
		</p>
		<form
			class="email-form"
			data-testid="delete-account-form"
			onsubmit={handleDeleteAccount}
		>
			{#if authStore.user.providerId === "google.com"}
				<p class="form-hint">
					{$_("profile.deleteGoogleHint", {
						default: "Для підтвердження потрібно буде ще раз увійти через Google",
					})}
				</p>
			{:else}
				<input
					type="password"
					name="password"
					placeholder={$_("profile.passwordPlaceholderShort", {
						default: "Пароль",
					})}
					class="input-field"
					autocomplete="current-password"
					data-testid="delete-account-password-input"
					required
				/>
			{/if}

			{#if errorMessage}
				<p class="error-msg">{errorMessage}</p>
			{/if}

			<button
				type="submit"
				class="delete-btn"
				disabled={isLinking}
				data-testid="confirm-delete-account-btn"
			>
				{#if isLinking}
					"..."
				{:else if authStore.user.providerId === "google.com"}
					{$_("profile.deleteViaGoogle")}
				{:else}
					{$_("profile.confirmDelete")}
				{/if}
			</button>
			<button
				type="button"
				class="back-btn"
				onclick={onback}
				data-testid="delete-account-cancel-btn"
			>
				{$_("profile.cancel")}
			</button>
		</form>
	</div>
{/if}

<style>
	.form-section {
		text-align: center;
		padding: 1rem;
	}

	.form-title {
		font-weight: 600;
		margin: 0 0 0.5rem;
		color: var(--text-primary);
	}

	.form-subtitle {
		font-size: 0.9rem;
		color: var(--text-secondary);
		margin: 0 0 1rem;
	}

	.form-hint {
		font-size: 0.85rem;
		color: var(--text-secondary);
		text-align: center;
		margin-bottom: 1rem;
		line-height: 1.4;
	}

	.back-btn {
		background: transparent;
		color: var(--text-secondary);
		padding: 0.5rem;
		font-size: 0.9rem;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.3rem;
		margin-top: 0.5rem;
		width: 100%;
	}

	.back-btn:hover {
		color: var(--text-primary);
	}

	.delete-warning {
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid var(--toast-error, #ef4444);
		padding: 1.5rem;
		border-radius: 16px;
	}

	.warning-text {
		color: var(--toast-error, #ef4444);
		font-size: 0.9rem;
		margin: 0 0 1rem;
		text-align: center;
	}

	.email-form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.input-field {
		width: 100%;
		padding: 1rem;
		border-radius: 12px;
		border: 1px solid var(--border);
		background: var(--bg-primary);
		color: var(--text-primary);
		font-size: 1rem;
	}

	.input-field:focus {
		border-color: var(--accent);
		outline: none;
	}

	.delete-btn {
		width: 100%;
		background: var(--toast-error, #ef4444);
		color: white;
		padding: 1rem;
		border-radius: 12px;
		font-weight: 600;
		transition: opacity 0.2s;
	}

	.delete-btn:hover:not(:disabled) {
		opacity: 0.9;
	}
	.delete-btn:disabled {
		opacity: 0.6;
	}

	.error-msg {
		color: var(--toast-error, #ef4444);
		font-size: 0.9rem;
		text-align: center;
		margin: 0;
	}

	.success-msg {
		color: #4caf50;
		font-size: 0.9rem;
		text-align: center;
		margin: 0;
	}

	.info-box {
		background: rgba(var(--accent-rgb, 58, 143, 214), 0.1);
		border: 1px solid var(--accent);
		padding: 1rem;
		border-radius: 12px;
		margin-bottom: 1.5rem;
	}

	.primary-btn {
		width: 100%;
		padding: 1rem;
		border-radius: 12px;
		background: var(--accent);
		color: white;
		font-weight: 700;
		font-size: 1rem;
		transition: all 0.2s;
	}

	.primary-btn:hover:not(:disabled) {
		filter: brightness(1.1);
	}
</style>
