<script lang="ts">
	/**
	 * VoiceSelectionModal.svelte
	 * Modal for selecting a specific system voice for pronunciation.
	 * Now uses BaseModal for consistent modern design.
	 */
	import { _ } from "svelte-i18n";
	import { Check } from "lucide-svelte";
	import { settingsStore } from "$lib/stores/settingsStore.svelte";
	import { logService } from "$lib/services/logService";
	import type { Language } from "$lib/types";
	import { findBestVoice } from "$lib/services/speechService";
	import { tick, onMount } from "svelte";
	import BaseModal from "../ui/BaseModal.svelte";

	interface Props {
		onclose: () => void;
		language: Language;
	}
	let { onclose, language }: Props = $props();

	onMount(() => {
		logService.log("settings", "VoiceSelectionModal mounted", { language });
	});

	let voices: SpeechSynthesisVoice[] = $state([]);
	// Initialize with stored preference
	let selectedVoiceURI = $state("");

	// 1. Initial sync from store (run once on mount or simple effect)
	$effect(() => {
		const pref = (settingsStore.value.voicePreferences as Record<string, string>)[language];
		if (pref && !selectedVoiceURI) {
			selectedVoiceURI = pref;
		}
	});

	let primaryVoices: SpeechSynthesisVoice[] = $state([]);
	let secondaryVoices: SpeechSynthesisVoice[] = $state([]);

	let voiceListElement = $state<HTMLElement | null>(null);

	async function scrollToSelected() {
		await tick();
		if (voiceListElement) {
			const selected = voiceListElement.querySelector(".voice-item.selected");
			if (selected) {
				logService.log("settings", "Scrolling to selected voice");
				selected.scrollIntoView({ block: "center", behavior: "smooth" });
			}
		}
	}

	// Greeting text map for preview
	const PREVIEW_TEXTS: Record<string, string> = {
		uk: "Привіт, як справи?",
		en: "Hello, how are you?",
		nl: "Hallo, hoe gaat het?",
		de: "Hallo, wie geht's?",
		crh: "Selâm, alesıñız nasıl?", // Using generic greeting
		tr: "Merhaba, nasılsın?", // Fallback for Turkish voices
	};

	const PREFERRED_REGIONS: Record<string, string> = {
		nl: "NL",
		de: "DE",
		en: "GB",
		uk: "UA",
		tr: "TR",
	};

	function getPreviewText(lang: string, voiceLang: string): string {
		if (voiceLang.startsWith("tr")) return PREVIEW_TEXTS.tr;
		return PREVIEW_TEXTS[lang] || "Hello";
	}

	function processVoices() {
		logService.log("settings", "Processing voices...");
		if (typeof window === 'undefined' || !window.speechSynthesis) return;

		const allVoices = window.speechSynthesis.getVoices();
		if (!allVoices || allVoices.length === 0) return;
		
		voices = allVoices;

		// Select best voice if none selected
		if (!selectedVoiceURI && language) {
			const best = findBestVoice(allVoices, language);
			if (best) {
				selectedVoiceURI = best.voiceURI;
			}
		}

		// Filter Logic
		let targetLangPrefix: string = language || "en";
		if (language === "crh") targetLangPrefix = "tr"; 

		const region = PREFERRED_REGIONS[targetLangPrefix];

		primaryVoices = allVoices
			.filter((v) => v && v.lang && v.lang.startsWith(targetLangPrefix))
			.sort((a, b) => {
				if (region) {
					const aPref = a.lang.includes(`-${region}`);
					const bPref = b.lang.includes(`-${region}`);
					if (aPref && !bPref) return -1;
					if (!aPref && bPref) return 1;
				}
				return a.name.localeCompare(b.name);
			});

		const secondaryRegion = PREFERRED_REGIONS["en"];
		secondaryVoices = allVoices
			.filter((v) => v && v.lang && !v.lang.startsWith(targetLangPrefix) && v.lang.startsWith("en"))
			.sort((a, b) => {
				if (secondaryRegion) {
					const aPref = a.lang.includes(`-${secondaryRegion}`);
					const bPref = b.lang.includes(`-${secondaryRegion}`);
					if (aPref && !bPref) return -1;
					if (!aPref && bPref) return 1;
				}
				return a.name.localeCompare(b.name);
			});
			
		logService.log("settings", "Voices processed", { primary: primaryVoices.length, secondary: secondaryVoices.length });
		scrollToSelected();
	}

	onMount(() => {
		logService.log("settings", "VoiceSelectionModal mounted", { language });
		
		// Initial load
		processVoices();
		
		// Setup listener
		if (typeof window !== 'undefined' && window.speechSynthesis) {
			window.speechSynthesis.addEventListener('voiceschanged', processVoices);
		}

		return () => {
			if (typeof window !== 'undefined' && window.speechSynthesis) {
				window.speechSynthesis.removeEventListener('voiceschanged', processVoices);
			}
		};
	});

	function handleVoiceSelect(voice: SpeechSynthesisVoice) {
		selectedVoiceURI = voice.voiceURI;

		// Preview
		const text = getPreviewText(language, voice.lang);
		const utterance = new SpeechSynthesisUtterance(text);
		utterance.voice = voice;
		utterance.rate = 0.9;
		window.speechSynthesis.cancel();
		window.speechSynthesis.speak(utterance);
	}

	function handleConfirm() {
		if (selectedVoiceURI) {
			settingsStore.setVoicePreference(language, selectedVoiceURI);
		}
		onclose();
	}
