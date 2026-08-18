<script lang="ts">
	/**
	 * Форма видалення акаунта.
	 *
	 * Так само, як і зміна пароля, кнопка вела в глухий кут: `AccountActions`
	 * пропонував «Видалити акаунт», а екран за нею містив саме лише «Назад».
	 * `AuthService.deleteAccount` при цьому виконує повний шлях — повторну
	 * автентифікацію, прибирання `users/{uid}` і `profiles/{uid}`, видалення
	 * самого користувача, — а попередження й обидві кнопки лежали
	 * перекладеними в семи словниках.
	 *
	 * Дія незворотна, тому підтвердження тут ДВА: спершу натиснути кнопку
	 * небезпечної дії, потім довести, що це власник — паролем або вікном
	 * Google. Другий крок не косметичний: його вимагає сам Firebase, інакше
	 * `deleteUser` відмовляє з `auth/requires-recent-login`.
	 */
	import { _ } from "svelte-i18n";
	import { TriangleAlert } from "lucide-svelte";
	import PasswordInput from "../ui/PasswordInput.svelte";
	import { authStore } from "$lib/controllers/AuthStore.svelte";
	import { errorToMessageKey } from "$lib/errors";

	interface Props {
		onback: () => void;
	}
	let { onback }: Props = $props();

	let password = $state("");
	let isLoading = $state(false);
	let errorMessage = $state("");

	async function handleDelete(event: Event) {
		event.preventDefault();
		errorMessage = "";

		if (!authStore.isGoogleAccount && !password) {
			errorMessage = $_("profile.errors.enterPassword");
			return;
		}

		isLoading = true;
		try {
			await authStore.deleteAccount(password);
			// Далі веде `onAuthStateChanged`: акаунта більше немає, і застосунок
			// повертається до гостьового стану сам.
			onback();
		} catch (error: unknown) {
			errorMessage = $_(errorToMessageKey(error));
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="security-form" data-testid="delete-account-panel">
	<h3 class="security-form__title" data-testid="delete-account-title">
		<TriangleAlert size={18} />
		{$_("profile.deleteAccount")}
	</h3>

	<p class="security-form__warning" role="alert" data-testid="delete-account-warning">
		{$_("profile.deleteWarning")}
	</p>

	<form onsubmit={handleDelete}>
		{#if authStore.isGoogleAccount}
			<p class="security-form__note" data-testid="delete-account-google-hint">
				{$_("profile.deleteGoogleReauth")}
			</p>
		{:else}
			<PasswordInput
				id="delete-account-password"
				bind:value={password}
				label={$_("profile.passwordPlaceholderShort")}
				autocomplete="current-password"
				testId="delete-account-password-input"
				disabled={isLoading}
			/>
		{/if}

		{#if errorMessage}
			<p class="security-form__error" role="alert" data-testid="delete-account-error">
				{errorMessage}
			</p>
		{/if}

		<button
			type="submit"
			class="security-form__submit danger"
			data-testid="delete-account-submit-btn"
			disabled={isLoading}
		>
			{#if isLoading}
				…
			{:else if authStore.isGoogleAccount}
				{$_("profile.deleteViaGoogle")}
			{:else}
				{$_("profile.confirmDelete")}
			{/if}
		</button>
		<button
			type="button"
			class="security-form__back"
			data-testid="delete-account-cancel-btn"
			onclick={onback}
		>
			{$_("profile.cancel")}
		</button>
	</form>
</div>

<style>
	.security-form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.security-form__title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0;
		font-size: 1.05rem;
		color: var(--toast-error, #ef4444);
	}

	.security-form form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.security-form__warning {
		margin: 0;
		padding: 0.75rem;
		border-radius: 12px;
		border: 1px solid rgba(239, 68, 68, 0.3);
		background: rgba(239, 68, 68, 0.08);
		color: var(--text-primary);
		font-size: 0.92rem;
		line-height: 1.45;
	}

	.security-form__note {
		margin: 0;
		color: var(--text-secondary);
		font-size: 0.9rem;
		line-height: 1.5;
	}

	.security-form__error {
		margin: 0;
		color: var(--toast-error, #ef4444);
		font-size: 0.9rem;
	}

	.security-form__submit {
		padding: 0.85rem 1rem;
		border: none;
		border-radius: 12px;
		background: var(--accent);
		color: var(--text-on-accent, #fff);
		font-size: 1rem;
		cursor: pointer;
	}

	.security-form__submit.danger {
		background: var(--toast-error, #ef4444);
	}

	.security-form__submit:disabled {
		opacity: 0.6;
		cursor: default;
	}

	.security-form__back {
		padding: 0.6rem;
		border: none;
		border-radius: 12px;
		background: transparent;
		color: var(--text-secondary);
		font-size: 0.95rem;
		cursor: pointer;
	}

	.security-form__back:hover {
		color: var(--text-primary);
	}
</style>
