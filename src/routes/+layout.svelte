<script lang="ts">
	/**
	 * Root Layout — Ініціалізація i18n та глобальні стилі
	 */
	import { onMount } from "svelte";
	import { initializeI18n } from "$lib/i18n/init";
	import { isLoading } from "svelte-i18n";
	import { checkForUpdates } from "$lib/services/versionService";
	import { versionStore } from "$lib/stores/versionStore.svelte";
	import { settingsStore } from "$lib/stores/settingsStore.svelte";
	import UpdateNotification from "$lib/components/navigation/UpdateNotification.svelte";
	import OnboardingModal from "$lib/components/onboarding/OnboardingModal.svelte";
	import { hardReset } from "$lib/services/resetService";
	import "../app.css";

	let { children } = $props();
	let ready = $state(false);

	let kKeyPressCount = 0;
	let kKeyPressTimer: ReturnType<typeof setTimeout>;

	function handleGlobalKeydown(e: KeyboardEvent) {
		if (e.key.toLowerCase() === "к") {
			kKeyPressCount++;
			clearTimeout(kKeyPressTimer);

			if (kKeyPressCount >= 5) {
				hardReset(true);
				kKeyPressCount = 0;
			} else {
				kKeyPressTimer = setTimeout(() => {
					kKeyPressCount = 0;
				}, 2000); // Скидаємо лічильник через 2с бездіяльності
			}
		} else {
			kKeyPressCount = 0;
		}
	}

	import { dev } from "$app/environment";
	import { base } from "$app/paths";

	onMount(async () => {
		await initializeI18n();
		ready = true;

		// Перевірка оновлень після ініціалізації
		checkForUpdates();

		if (!dev && "serviceWorker" in navigator) {
			navigator.serviceWorker.register(`${base}/service-worker.js`);
		}
	});
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

{#if ready && !$isLoading}
	{@render children()}

	{#if !settingsStore.value.hasCompletedOnboarding}
		<OnboardingModal />
	{/if}

	{#if versionStore.hasUpdate && versionStore.currentVersion}
		<UpdateNotification version={versionStore.currentVersion} />
	{/if}
{:else}
	<div class="loading">
		<div class="loading-spinner"></div>
	</div>
{/if}

<style>
	.loading {
		display: flex;
		justify-content: center;
		align-items: center;
		height: 100vh;
		background: var(--bg-primary, #1a1a2e);
	}

	.loading-spinner {
		width: 48px;
		height: 48px;
		border: 4px solid var(--text-secondary, #a0a0a0);
		border-top-color: var(--accent, #3a8fd6);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
