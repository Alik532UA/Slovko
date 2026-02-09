/**
 * Speech Service — озвучування слів через Web Speech API
 * Optimized for iOS (Safari) and Android compatibility
 */

import { browser } from "$app/environment";
import { settingsStore } from "../stores/settingsStore.svelte";
import { logService } from "./logService";

// Helper to handle "en_US" vs "en-US"
function normalizeLocale(locale: string): string {
	return locale.replace('_', '-');
}

// Пріоритетні локалі для "сліпого" запуску (коли список голосів ще пустий)
// iOS дуже чутливий до точного коду мови (uk-UA, а не uk)
const DEFAULT_LOCALES: Record<string, string> = {
	uk: "uk-UA",
	en: "en-US", 
	nl: "nl-NL",
	de: "de-DE",
	el: "el-GR",
	crh: "tr-TR", // Fallback for Crimean Tatar
	tr: "tr-TR"
};

// Маппінг для пошуку голосів
const LANGUAGE_PRIORITIES: Record<string, string[]> = {
	uk: ["uk-UA", "uk_UA", "uk"],
	en: ["en-GB", "en_GB", "en-US", "en_US", "en"],
	nl: ["nl-NL", "nl_NL", "nl-BE", "nl_BE", "nl"],
	de: ["de-DE", "de_DE", "de-AT", "de_AT", "de"],
	el: ["el-GR", "el_GR", "el"],
	crh: ["tr-TR", "tr_TR", "tr", "az-AZ", "az"],
	tr: ["tr-TR", "tr_TR", "tr"]
};

let voices: SpeechSynthesisVoice[] = [];
let voicesLoaded = false;
let currentUtterance: SpeechSynthesisUtterance | null = null; // Запобігає Garbage Collection на iOS

/**
 * Trigger voice loading in background without blocking
 */
function preloadVoices() {
	if (!browser || !window.speechSynthesis) return;
	
	const current = window.speechSynthesis.getVoices();
	if (current.length > 0) {
		voices = current;
		voicesLoaded = true;
	} else {
		// Safari requires this listener to populate the list
		window.speechSynthesis.onvoiceschanged = () => {
			voices = window.speechSynthesis.getVoices();
			voicesLoaded = true;
			logService.log("ui", "Voices loaded async", { count: voices.length });
		};
	}
}

/**
 * Знаходить найкращий голос для мови
 */
export function findBestVoice(
	availableVoices: SpeechSynthesisVoice[],
	lang: string,
): SpeechSynthesisVoice | undefined {
	if (!availableVoices.length) return undefined;

	const priorities = LANGUAGE_PRIORITIES[lang];
	if (priorities) {
		for (const code of priorities) {
			const normCode = normalizeLocale(code);
			
			// 1. Exact match (normalized)
			const exact = availableVoices.find(v => normalizeLocale(v.lang) === normCode);
			if (exact) return exact;
			
			// 2. Prefix match
			const prefix = availableVoices.find(v => normalizeLocale(v.lang).startsWith(normCode));
			if (prefix) return prefix;
		}
	}

	// 3. Generic prefix match
	return availableVoices.find(v => normalizeLocale(v.lang).startsWith(lang));
}

/**
 * Озвучити текст — FIRE AND FORGET (Synchronous for iOS)
 */
export function speakText(text: string, lang: string): void {
	if (!browser || !window.speechSynthesis) return;

	const ss = window.speechSynthesis;
	
	// Отримуємо голоси безпосередньо зараз
	const currentVoices = ss.getVoices();
	
	logService.log("ui", "speakText start", { 
		text: text.substring(0, 10), 
		lang,
		voicesAvailable: currentVoices.length,
		paused: ss.paused,
		speaking: ss.speaking
	});
	
	// На iOS Safari важливо викликати resume(), якщо рушій "заснув"
	if (ss.paused) {
		ss.resume();
	}

	// cancel() на iOS може працювати нестабільно, спробуємо мінімізувати його
	if (ss.speaking) {
		ss.cancel();
	}

	currentUtterance = new SpeechSynthesisUtterance(text);
	let selectedVoice: SpeechSynthesisVoice | undefined;
	let hasUserPreference = false;

	try {
		const prefs = settingsStore.value.voicePreferences as Record<string, string>;
		if (prefs && prefs[lang]) {
			selectedVoice = currentVoices.find(v => v.voiceURI === prefs[lang]);
			if (selectedVoice) hasUserPreference = true;
		}
	} catch (e) {
		logService.warn("ui", "Error reading prefs");
	}

	if (!selectedVoice && currentVoices.length > 0) {
		const searchLang = lang === "crh" ? "tr" : lang;
		selectedVoice = findBestVoice(currentVoices, searchLang);
	}

	// КРИТИЧНО ДЛЯ iOS: Якщо користувач не вибрав голос сам, краще НЕ встановлювати 
	// властивість .voice, а дати Safari вибрати дефолтний голос за кодом .lang
	if (hasUserPreference && selectedVoice) {
		currentUtterance.voice = selectedVoice;
		currentUtterance.lang = selectedVoice.lang;
	} else {
		currentUtterance.lang = DEFAULT_LOCALES[lang] || lang;
		if (lang === "crh") currentUtterance.lang = "tr-TR";
	}

	currentUtterance.rate = 0.9;
	currentUtterance.volume = 1.0;

	logService.log("ui", "Utterance prepared", { 
		finalLang: currentUtterance.lang,
		voiceName: hasUserPreference ? selectedVoice?.name : "System Auto-Select",
		hasPref: hasUserPreference
	});

	currentUtterance.onerror = (e) => {
		logService.error("ui", "Speech error event", { error: e.error });
	};

	currentUtterance.onstart = () => {
		logService.log("ui", "Speech started callback ✅");
	};

	try {
		// "Струшуємо" рушій перед кожним викликом
		ss.pause();
		ss.resume();
		ss.speak(currentUtterance);
		logService.log("ui", "ss.speak() called", { pending: ss.pending });
		
		// Обов'язковий resume() після speak() для iOS
		setTimeout(() => {
			if (ss.paused) ss.resume();
		}, 50);
	} catch (err) {
		logService.error("ui", "ss.speak() crash", err);
	}
}

/**
 * Legacy support
 */
export function speakEnglish(text: string): void {
	speakText(text, "en");
}

/**
 * Зупинити озвучування
 */
export function stopSpeech(): void {
	if (browser && window.speechSynthesis) {
		window.speechSynthesis.cancel();
	}
}

// Start loading immediately
if (browser) {
	preloadVoices();
}