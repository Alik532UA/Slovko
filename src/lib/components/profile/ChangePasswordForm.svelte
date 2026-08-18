<script lang="ts">
	/**
	 * Форма зміни пароля.
	 *
	 * До 2026-08-19 кнопка «Змінити пароль» вела на екран, де був лише напис
	 * «Назад» і коментар «можна додати за потреби». При цьому нижні шари були
	 * готові цілком: `AuthStore.changePassword` → `AuthService.changePassword`
	 * із повторною автентифікацією, а сім словників уже містили ВЕСЬ текст цієї
	 * форми. Тобто наявність підписів читалася як наявність форми
	 * (PROJECT-STRUCTURE-v8 § 4.3).
	 */
	import { _ } from "svelte-i18n";
	import { Key } from "lucide-svelte";
	import PasswordInput from "../ui/PasswordInput.svelte";
	import { authStore } from "$lib/controllers/AuthStore.svelte";
	import { errorToMessageKey } from "$lib/errors";

	interface Props {
		onback: () => void;
	}
	let { onback }: Props = $props();

	let currentPassword = $state("");
	let newPassword = $state("");
	let confirmPassword = $state("");
	let isLoading = $state(false);
	let errorMessage = $state("");
	let successMessage = $state("");

	async function handleSubmit(event: Event) {
		event.preventDefault();
		errorMessage = "";
		successMessage = "";

		if (!currentPassword || !newPassword) {
			errorMessage = $_("profile.errors.enterPassword");
			return;
		}
		// Звіряння тут, а не в сервісі: Firebase такої помилки не має, бо
		// другого поля не бачить — воно існує лише в цій формі.
		if (newPassword !== confirmPassword) {
			errorMessage = $_("profile.errors.passwordsDoNotMatch");
			return;
		}

		isLoading = true;
		try {
			await authStore.changePassword(currentPassword, newPassword);
			successMessage = $_("profile.passwordChangedSuccess");
			currentPassword = "";
			newPassword = "";
			confirmPassword = "";
		} catch (error: unknown) {
			errorMessage = $_(errorToMessageKey(error));
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="security-form" data-testid="change-password-panel">
	<h3 class="security-form__title" data-testid="change-password-title">
		<Key size={18} />
		{$_("profile.changePasswordTitle")}
	</h3>

	{#if authStore.isGoogleAccount}
		<!--
			Пароля в Slovko немає взагалі — форма показала б поле, яке ні на що
			не впливає. Текст пояснення лежав у словниках без ужитку.
		-->
		<p class="security-form__note" data-testid="change-password-google-hint">
			{$_("profile.googlePasswordInfo")}
		</p>
		<button
			type="button"
			class="security-form__back"
			data-testid="change-password-back-btn"
			onclick={onback}
		>
			{$_("profile.back")}
		</button>
	{:else}
		<form onsubmit={handleSubmit}>
			<PasswordInput
				id="current-password"
				bind:value={currentPassword}
				label={$_("profile.currentPasswordPlaceholder")}
				autocomplete="current-password"
				testId="change-password-current-input"
				disabled={isLoading}
			/>
			<PasswordInput
				id="new-password"
				bind:value={newPassword}
				label={$_("profile.newPasswordPlaceholder")}
				autocomplete="new-password"
				testId="change-password-new-input"
				disabled={isLoading}
			/>
			<PasswordInput
				id="confirm-password"
				bind:value={confirmPassword}
				label={$_("profile.confirmPasswordPlaceholder")}
				autocomplete="new-password"
				testId="change-password-confirm-input"
				disabled={isLoading}
			/>

			{#if errorMessage}
				<p class="security-form__error" role="alert" data-testid="change-password-error">
					{errorMessage}
				</p>
			{/if}
			{#if successMessage}
				<p class="security-form__success" role="status" data-testid="change-password-status">
					{successMessage}
				</p>
			{/if}

			<button
				type="submit"
				class="security-form__submit"
				data-testid="change-password-submit-btn"
				disabled={isLoading}
			>
				{isLoading ? "…" : $_("profile.updatePasswordBtn")}
			</button>
			<button
				type="button"
				class="security-form__back"
				data-testid="change-password-back-btn"
				onclick={onback}
			>
				{$_("profile.back")}
			</button>
		</form>
	{/if}
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
		color: var(--text-primary);
	}

	.security-form form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
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

	.security-form__success {
		margin: 0;
		color: var(--toast-success, #22c55e);
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
