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

		// Audio Unlock for iOS ONLY
		// iOS blocks speechSynthesis.speak() until a trusted user gesture.
		// On Android/Windows speech works without unlock — no need to waste first click.
		const isIOS =
			/iPad|iPhone|iPod/.test(navigator.userAgent) ||
			(navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

		let handleFirstTouch: (() => void) | null = null;
		let handleFirstClick: (() => void) | null = null;

		if (isIOS) {
			let speechUnlocked = false;
			let audioCtxUnlocked = false;

			const tryUnlockSpeech = (eventType: string) => {
				if (speechUnlocked) return;
				if (!window.speechSynthesis) return;
				try {
					window.speechSynthesis.cancel();
					window.speechSynthesis.resume();
					const u = new SpeechSynthesisUtterance(" ");
					u.volume = 0.01;
					u.rate = 10;
					u.lang = "en";
					u.onend = () => {
						speechUnlocked = true;
						logService.log(
							"ui",
							`iOS: SpeechSynthesis unlocked via ${eventType} ✅`,
						);
					};
					u.onerror = (e) => {
						if (e.error !== "interrupted" && e.error !== "canceled") {
							logService.log(
								"ui",
								`iOS: Speech unlock via ${eventType} failed: ${e.error}`,
							);
						}
					};
					window.speechSynthesis.speak(u);
				} catch (_e) {
					/* ignore */
				}
			};

			const unlockAudioContext = () => {
				if (audioCtxUnlocked) return;
				try {
					const AudioCtx =
						window.AudioContext ||
						(window as unknown as { webkitAudioContext: typeof AudioContext })
							.webkitAudioContext;
					if (AudioCtx) {
						const ctx = new AudioCtx();
						const buffer = ctx.createBuffer(1, 1, 22050);
						const source = ctx.createBufferSource();
						source.buffer = buffer;
						source.connect(ctx.destination);
						source.start(0);
						ctx.resume();
					}
				} catch (_e) {
					/* AudioContext not available */
				}
				audioCtxUnlocked = true;
				logService.log("ui", "iOS: AudioContext unlocked ✅");
			};

			handleFirstTouch = () => {
				unlockAudioContext();
				tryUnlockSpeech("touchstart");
			};

			// capture:true — fires BEFORE WordCard's stopPropagation
			handleFirstClick = () => {
				unlockAudioContext();
				tryUnlockSpeech("click");
			};

			window.addEventListener("touchstart", handleFirstTouch, {
				passive: true,
			});
			window.addEventListener("click", handleFirstClick, {
				capture: true,
				passive: true,
			});
			logService.log("ui", "iOS detected — audio unlock listeners registered");
		}

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
				const registration = await navigator.serviceWorker.register(
					`${base}/service-worker.js`,
				);

				// Слухаємо оновлення Service Worker
				registration.addEventListener("updatefound", () => {
					const newWorker = registration.installing;
					if (newWorker) {
						newWorker.addEventListener("statechange", () => {
							if (
								newWorker.state === "installed" &&
								navigator.serviceWorker.controller
							) {
								logService.log(
									"version",
									"New Service Worker found and installed. Triggering banner.",
								);
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
			if (handleFirstTouch)
				window.removeEventListener("touchstart", handleFirstTouch);
			if (handleFirstClick)
				window.removeEventListener("click", handleFirstClick, {
					capture: true,
				} as EventListenerOptions);
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