</script>

<BaseModal {onclose} testid="voice-selection-modal" maxWidth="420px">
	<div class="modal-inner">
		<div class="header-content">
			<h3>{$_("settings.pronunciation")}</h3>
		</div>

		<div class="voice-list" bind:this={voiceListElement}>
			{#if voices.length === 0}
				<div class="empty-state">No voices found</div>
			{:else}
				<!-- Primary Voices -->
				{#if primaryVoices.length > 0}
					<div class="group-label">
						{$_(`language.${language}`) || language}
						{$_("language.voices")}
					</div>
					{#each primaryVoices as voice (voice.voiceURI)}
						<button
							class="voice-item"
							class:selected={selectedVoiceURI === voice.voiceURI}
							onclick={() => handleVoiceSelect(voice)}
						>
							<div class="voice-info">
								<span class="voice-name">{voice.name}</span>
								<span class="lang-tag">{voice.lang}</span>
							</div>
							{#if selectedVoiceURI === voice.voiceURI}
								<div class="check-icon">
									<Check size={18} />
								</div>
							{/if}
						</button>
					{/each}
				{/if}

				{#if primaryVoices.length > 0 && secondaryVoices.length > 0}
					<div class="separator"></div>
				{/if}

				<!-- Secondary Voices (English) -->
				{#if secondaryVoices.length > 0}
					<div class="group-label">
						{$_("language.en")}
						{$_("language.voices")}
					</div>
					{#each secondaryVoices as voice (voice.voiceURI)}
						<button
							class="voice-item"
							class:selected={selectedVoiceURI === voice.voiceURI}
							onclick={() => handleVoiceSelect(voice)}
						>
							<div class="voice-info">
								<span class="voice-name">{voice.name}</span>
								<span class="lang-tag">{voice.lang}</span>
							</div>
							{#if selectedVoiceURI === voice.voiceURI}
								<div class="check-icon">
									<Check size={18} />
								</div>
							{/if}
						</button>
					{/each}
				{/if}
			{/if}
		</div>

		<div class="footer">
			<button
				class="confirm-btn primary-action-btn"
				onclick={handleConfirm}
				data-testid="confirm-voice-btn"
			>
				{$_("common.confirm") || "Confirm"}
			</button>
		</div>
	</div>
</BaseModal>

<style>
	.modal-inner {
		display: flex;
		flex-direction: column;
		width: 100%;
	}

	.header-content {
		text-align: center;
		margin-bottom: 1.5rem;
	}

	h3 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.voice-list {
		overflow-y: auto;
		padding: 0.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		flex: 1;
		max-height: 50vh;
		scrollbar-width: thin;
		scrollbar-color: var(--border) transparent;
		margin-bottom: 1rem;
	}

	.group-label {
		font-size: 0.75rem;
		color: var(--text-secondary);
		padding: 0.75rem 0.5rem 0.25rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-weight: 700;
		opacity: 0.8;
	}

	.voice-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		padding: 0.85rem 1rem;
		background: transparent;
		border: 1px solid transparent;
		border-radius: 14px;
		color: var(--text-primary);
		text-align: left;
		cursor: pointer;
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.voice-item:hover {
		background: var(--bg-secondary);
	}

	.voice-item.selected {
		background: var(--selected-bg);
		border-color: var(--selected-border);
	}

	.voice-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding-right: 0.5rem;
	}

	.voice-name {
		font-size: 0.95rem;
		font-weight: 600;
		line-height: 1.3;
	}

	.lang-tag {
		font-size: 0.75rem;
		color: var(--text-secondary);
	}

	.check-icon {
		color: var(--accent);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.separator {
		height: 1px;
		background: var(--border);
		margin: 0.75rem 0;
		opacity: 0.5;
	}

	.empty-state {
		text-align: center;
		padding: 2rem;
		color: var(--text-secondary);
	}

	.footer {
		padding-top: 1rem;
		border-top: 1px solid var(--border);
	}

	.confirm-btn {
		width: 100%;
	}
</style>