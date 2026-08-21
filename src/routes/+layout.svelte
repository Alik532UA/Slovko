<script lang="ts">
	/**
	 * Root Layout — Ініціалізація i18n та глобальні стилі
	 */
	import { onMount } from "svelte";
	import { initializeI18n } from "$lib/i18n/init";
	import { isLoading } from "svelte-i18n";
	import { checkForUpdates } from "$lib/services/versionService";
	import { versionStore } from "$lib/controllers/VersionStore.svelte";
	import { settingsStore } from "$lib/controllers/SettingsStore.svelte";
	import UpdateNotification from "$lib/components/navigation/UpdateNotification.svelte";
	import NetworkIndicator from "$lib/components/ui/NetworkIndicator.svelte";
	import ToastContainer from "$lib/components/ui/ToastContainer.svelte";
	import InteractionSystem from "$lib/components/interaction/InteractionSystem.svelte";
	import OnboardingModal from "$lib/components/onboarding/OnboardingModal.svelte";
	import MigrationOverlay from "$lib/components/ui/MigrationOverlay.svelte";
	import { authStore } from "$lib/controllers/AuthStore.svelte";
	import { logService } from "$lib/services/logService.svelte";
	import LogCopyButton from "$lib/components/debug/LogCopyButton.svelte";
	import {
		initGA,
		trackPageView,
		trackEvent,
	} from "$lib/services/analyticsService";
	import { webVitals } from "$lib/controllers/webVitals.svelte";
	import { pwaStore } from "$lib/controllers/PwaStore.svelte";
	import { page } from "$app/state";
	import { isHiddenRoute } from "$lib/config/hiddenRoutes";
	import { navigationState } from "$lib/controllers/NavigationState.svelte";
	import { acceptsShortcut } from "$lib/services/keyboard";
	import type { AppTheme } from "$lib/types/index";
	import { migrateStorageKeys } from "$lib/utils/storageMigration";

	// Modals
	import LevelTopicModal from "$lib/components/navigation/LevelTopicModal.svelte";
	import LanguageSettings from "$lib/components/settings/LanguageSettings.svelte";
	import AboutModal from "$lib/components/settings/AboutModal.svelte";
	import ThemeModal from "$lib/components/settings/ThemeModal.svelte";
	import ProfileModal from "$lib/components/settings/ProfileModal.svelte";
	import StatsModal from "$lib/components/settings/StatsModal.svelte";
	import SpeechErrorModal from "$lib/components/ui/SpeechErrorModal.svelte";

	import "../app.css";

	// Services Context Setup
	import { gameController } from "$lib/services/gameController";
	import { setGameController } from "$lib/config/gameContext";
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
		migrateStorageKeys();
		logService.log("version", "Root layout onMount started");

		// Signal to the global error diagnostics that Svelte has mounted
		// @ts-expect-error global function
		if (typeof window.__markAppRendered === "function") {
			// @ts-expect-error global function
			window.__markAppRendered();
		}

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
				} catch {
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
				} catch {
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

			// Initialize PWA Store
			pwaStore.init();

			if (!dev && "serviceWorker" in navigator) {
				let isInitialInstall = false;
				const registration = await navigator.serviceWorker.register(
					`${base}/service-worker.js`,
				);

				// Якщо controller null при реєстрації, це перше завантаження (або після unregistered)
				if (!navigator.serviceWorker.controller) {
					isInitialInstall = true;
				}

				// Слухаємо оновлення Service Worker
				registration.addEventListener("updatefound", () => {
					const newWorker = registration.installing;
					if (newWorker) {
						newWorker.addEventListener("statechange", () => {
							if (
								newWorker.state === "installed" &&
								navigator.serviceWorker.controller &&
								!isInitialInstall
							) {
								logService.log(
									"version",
									"New Service Worker found and installed. Triggering banner.",
								);
								// Запобігаємо показу однакових версій
								if (versionStore.serverVersion && versionStore.currentVersion === versionStore.serverVersion) {
									logService.log("version", "Current version matches server, ignoring SW update event.");
								} else {
									versionStore.setUpdate(true);
								}
							}
						});
					}
				});
			} else if (dev && "serviceWorker" in navigator) {
				// В dev-режимі видаляємо старі SW, щоб вони не крашились при фоновому оновленні
				const registrations = await navigator.serviceWorker.getRegistrations();
				for (const registration of registrations) {
					registration.unregister();
					logService.log("version", "Unregistered stray service worker in dev mode.");
				}
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

		// OS theme sync
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		const handleThemeChange = (e: MediaQueryListEvent) => {
			// Синхронізація лише якщо користувач на базових темах
			const current = settingsStore.value.theme;
			if (current === 'dark-gray' || current === 'light-gray') {
				settingsStore.setTheme(e.matches ? 'dark-gray' : 'light-gray');
			}
		};
		mediaQuery.addEventListener('change', handleThemeChange);

		return () => {
			window.removeEventListener("resize", updateVh);
			window.removeEventListener("orientationchange", updateVh);
			window.removeEventListener("click", handleGlobalClick);
			window.removeEventListener("visibilitychange", handleVisibilityChange);
			window.removeEventListener("focus", handleVisibilityChange);
			mediaQuery.removeEventListener('change', handleThemeChange);
			if (handleFirstTouch)
				window.removeEventListener("touchstart", handleFirstTouch);
			if (handleFirstClick)
				window.removeEventListener("click", handleFirstClick, {
					capture: true,
				} as EventListenerOptions);
		};
	});

	$effect(() => {
		const { theme, bgType, bgBlur, interfaceLanguage } = settingsStore.value;
		document.documentElement.setAttribute("data-theme", theme);
		document.documentElement.setAttribute("data-bg-type", bgType);
		document.documentElement.setAttribute("data-bg-blur", bgBlur);
		document.documentElement.lang = interfaceLanguage;
		
		const isDark = theme === "dark-gray" || theme === "orange";
		const meta = document.querySelector('meta[name="color-scheme"]');
		if (meta) {
			meta.setAttribute("content", isDark ? "dark" : "light dark");
		}
	});

	// Відстеження зміни сторінок
	$effect(() => {
		trackPageView(page.url.pathname);
	});

	// Start RUM Core Web Vitals collection (OBSERVABILITY-v8 § 2.1)
	$effect(() => webVitals.start());

	let jsonLdData = $derived({
		'@context': 'https://schema.org',
		'@type': 'WebApplication',
		name: 'Slovko',
		url: 'https://alik532ua.github.io/Slovko/',
		description: 'Українська версія популярної гри в слова (Wordle). Вгадуйте щоденні слова, грайте без обмежень та тренуйте словниковий запас.',
		applicationCategory: 'GameApplication',
		operatingSystem: 'Any',
		inLanguage: settingsStore.value.interfaceLanguage || 'uk',
		author: {
			'@type': 'Person',
			name: 'Alik532UA'
		}
	});

	/**
	 * Службовий маршрут (BETA-CHECKLIST-v8 § 4). `pathname`, а не
	 * `searchParams`: другий під час пререндеру кидає виняток, бо рядок запиту
	 * на етапі збірки невідомий.
	 */
	const isHidden = $derived(isHiddenRoute(page.url.pathname));

	/**
	 * Гарячі клавіші: `T` — тема, `L` — панель мов (HOTKEYS-v8 § 1.1).
	 *
	 * **Тут, а не в компоненті налаштувань.** Обидві дії мусять працювати з будь-якої
	 * сторінки, а вікна тем і мов на екрані здебільшого немає — то були б клавіші,
	 * які працюють лише там, де вони й так не потрібні. Layout рендериться завжди.
	 *
	 * **`T` перемикає по колу, `L` відкриває ПАНЕЛЬ.** Різниця не в смаку: тему
	 * задає `settingsStore.setTheme`, тобто дія суто клієнтська й миттєва, а тем
	 * усього чотири. Мов в інтерфейсі значно більше, і «наступна мова» по колу
	 * означала б блукання через незнайомі підписи; тому клавіша робить те саме, що
	 * кнопка: відкриває список із прапорцями.
	 *
	 * **Захист полів вводу — не деталь, а причина існування `acceptsShortcut`.**
	 * Обробник висить на вікні, тож без нього літера `t` у назві плейлиста міняла б
	 * тему, а `l` — відкривала б панель мов посеред набору. `Escape` єдиний
	 * проходить із поля: панель, яку відкрили клавішею, більше нічим не закрити.
	 */
	const THEME_ORDER: AppTheme[] = [
		"dark-gray",
		"light-gray",
		"orange",
		"green",
	];

	function handleShortcut(event: KeyboardEvent) {
		/*
		 * WCAG SC 2.1.4 «Character Key Shortcuts», рівень A (HOTKEYS-v8 § 3).
		 *
		 * `T` і `L` — одиночні літери, тож критерій вимагає одного з трьох:
		 * вимкнути, перепризначити або обмежити фокусом. Обрано перше —
		 * перемикач у «Про проєкт»; він же й робить скорочення виявними, бо
		 * поруч перелічені самі клавіші (§ 5).
		 *
		 * Перевірка стоїть ПЕРЕД усім іншим, включно з `acceptsShortcut`:
		 * вимкнене означає вимкнене, а не «вимкнене, крім одного випадку».
		 */
		if (!settingsStore.value.enableHotkeys) return;
		if (!acceptsShortcut(event)) return;

		if (event.code === "KeyT") {
			const current = settingsStore.value.theme;
			const next =
				THEME_ORDER[(THEME_ORDER.indexOf(current) + 1) % THEME_ORDER.length];
			settingsStore.setTheme(next);
			// `preventDefault` лише після того, як дія відбулася (HOTKEYS-v8 § 2.4).
			event.preventDefault();
			return;
		}

		if (event.code === "KeyL") {
			// Перемикач, а не «відкрити»: клавіша, яка лише відкриває, лишає людину
			// шукати мишкою, чим закрити те, що вона щойно відкрила з клавіатури.
			if (page.url.searchParams.get("modal") === "languages") {
				navigationState.closeModal();
			} else {
				navigationState.openModal("languages");
			}
			event.preventDefault();
		}
	}
