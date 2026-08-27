<script lang="ts">
	/**
	 * Root Layout — Ініціалізація i18n та глобальні стилі
	 */
	import { onMount } from "svelte";
	import { initializeI18n } from "$lib/i18n/init";
	import { _, isLoading, locale } from "svelte-i18n";
	import { Check } from "lucide-svelte";
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
	import JsonLd from "$lib/components/seo/JsonLd.svelte";
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

	/**
	 * ЗАСТАВКА, З ЯКОЇ Є ВИХІД.
	 *
	 * Гейт нижче (`ready && !$isLoading && authStore.isDataReady`) вирішує, чи
	 * малювати застосунок узагалі — а разом із ним і `{@render children()}`,
	 * тобто `+error.svelte`. Тобто глобальна сторінка помилки НЕ ДОСЯГАЛАСЯ саме
	 * в тому випадку, заради якого існує: доки гейт закритий, її нікуди
	 * вставити, і користувач бачить кружечок, який крутиться вічно.
	 *
	 * Закритися назавжди гейт міг трьома способами, і жоден нічого не писав:
	 *
	 *   1. `init()` — async, і викликався без `.catch()`. Відмова
	 *      `initializeI18n()` (побитий словник, чанк, який не доїхав крізь
	 *      застарілий service worker) лишала `ready = false` і мовчазний
	 *      відхилений проміс;
	 *   2. `authStore.isDataReady` чекає на зворотний виклик Firebase Auth. Якщо
	 *      SDK не завантажився, виклику не буде ніколи;
	 *   3. `$isLoading` зі svelte-i18n лишається `true`, поки словник не
	 *      приїхав.
	 *
	 * Тому тут ДВА різні механізми, і вони не замінюють один одного:
	 *
	 *   * `.catch()` ловить те, що впало, — і має що показати;
	 *   * сторож за часом ловить те, що просто не сталося, — падіння немає.
	 *
	 * Панель НЕ каже «помилка» й не прибирає кружечок: повільна мережа виглядає
	 * так само в перші секунди, і оголосити їй поломку означало б злякати того,
	 * у кого все ще завантажується. Вона додає ВИХІД — перезавантаження і текст
	 * діагностики, — лишаючи завантаження тривати.
	 */
	const SLOW_START_MS = 20_000;
	let slowStart = $state(false);
	/**
	 * Причина падіння живе тут ЦІЛИМ ОБ'ЄКТОМ і йде лише в текст діагностики.
	 *
	 * На екран вона не потрапляє навмисно: сире `.message` — це рядок від
	 * Firebase або від завантажувача чанків, англійський і адресований
	 * розробнику (ERROR-HANDLING-v8, анти-патерн CRITICAL). Користувачеві він
	 * не пояснює нічого, а в баг-репорті він і є найціннішим.
	 */
	let startupError = $state<unknown>(null);
	let diagnosticsCopied = $state(false);
	/** Текст показується полем, коли буфер обміну недоступний (ERROR-HANDLING-v8). */
	let diagnosticsFallback = $state<string | null>(null);
	let startupWatchdog: ReturnType<typeof setTimeout> | undefined;

	function startupErrorText(): string {
		if (startupError == null) return "-";
		if (startupError instanceof Error) return startupError.message;
		return String(startupError);
	}

	/** Усе, що знадобиться в баг-репорті про застряглий старт. */
	function startupDiagnostics(): string {
		return [
			`version: ${versionStore.currentVersion ?? "unknown"}`,
			`url: ${typeof location === "undefined" ? "-" : location.href}`,
			`ua: ${typeof navigator === "undefined" ? "-" : navigator.userAgent}`,
			`online: ${typeof navigator === "undefined" ? "-" : navigator.onLine}`,
			`i18nLoading: ${$isLoading}`,
			`ready: ${ready}`,
			`authInitialized: ${authStore.isInitialized}`,
			`dataReady: ${authStore.isDataReady}`,
			`startupError: ${startupErrorText()}`,
			"----------------------------------------",
			logService.getRecentLogs(),
		].join("\n");
	}

	async function copyDiagnostics() {
		const text = startupDiagnostics();
		try {
			await navigator.clipboard.writeText(text);
			diagnosticsCopied = true;
			diagnosticsFallback = null;
			setTimeout(() => (diagnosticsCopied = false), 2000);
		} catch {
			/*
			 * Відмова буфера не має з'їдати звіт: на застряглому старті це єдиний
			 * спосіб дізнатися, ЧОМУ він застряг. Показуємо текст полем поруч —
			 * виділити й скопіювати вручну можна завжди.
			 */
			diagnosticsFallback = text;
		}
	}

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
								if (
									versionStore.serverVersion &&
									versionStore.currentVersion === versionStore.serverVersion
								) {
									logService.log(
										"version",
										"Current version matches server, ignoring SW update event.",
									);
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
					logService.log(
						"version",
						"Unregistered stray service worker in dev mode.",
					);
				}
			}

			// Analytics
			initGA();
		};

		/*
		 * `.catch()`, а не голий виклик: `init()` асинхронний, і відхилений
		 * проміс тут не має куди спливти — сторінка лишається на заставці, а в
		 * журналі немає нічого. Повідомлення зберігається, щоб поїхати в
		 * діагностику: без нього залишається сам факт «не завантажилось».
		 */
		init().catch((error: unknown) => {
			startupError = error;
			logService.error("version", "Startup failed:", error);
			slowStart = true;
		});

		/*
		 * Сторож на випадок, коли нічого не падає, а просто не настає: зворотний
		 * виклик Firebase Auth, якого не буде, або словник, що не доїхав.
		 * `$effect` нижче знімає його, щойно гейт відкрився.
		 */
		startupWatchdog = setTimeout(() => {
			slowStart = true;
			logService.warn(
				"version",
				`Startup still not ready after ${SLOW_START_MS} ms — offering reload.`,
			);
		}, SLOW_START_MS);

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
		const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
		const handleThemeChange = (e: MediaQueryListEvent) => {
			// Синхронізація лише якщо користувач на базових темах
			const current = settingsStore.value.theme;
			if (current === "dark-gray" || current === "light-gray") {
				settingsStore.setTheme(e.matches ? "dark-gray" : "light-gray");
			}
		};
		mediaQuery.addEventListener("change", handleThemeChange);

		return () => {
			clearTimeout(startupWatchdog);
			window.removeEventListener("resize", updateVh);
			window.removeEventListener("orientationchange", updateVh);
			window.removeEventListener("click", handleGlobalClick);
			window.removeEventListener("visibilitychange", handleVisibilityChange);
			window.removeEventListener("focus", handleVisibilityChange);
			mediaQuery.removeEventListener("change", handleThemeChange);
			if (handleFirstTouch)
				window.removeEventListener("touchstart", handleFirstTouch);
			if (handleFirstClick)
				window.removeEventListener("click", handleFirstClick, {
					capture: true,
				} as EventListenerOptions);
		};
	});

	/*
	 * Сторож знімається, щойно застосунок з'явився: інакше він розбудив би
	 * панель уже поверх робочої сторінки, і на 20-й секунді роботи вона
	 * повідомляла б про застряглий старт, якого не було.
	 */
	$effect(() => {
		if (appVisible) {
			clearTimeout(startupWatchdog);
			slowStart = false;
		}
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
		"@context": "https://schema.org",
		"@type": "WebApplication",
		name: "Slovko",
		url: "https://alik532ua.github.io/Slovko/",
		description:
			"Українська версія популярної гри в слова (Wordle). Вгадуйте щоденні слова, грайте без обмежень та тренуйте словниковий запас.",
		applicationCategory: "GameApplication",
		operatingSystem: "Any",
		inLanguage: settingsStore.value.interfaceLanguage || "uk",
		author: {
			"@type": "Person",
			name: "Alik532UA",
		},
	});

	/**
	 * Службовий маршрут (BETA-CHECKLIST-v8 § 4). `pathname`, а не
	 * `searchParams`: другий під час пререндеру кидає виняток, бо рядок запиту
	 * на етапі збірки невідомий.
	 */
	const isHidden = $derived(isHiddenRoute(page.url.pathname));

	/**
	 * Умова показу застосунку — в ОДНОМУ місці: її читає і розмітка, і сторож
	 * старту. Доти вона стояла лише в `{:else if}`, тож будь-яка перевірка
	 * «а чи ми ще на заставці» неминуче була б її копією.
	 */
	const appVisible = $derived(ready && !$isLoading && authStore.isDataReady);

	/**
	 * Тексти панелі застряглого старту — з перевіркою, що словник узагалі є.
	 *
	 * Умова саме `$locale`, а НЕ `!$isLoading`. Перевірено в
	 * `node_modules/svelte-i18n/dist/runtime.cjs`: `isLoading` створюється як
	 * `writable(false)` і стає `true` лише на час завантаження словника. Тобто
	 * ДО `init()` він `false` — «не завантажується» й «завантажено» виглядають
	 * однаково. А `formatMessage` при `locale == null` КИДАЄ
	 * («Cannot format a message without first setting the initial locale»), і
	 * кинуло б це просто в макеті — тобто панель, що існує заради поламаного
	 * старту, ламала б сторінку остаточно. `$locale` натомість стає непорожнім
	 * лише після того, як словник доїхав.
	 *
	 * `try` понад те — навмисне дублювання: єдиний екран, який мусить пережити
	 * геть усе, не спирається на одну умову.
	 */
	const startupText = $derived.by(() => {
		const fallback = {
			slowTitle: "This is taking longer than usual",
			slowHint: "The network may be slow. You can wait a little longer or reload the page.",
			reload: "Reload",
			copyDiagnostics: "Copy diagnostics",
			copyFailed: "Clipboard unavailable — select the text below and copy it manually",
		};
		if (!$locale || $isLoading) return fallback;
		try {
			return {
				slowTitle: $_("startup.slowTitle"),
				slowHint: $_("startup.slowHint"),
				reload: $_("startup.reload"),
				copyDiagnostics: $_("startup.copyDiagnostics"),
				copyFailed: $_("startup.copyFailed"),
			};
		} catch {
			return fallback;
		}
	});

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
		<meta
			name="robots"
			content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"
		/>
	{/if}
