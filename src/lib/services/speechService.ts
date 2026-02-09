/**
 * Speech Service — озвучування слів через Web Speech API
 * Robust implementation for iOS/Android/Desktop
 */

import { browser } from "$app/environment";
import { settingsStore } from "../stores/settingsStore.svelte";
import { logService } from "./logService";

// Маппінг мов до пріоритетних голосів
const LANGUAGE_PRIORITIES: Record<string, string[]> = {
	uk: ["uk-UA", "uk"],
	en: ["en-GB", "en-US", "en"],
	nl: ["nl-NL", "nl-BE", "nl"],
	de: ["de-DE", "de-AT", "de"],
	crh: ["tr-TR", "tr", "az-AZ", "az"], // Кримськотатарська: fallback на турецьку
};

// Internal state
let voices: SpeechSynthesisVoice[] = [];
let voicesLoaded = false;

/**
 * Wait for voices to be loaded by the browser
 * Critical for iOS where getVoices() is empty initially
 */
async function ensureVoicesLoaded(): Promise<SpeechSynthesisVoice[]> {
	if (!browser || !window.speechSynthesis) return [];
	
	// If already loaded and valid
	if (voices.length > 0) return voices;
	
	const current = window.speechSynthesis.getVoices();
	if (current.length > 0) {
		voices = current;
		voicesLoaded = true;
		return voices;
	}

	// Wait for event
	return new Promise((resolve) => {
		// Safety timeout (iOS sometimes never fires voiceschanged if silent switch is on)
		const timeout = setTimeout(() => {
			const v = window.speechSynthesis.getVoices();
			logService.warn("ui", "Voice loading timeout", { count: v.length });
			voices = v;
			resolve(v);
		}, 2000);

		window.speechSynthesis.onvoiceschanged = () => {
			clearTimeout(timeout);
			const v = window.speechSynthesis.getVoices();
			logService.log("ui", "Voices loaded", { count: v.length });
			voices = v;
			voicesLoaded = true;
			resolve(v);
		};
	});
}

/**
 * Знаходить найкращий голос для мови
 */
export function findBestVoice(
	availableVoices: SpeechSynthesisVoice[],
	lang: string,
): SpeechSynthesisVoice | undefined {
	if (!availableVoices.length) return undefined;

	// 0. Check user preference first (if passed externally, usually handled in speakText)
	// But here we focus on finding a voice for a language
	
	// 1. Priority List
	const priorities = LANGUAGE_PRIORITIES[lang];
	if (priorities) {
		for (const code of priorities) {
			// Exact match first
			const exact = availableVoices.find(v => v.lang === code);
			if (exact) return exact;
			
			// Prefix match
			const prefix = availableVoices.find(v => v.lang.startsWith(code));
			if (prefix) return prefix;
		}
	}

	// 2. Loose match
	return availableVoices.find(v => v.lang.startsWith(lang));
}

/**
 * Озвучити текст заданою мовою
 */
export async function speakText(text: string, lang: string): Promise<void> {
	if (!browser || !window.speechSynthesis) {
		logService.warn("ui", "Speech synthesis not supported");
		return;
	}

	// Stop previous
	window.speechSynthesis.cancel();

	// Load voices if needed
	const availableVoices = await ensureVoicesLoaded();
	
	const utterance = new SpeechSynthesisUtterance(text);
	let selectedVoice: SpeechSynthesisVoice | undefined;

	// 1. User Preference
	try {
		const prefs = settingsStore.value.voicePreferences as Record<string, string>;
		if (prefs && prefs[lang]) {
			selectedVoice = availableVoices.find(v => v.voiceURI === prefs[lang]);
		}
	} catch (e) {
		logService.warn("ui", "Error reading voice prefs", e);
	}

	// 2. Auto-detect best voice
	if (!selectedVoice) {
		selectedVoice = findBestVoice(availableVoices, lang);
	}

	// 3. Fallback for CRH (Crimean Tatar) -> Turkish
	let effectiveLang = lang;
	if (lang === "crh") {
		effectiveLang = "tr"; // Use Turkish as system fallback
		if (!selectedVoice) {
			selectedVoice = findBestVoice(availableVoices, "tr");
		}
	}

	// Apply voice and lang
	if (selectedVoice) {
		utterance.voice = selectedVoice;
		utterance.lang = selectedVoice.lang;
	} else {
		// Fallback if no voice found (let browser decide based on lang)
		// Important: On iOS, 'uk' might not work, need 'uk-UA'
		const defaults = LANGUAGE_PRIORITIES[effectiveLang];
		utterance.lang = defaults ? defaults[0] : effectiveLang;
		logService.log("ui", "No specific voice found, using system default", { lang: utterance.lang });
	}

	utterance.rate = 0.9;
	
	// Debug log
	logService.log("ui", "Speaking", { 
		text: text.substring(0, 20) + "...", 
		lang: utterance.lang,
		voice: selectedVoice ? selectedVoice.name : "System Default" 
	});

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

// Pre-load on import if possible
if (browser) {
	// Don't await, just trigger
	ensureVoicesLoaded().catch(e => console.warn("Init voice failed", e));
}