</script>

<svelte:window onkeydown={handleShortcut} />

<svelte:head>
	{#if isHidden}
		<!--
			Політика прихованих маршрутів живе в одному модулі
			(BETA-CHECKLIST-v8 § 4.1): звідси `noindex`, звідти ж
			`hooks.server.ts` бере перелік, щоб не лишати canonical. Тег стоїть у
			layout, а не на сторінці, бо сторінка рендериться нижче за гейт
			готовності — а той під час пререндеру завжди закритий, тож зі
			`svelte:head` самої сторінки в зібраний HTML не потрапляло НІЧОГО.
		-->
		<meta name="robots" content="noindex, nofollow" />
	{:else}
		<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
		<!-- Structured Data (SEO-v8 § 3.2) -->
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html `<script type="application/ld+json">${JSON.stringify(jsonLdData)}<\/script>`}
	{/if}
</svelte:head>

<LogCopyButton />

{#if versionStore.hasUpdate && versionStore.currentVersion}
	<UpdateNotification version={versionStore.serverVersion} />
{/if}

{#if isHidden}
	<!--
		Службові сторінки не чекають на гру: їм не потрібні ні словники, ні
		сеанс, ні синхронізація. Через гейт нижче вони віддавали б у зібраному
		HTML лише кружечок завантаження — тобто порожню сторінку для всіх, хто
		відкриє посилання з вимкненим JavaScript, і для будь-якої перевірки над
		`build/`.
	-->
	{@render children()}
{:else if ready && !$isLoading && authStore.isDataReady}
	{@render children()}

	{#if !settingsStore.value.hasCompletedOnboarding}
		<OnboardingModal />
	{/if}

	{@const activeModal = page.url.searchParams.get("modal")}

	{#if activeModal === "levels"}
		<LevelTopicModal onclose={() => navigationState.closeModal()} />
	{:else if activeModal === "languages"}
		<LanguageSettings onclose={() => navigationState.closeModal()} />
	{:else if activeModal === "about"}
		<AboutModal onclose={() => navigationState.closeModal()} />
	{:else if activeModal === "themes"}
		<ThemeModal onclose={() => navigationState.closeModal()} />
	{:else if activeModal === "stats"}
		<StatsModal
			initialTab={page.url.searchParams.get("tab") as "leaderboard" | "stats"}
			onclose={() => navigationState.closeModal()}
		/>
	{:else if activeModal === "profile"}
		<ProfileModal
			initialTab={page.url.searchParams.get("tab") as "friends" | "account"}
			onclose={() => navigationState.closeModal()}
		/>
	{/if}

	<ToastContainer />
	<InteractionSystem />
	<NetworkIndicator />
	<MigrationOverlay />
	<SpeechErrorModal />
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
		height: 100dvh;
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
