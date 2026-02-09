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
	if (!browser || !window.speechSynthesis) {
		logService.error("ui", "Speech synthesis not available in window");
		return;
	}

	const ss = window.speechSynthesis;
	logService.log("ui", "speakText call", { 
		text: text.substring(0, 10), 
		lang, 
		speaking: ss.speaking, 
		pending: ss.pending, 
		paused: ss.paused 
	});
	
	if (ss.speaking || ss.pending) {
		ss.cancel();
	}

	// Try to get voices immediately
	let currentVoices = voices;
	if (currentVoices.length === 0) {
		currentVoices = ss.getVoices();
		logService.log("ui", "Fresh voices check", { count: currentVoices.length });
		if (currentVoices.length > 0) {
			voices = currentVoices;
			voicesLoaded = true;
		} else {
			preloadVoices();
		}
	}

	const utterance = new SpeechSynthesisUtterance(text);
	let selectedVoice: SpeechSynthesisVoice | undefined;

	// 1. User Preference
	try {
		const prefs = settingsStore.value.voicePreferences as Record<string, string>;
		if (prefs && prefs[lang]) {
			selectedVoice = currentVoices.find(v => v.voiceURI === prefs[lang]);
		}
	} catch (e) {
		// ignore
	}

	// 2. Auto-detect
	if (!selectedVoice && currentVoices.length > 0) {
		// CRH logic
		if (lang === "crh") {
			selectedVoice = findBestVoice(currentVoices, "tr");
		} else {
			selectedVoice = findBestVoice(currentVoices, lang);
		}
	}

	// 3. Setup Utterance
	if (selectedVoice) {
		utterance.voice = selectedVoice;
		utterance.lang = selectedVoice.lang;
	} else {
		// FALLBACK for "Empty Voices" scenario (iOS first run)
		// We set a hardcoded valid BCP 47 language tag.
		// iOS Safari is more likely to speak if we give it 'uk-UA' than just 'uk'.
		
		let fallbackLang = DEFAULT_LOCALES[lang] || lang;
		
		if (lang === "crh") fallbackLang = "tr-TR"; // Hard force Turkish for CRH

		utterance.lang = fallbackLang;
		
		// Log this case so we know we are running "blind"
		logService.log("ui", "Speaking with fallback locale (no voice obj)", { lang: fallbackLang });
	}

	utterance.rate = 0.9;

	// Debug
	// console.log(`Speaking: ${text} (${utterance.lang}) Voice: ${selectedVoice?.name || 'System'}`);

	utterance.onerror = (e) => {
		logService.error("ui", "Speech error", { error: e.error, elapsed: e.elapsedTime });
	};

	window.speechSynthesis.speak(utterance);
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