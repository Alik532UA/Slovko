/**
 * Speech Service — озвучування слів через Web Speech API
 * Final stable version for iOS/Android/Desktop
 */

import { browser } from "$app/environment";
import { settingsStore } from "../controllers/SettingsStore.svelte";
import { logService } from "./logService.svelte";
import { notificationStore } from "../controllers/NotificationStore.svelte";
import { speechModalStore } from "../controllers/SpeechModalStore.svelte";

let hasShownSpeechError = false;

function normalizeLocale(locale: string): string {
	return locale.replace('_', '-');
}

const DEFAULT_LOCALES: Record<string, string> = {
	uk: "uk-UA",
	en: "en-GB",
	nl: "nl-NL",
	de: "de-DE",
	el: "el-GR",
	crh: "tr-TR",
	tr: "tr-TR"
};

const LANGUAGE_PRIORITIES: Record<string, string[]> = {
	uk: ["uk-UA", "uk"],
	en: ["en-GB", "en-US", "en"],
	nl: ["nl-NL", "nl-BE", "nl"],
	de: ["de-DE", "de-AT", "de"],
	el: ["el-GR", "el"],
	crh: ["tr-TR", "tr"],
	tr: ["tr-TR", "tr"]
};

let voices: SpeechSynthesisVoice[] = [];
let currentUtterance: SpeechSynthesisUtterance | null = null;

function preloadVoices() {
	if (!browser || !window.speechSynthesis) return;
	const v = window.speechSynthesis.getVoices();
	if (v.length > 0) voices = v;
	window.speechSynthesis.onvoiceschanged = () => {
		voices = window.speechSynthesis.getVoices();
	};
}

export function findBestVoice(availableVoices: SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice | undefined {
	if (!availableVoices.length) return undefined;
	const priorities = LANGUAGE_PRIORITIES[lang] || [lang];
	for (const code of priorities) {
		const normCode = normalizeLocale(code);
		const found = availableVoices.find(v => normalizeLocale(v.lang) === normCode || normalizeLocale(v.lang).startsWith(normCode));
		if (found) return found;
	}
	return availableVoices.find(v => normalizeLocale(v.lang).startsWith(lang));
}

export function speakText(text: string, lang: string): void {
	if (!browser || !window.speechSynthesis) return;

	const ss = window.speechSynthesis;

	// 1. Одразу скасовуємо все старе (синхронно)
	ss.cancel();

	// 2. Отримуємо голоси
	const currentVoices = voices.length > 0 ? voices : ss.getVoices();

	// 3. Створюємо новий запит
	currentUtterance = new SpeechSynthesisUtterance(text);

	let selectedVoice: SpeechSynthesisVoice | undefined;
	let hasUserPref = false;

	try {
		const prefs = settingsStore.value.voicePreferences as Record<string, string>;
		if (prefs && prefs[lang]) {
			selectedVoice = currentVoices.find(v => v.voiceURI === prefs[lang]);
			if (selectedVoice) hasUserPref = true;
		}
	} catch (error) {
		// Збій читання уподобань — очікуваний: сховище могло не піднятися, а
		// запис лишитися від старої схеми. Голос усе одно підбереться нижче,
		// тож рівень `warn`, а не `error` (ERROR-HANDLING-v8 § 1.4). Мовчазний
		// `catch` тут стояв доти, і вибір голосу тихо відкочувався на типовий.
		logService.warn("ui", "Не вдалося прочитати уподобання голосу", error);
	}

	if (!selectedVoice) {
		selectedVoice = findBestVoice(currentVoices, lang === "crh" ? "tr" : lang);
	}

	if (hasUserPref && selectedVoice) {
		currentUtterance.voice = selectedVoice;
		currentUtterance.lang = selectedVoice.lang;
	} else {
		currentUtterance.lang = DEFAULT_LOCALES[lang] || lang;
	}

	currentUtterance.rate = 0.9;

	currentUtterance.onstart = () => logService.log("ui", "Speech started ✅");
	currentUtterance.onerror = (e) => {
		if (e.error !== 'interrupted' && e.error !== 'canceled') {
			logService.error("ui", "Speech error", { error: e.error });
			if (e.error === 'synthesis-failed' && !hasShownSpeechError) {
				hasShownSpeechError = true;
				
				import('svelte/store').then(({ get }) => {
					import('svelte-i18n').then(({ _ }) => {
						const t = get(_);
						notificationStore.error(t("errors.speech.toast") || "Схоже цей браузер не підтримує озвучення слів 😕", 8000, {
							label: t("errors.speech.moreDetails") || "Детальніше",
							onClick: () => speechModalStore.open(lang)
						}, true);
					});
				}).catch(err => logService.error("ui", "Failed to load i18n in speechService", err));
			}
		}
	};

	// 4. Відтворюємо
	try {
		// Always resume — iOS може бути "locked" без стану "paused"
		ss.resume();
		ss.speak(currentUtterance);
	} catch (err) {
		logService.error("ui", "Speak crash", err);
	}
}

export function stopSpeech(): void {
	if (browser && window.speechSynthesis) window.speechSynthesis.cancel();
}

if (browser) {
	preloadVoices();

	// Debug utilities
	if (import.meta.env.DEV || true) { // Explicitly keeping it available just in case, but usually wrapped in DEV
		// @ts-expect-error adding debug tool
		window.__debugSpeechError = (lang = "uk") => {
			logService.warn("ui", "[DEBUG] Simulating speech error");
			import('svelte/store').then(({ get }) => {
				import('svelte-i18n').then(({ _ }) => {
					const t = get(_);
					notificationStore.error(t("errors.speech.toast") || "Схоже цей браузер не підтримує озвучення слів 😕", 8000, {
						label: t("errors.speech.moreDetails") || "Детальніше",
						onClick: () => speechModalStore.open(lang)
					}, true);
				});
			});
		};
		logService.info("ui", "[DEBUG] Use window.__debugSpeechError('uk') to test the error modal");
	}
}