</svelte:head>

<!--
	Structured Data (SEO-v8 § 3.2) — у власному компоненті, бо `{@html}`
	придушується файловим винятком, а не коментарем (див. `JsonLd.svelte`).
	На прихованих маршрутах не рендериться зовсім: `noindex` разом із
	розміткою сутності — суперечливий сигнал.
-->
{#if !isHidden}
	<JsonLd data={jsonLdData} />
{/if}

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
{:else if appVisible}
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

		<!--
			Кружечок лишається крутитися: завантаження справді триває, і оголосити
			йому поломку означало б збрехати тому, у кого просто повільна мережа.
			Панель лише додає вихід.

			Тексти — через `startupText`: словник тут може бути ще не завантажений,
			і саме він міг застрягти. Запасний англійський екран гірший за
			перекладений, але незрівнянно кращий за порожній.
		-->
		{#if slowStart}
			<div class="startup-notice" role="alert" data-testid="startup-message">
				<p class="startup-title">{startupText.slowTitle}</p>
				<p class="startup-hint">{startupText.slowHint}</p>

				<div class="startup-actions">
					<button
						type="button"
						class="startup-btn primary"
						data-testid="startup-reload-btn"
						onclick={() => location.reload()}
					>
						{startupText.reload}
					</button>
					<button
						type="button"
						class="startup-btn"
						data-testid="startup-diagnostics-btn"
						onclick={copyDiagnostics}
					>
						{#if diagnosticsCopied}
							<Check size={16} aria-hidden="true" />
						{/if}
						{startupText.copyDiagnostics}
					</button>
				</div>

				{#if diagnosticsFallback}
					<p class="startup-hint">{startupText.copyFailed}</p>
					<textarea
						class="startup-diagnostics"
						data-testid="startup-diagnostics-text"
						readonly
						rows="6"
						value={diagnosticsFallback}
					></textarea>
				{/if}
			</div>
		{/if}
	</div>
{/if}

<style>
	.loading {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		gap: 2rem;
		height: 100dvh;
		padding: 1rem;
		background: var(--bg-primary, #1a1a2e);
	}

	/*
	 * Запасні значення в `var()` тут навмисні, і причина та сама, що й у
	 * `.loading` вище: панель показується в момент, коли невідомо, чи доїхало
	 * взагалі щось. Якщо `app.css` не завантажився, токенів немає — а панель
	 * мусить лишитися читабельною, бо іншого способу повідомити вже не буде.
	 */
	.startup-notice {
		max-width: 32rem;
		width: 100%;
		text-align: center;
		color: var(--text-primary, #eaeaea);
		font-size: 0.95rem;
		line-height: 1.5;
	}

	.startup-title {
		margin: 0 0 0.5rem;
		font-weight: 700;
	}

	.startup-hint {
		margin: 0 0 1rem;
		color: var(--text-secondary, #a0a0a0);
		font-size: 0.85rem;
	}

	.startup-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		justify-content: center;
	}

	.startup-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		/* WCAG 2.2 SC 2.5.8: ціль не менша за 24×24 навіть без токенів теми. */
		min-height: 2.75rem;
		padding: 0.65rem 1.25rem;
		border-radius: 12px;
		border: 1px solid var(--border, #565a63);
		background: var(--bg-hover, rgba(255, 255, 255, 0.08));
		color: var(--text-primary, #eaeaea);
		font: inherit;
		font-weight: 600;
		cursor: pointer;
	}

	.startup-btn.primary {
		background: var(--accent, #e95420);
		border-color: transparent;
		color: var(--text-on-accent, #ffffff);
	}

	.startup-diagnostics {
		width: 100%;
		margin-top: 0.75rem;
		padding: 0.75rem;
		border-radius: 12px;
		border: 1px solid var(--border, #565a63);
		background: var(--bg-active, rgba(0, 0, 0, 0.25));
		color: var(--text-secondary, #a0a0a0);
		font-family: monospace;
		font-size: 0.75rem;
		resize: vertical;
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
