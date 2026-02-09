/**
 * Speech Service — озвучування слів через Web Speech API
 * Final stable version for iOS/Android/Desktop
 */

import { browser } from "$app/environment";
import { settingsStore } from "../stores/settingsStore.svelte";
import { logService } from "./logService";

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
	} catch (e) {}

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
		}
	};

	// 4. Відтворюємо
	try {
		if (ss.paused) ss.resume();
		ss.speak(currentUtterance);
	} catch (err) {
		logService.error("ui", "Speak crash", err);
	}
}

export function stopSpeech(): void {
	if (browser && window.speechSynthesis) window.speechSynthesis.cancel();
}

if (browser) preloadVoices();
