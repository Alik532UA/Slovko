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
	import ToastContainer from "$lib/components/ui/ToastContainer.svelte";
	import InteractionSystem from "$lib/components/interaction/InteractionSystem.svelte";
	import OnboardingModal from "$lib/components/onboarding/OnboardingModal.svelte";
	import { authStore } from "$lib/firebase/authStore.svelte";
	import { logService } from "$lib/services/logService";
	import DebugListener from "$lib/components/debug/DebugListener.svelte";
	import {
		initGA,
		trackPageView,
		trackEvent,
	} from "$lib/services/analyticsService";
	import { page } from "$app/stores";
	import "../app.css";

	// Services Context Setup
	import { gameController } from "$lib/services/gameController";
	import { setGameController } from "$lib/context/gameContext";
	setGameController(gameController);

	let { children } = $props();
	let ready = $state(false);

	import { dev } from "$app/environment";
	import { base } from "$app/paths";

	const trackableTestIds = [
		"donate-btn",
		"theme-settings-btn",
		"language-settings-btn",
		"about-btn",
		"profile-btn",
		"about-donate-link",
		"about-cv-link",
		"about-hard-reset-btn",
	];

	const handleGlobalClick = (event: MouseEvent) => {
		const target = event.target as HTMLElement;
		const closestTrackable = target.closest("[data-testid]");
		if (closestTrackable) {
			const testId = closestTrackable.getAttribute("data-testid");
			if (testId && trackableTestIds.includes(testId)) {
				trackEvent("click", "ui_interaction", testId);
			}
		}
	};

	onMount(() => {
		logService.log("version", "Root layout onMount started");
		
		// Audio Unlock for iOS
		const unlockAudio = () => {
			if (window.speechSynthesis) {
				const utterance = new SpeechSynthesisUtterance("");
				utterance.volume = 0;
				window.speechSynthesis.speak(utterance);
				logService.log("ui", "Audio engine unlocked via touch");
				window.removeEventListener("touchstart", unlockAudio);
			}
		};
		window.addEventListener("touchstart", unlockAudio, { passive: true });

		// 1. Запускаємо перевірку оновлень ОДРАЗУ паралельно
		// Додаємо мікро-затримку, щоб не забивати потік при старті
		setTimeout(() => {
			checkForUpdates();
		}, 300);

		const init = async () => {
			logService.log("version", "Initializing i18n...");
			await initializeI18n();
			logService.log("version", "i18n initialized, setting ready=true");
			ready = true;

			if (!dev && "serviceWorker" in navigator) {
				const registration = await navigator.serviceWorker.register(`${base}/service-worker.js`);
				
				// Слухаємо оновлення Service Worker
				registration.addEventListener("updatefound", () => {
					const newWorker = registration.installing;
					if (newWorker) {
						newWorker.addEventListener("statechange", () => {
							if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
								logService.log("version", "New Service Worker found and installed. Triggering banner.");
								versionStore.setUpdate(true);
							}
						});
					}
				});
			}

			// Analytics
			initGA();
		};

		init();

		// Фікс для коректної висоти в PWA/мобільних браузерах
		const updateVh = () => {
			let vh = window.innerHeight * 0.01;
			document.documentElement.style.setProperty("--vh", `${vh}px`);
		};
		updateVh();
		window.addEventListener("resize", updateVh);
		window.addEventListener("orientationchange", updateVh);
		window.addEventListener("click", handleGlobalClick);

		// Перевірка оновлень при поверненні в додаток
		const handleVisibilityChange = () => {
			if (document.visibilityState === "visible") {
				logService.log("version", "App visible again, checking for updates...");
				checkForUpdates();
			}
		};
		window.addEventListener("visibilitychange", handleVisibilityChange);
		window.addEventListener("focus", handleVisibilityChange);

		return () => {
			window.removeEventListener("resize", updateVh);
			window.removeEventListener("orientationchange", updateVh);
			window.removeEventListener("click", handleGlobalClick);
			window.removeEventListener("visibilitychange", handleVisibilityChange);
			window.removeEventListener("focus", handleVisibilityChange);
		};
	});

	$effect(() => {
		document.documentElement.setAttribute(
			"data-theme",
			settingsStore.value.theme,
		);
	});

	// Відстеження зміни сторінок
		$effect(() => {
			trackPageView($page.url.pathname);
		});
	</script>
<DebugListener />

{#if versionStore.hasUpdate && versionStore.currentVersion}
	<UpdateNotification version={versionStore.currentVersion} />
{/if}

{#if ready && !$isLoading && authStore.isDataReady}
	{@render children()}

	{#if !settingsStore.value.hasCompletedOnboarding}
		<OnboardingModal />
	{/if}

	<ToastContainer />
	<InteractionSystem />
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
</style>
