<script lang="ts">
	import { onMount } from "svelte";
	import { fade, fly } from "svelte/transition";
	import { waitLocale, _ } from "svelte-i18n";
	import { settingsStore } from "$lib/stores/settingsStore.svelte";
	import { setInterfaceLanguage, LANGUAGES } from "$lib/i18n/init";
	import { LANGUAGE_NAMES, type Language } from "$lib/types";
	import { base } from "$app/paths";
	import { Languages, Speech, Captions, Download, UserCheck, Heart, GraduationCap, Lightbulb } from "lucide-svelte";
	import BaseModal from "$lib/components/ui/BaseModal.svelte";
	import { pwaStore } from "$lib/stores/pwaStore.svelte";
	import InstallGuide from "../pwa/InstallGuide.svelte";
	import { gameController } from "$lib/services/gameController";

	let step = $state(1);
	let hintStep = $state(1);
	let detectedLang = $state("en");
	let isVisible = $state(true);
	let isFinalizing = $state(false);
	let showExplanation = $state(false);
	let showInstallGuide = $state(false);

	// Визначаємо список активних кроків залежно від стану PWA
	const activeSteps = $derived.by(() => {
		const steps = [1, 2, 3, 4, 5];
		if (pwaStore.isInstalled) {
			return steps.filter(s => s !== 4);
		}
		return steps;
	});

	// Поточний ID поради (1, 2, 3, 4 або 5)
	const currentTipId = $derived(activeSteps[hintStep - 1]);

	const titles: Record<string, string> = {
		uk: "Твоя мова",
		en: "Your language",
		de: "Deine Sprache",
		nl: "Jouw taal",
		el: "Η γλώσσα σου",
		crh: "Seniñ tiliñ",
	};

	onMount(() => {
		const browserLangs = navigator.languages || [navigator.language];
		for (const lang of browserLangs) {
			const shortLang = lang.split("-")[0];
			if (LANGUAGES.includes(shortLang as Language)) {
				detectedLang = shortLang;
				break;
			}
		}
	});

	async function selectStep1(lang: Language) {
		settingsStore.update({
			interfaceLanguage: lang,
			targetLanguage: lang,
		});
		setInterfaceLanguage(lang);
		await waitLocale(lang);
		step = 2;
	}

	async function selectStep2(lang: Language) {
		if (lang === settingsStore.value.targetLanguage) {
			settingsStore.update({ sourceLanguage: "en" });
		} else {
			settingsStore.update({ sourceLanguage: lang });
		}

		await waitLocale();
		showExplanation = true;
		isFinalizing = true;
	}

	function handleNextHint() {
		if (hintStep < activeSteps.length) {
			hintStep++;
		} else {
			finishOnboarding();
		}
	}

	function handlePrevHint() {
		if (hintStep > 1) {
			hintStep--;
		}
	}

	function finishOnboarding() {
		isVisible = false;
		settingsStore.completeOnboarding();
		window.dispatchEvent(new Event("resize"));

		// Запуск циклу підказок, поки користувач не почне взаємодіяти
		gameController.startTutorialMode();
	}

	const detectedTitle = $derived(
		detectedLang !== "en" ? titles[detectedLang] : null,
	);

	const transitionParams = {
		in: { y: 30, duration: 400, delay: 300 },
		out: { y: -30, duration: 300 },
	};
</script>

{#if isVisible}
	<div
		class="onboarding-overlay"
		class:transparent={isFinalizing && !showExplanation}
		transition:fade
		data-testid="onboarding-modal"
	>
		<div class="step-wrapper">
			{#if !showExplanation}
				<div
					class="step-container"
					in:fly={transitionParams.in}
					out:fly={transitionParams.out}
					data-testid="onboarding-container"
				>
					<div class="header-area" data-testid="onboarding-header">
						{#if !isFinalizing}
							{#key step}
								<div
									class="title-wrapper"
									in:fly={transitionParams.in}
									out:fly={transitionParams.out}
								>
									<h1 data-testid="onboarding-title">
										{#if step === 1}
											<div class="title-stack">
												{#if detectedTitle}
													<div
														class="secondary"
														data-testid="onboarding-detected-title"
													>
														{detectedTitle}
													</div>
												{/if}
												<div
													class="primary"
													data-testid="onboarding-primary-title"
												>
													{titles.en}
												</div>
											</div>
										{:else}
											<span data-testid="onboarding-step2-title"
												>{$_("onboarding.whatToLearn")}</span
											>
										{/if}
									</h1>
								</div>
							{/key}
						{/if}
					</div>

					<div
						class="flags-grid"
						data-testid="onboarding-flags-grid"
					>
						{#each LANGUAGES as lang (lang)}
							<button
								class="flag-btn"
								class:selected-step1={step === 2 &&
									lang === settingsStore.value.targetLanguage}
								data-lang={lang}
								onclick={() =>
									!isFinalizing &&
									(step === 1 ? selectStep1(lang) : selectStep2(lang))}
								disabled={isFinalizing ||
									(step === 2 && lang === settingsStore.value.targetLanguage)}
								data-testid="onboarding-flag-{lang}"
							>
								<img src="{base}/flags/{lang}.svg" alt={LANGUAGE_NAMES[lang]} />
								<span>{LANGUAGE_NAMES[lang]}</span>
							</button>
						{/each}
					</div>
				</div>
			{:else}
				<BaseModal
					onclose={finishOnboarding}
					testid="onboarding-hints-modal"
					showCloseButton={false}
				>
					<div
						class="explanation-card-inner"
						data-testid="onboarding-explanation-card"
					>
						<div class="progress-bar" data-testid="onboarding-progress-bar">
							{#each activeSteps as _, i}
								<button
									class="progress-segment"
									class:active={hintStep === i + 1}
									class:completed={hintStep > i + 1}
									onclick={() => hintStep = i + 1}
									aria-label="Step {i + 1}"
									data-testid="onboarding-progress-step-{i + 1}"
								></button>
							{/each}
						</div>

						<div class="icon-header">
							<div class="icon-circle">
								{#if currentTipId === 1}
									<Languages size={32} />
								{:else if currentTipId === 2}
									<GraduationCap size={32} />
								{:else if currentTipId === 3}
									<UserCheck size={32} />
								{:else if currentTipId === 4}
									<Download size={32} />
								{:else}
									<Heart size={32} />
								{/if}
							</div>
						</div>

						<div
							class="explanation-text"
							data-testid="onboarding-explanation-text"
						>
							{#if currentTipId === 1}
								<p>
									{$_("onboarding.step1_part1")}
									<span class="inline-icon" data-testid="onboarding-icon-languages"><Languages size={18} /></span>.
									{$_("onboarding.step1_part2")}
									<span class="inline-icon" data-testid="onboarding-icon-speech"><Speech size={18} /></span>
									{$_("onboarding.step1_part3")}
									<span class="inline-icon" data-testid="onboarding-icon-captions"><Captions size={18} /></span>
									{$_("onboarding.step1_part4")}
								</p>
							{:else if currentTipId === 2}
								<p>
									{$_("onboarding.step2_part1")}
									<span class="inline-icon" data-testid="onboarding-icon-gradcap"><GraduationCap size={18} /></span>
									{$_("onboarding.step2_part2")}
									<span class="inline-icon" data-testid="onboarding-icon-lightbulb"><Lightbulb size={18} /></span>
									{$_("onboarding.step2_part3")}
								</p>
							{:else if currentTipId === 3}
								<p>{$_("onboarding.step3")}</p>
							{:else if currentTipId === 4}
								<div class="step-content-wrapper">
									<p>{$_("onboarding.step4")}</p>
									<button 
										class="action-btn-secondary" 
										data-testid="onboarding-install-btn"
										onclick={async () => {
											const result = await pwaStore.install();
											if (result === "ios" || result === "manual") {
												showInstallGuide = true;
											}
										}}
									>
										<Download size={18} />
										<span>
											{#if pwaStore.isIOS || pwaStore.isAndroid}
												{$_("pwa.install")}
											{:else}
												{$_("pwa.install_desktop")}
											{/if}
										</span>
									</button>
								</div>
							{:else}
								<div class="step-content-wrapper">
									<p>{$_("onboarding.step5")}</p>
									<a 
										href="https://send.monobank.ua/jar/7sCsydhJnR"
										target="_blank"
										rel="noopener noreferrer"
										class="action-btn-accent" 
										data-testid="onboarding-donate-link"
										onclick={finishOnboarding}
									>
										<Heart size={18} />
										<span>{$_("about.support")}</span>
									</a>
								</div>
							{/if}
						</div>

						<div class="modal-actions-wrapper">
							<div class="nav-buttons">
								{#if hintStep > 1}
									<button
										class="nav-btn prev"
										onclick={handlePrevHint}
										data-testid="onboarding-prev-btn"
									>
										<span>{$_("onboarding.prevHint")}</span>
									</button>
								{/if}
								
								{#if hintStep < activeSteps.length}
									<button
										class="nav-btn next"
										onclick={handleNextHint}
										data-testid="onboarding-next-btn"
									>
										<span>{$_("onboarding.nextHint")}</span>
									</button>
								{/if}
							</div>

							<button
								class="skip-all-btn"
								onclick={finishOnboarding}
								data-testid={hintStep === activeSteps.length ? "onboarding-next-btn" : "onboarding-skip-btn"}
							>
								{$_("onboarding.startBtn")}
							</button>
						</div>
					</div>
				</BaseModal>
			{/if}
		</div>
	</div>
{/if}

{#if showInstallGuide}
	<InstallGuide onclose={() => (showInstallGuide = false)} />
{/if}

<style>
	.onboarding-overlay {
		position: fixed;
		inset: 0;
		z-index: 10000;
		background: rgba(0, 0, 0, 0.92);
		backdrop-filter: blur(15px);
		display: grid;
		place-items: center;
		padding: 2rem 1rem;
		overflow: hidden;
		transition:
			background 0.8s ease,
			backdrop-filter 0.8s ease;
		scrollbar-width: none;
	}

	.step-wrapper {
		position: relative;
		width: 100%;
		max-width: 600px;
		display: grid;
		place-items: center;
		z-index: 20002;
	}

	.step-container {
		grid-area: 1 / 1 / 2 / 1;
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.explanation-card-inner {
		text-align: center;
		display: flex;
		flex-direction: column;
		gap: 2rem;
		padding: 1rem 0;
	}

	.progress-bar {
		display: flex;
		gap: 6px;
		width: 100%;
		margin-bottom: 0.5rem;
	}

	.progress-segment {
		flex: 1;
		height: 6px;
		border-radius: 10px;
		background: rgba(255, 255, 255, 0.15);
		border: none;
		cursor: pointer;
		transition: all 0.3s ease;
		padding: 0;
	}

	.progress-segment:hover {
		background: rgba(255, 255, 255, 0.3);
	}

	.progress-segment.active {
		background: var(--accent);
		box-shadow: 0 0 10px rgba(var(--accent-rgb, 58, 143, 214), 0.5);
	}

	.progress-segment.completed {
		background: var(--accent);
		opacity: 0.5;
	}

	.icon-header {
		display: flex;
		justify-content: center;
	}

	.icon-circle {
		width: 64px;
		height: 64px;
		background: var(--accent);
		border-radius: 20px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		box-shadow: 0 8px 20px rgba(var(--accent-rgb, 58, 143, 214), 0.3);
	}

	.explanation-text p {
		font-size: 1.2rem;
		color: white;
		line-height: 1.5;
		margin: 0;
		font-weight: 500;
	}

	.step-content-wrapper {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		align-items: center;
	}

	.action-btn-secondary, .action-btn-accent {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.8rem;
		padding: 0.8rem 1.5rem;
		border-radius: 14px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		border: 1px solid rgba(255, 255, 255, 0.1);
		text-decoration: none;
	}

	.action-btn-secondary {
		background: rgba(255, 255, 255, 0.1);
		color: white;
	}

	.action-btn-accent {
		background: var(--accent);
		color: white;
		border-color: rgba(255, 255, 255, 0.2);
	}

	.action-btn-secondary:hover, .action-btn-accent:hover {
		transform: translateY(-2px);
		filter: brightness(1.1);
	}

	.modal-actions-wrapper {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		width: 100%;
		margin-top: 1rem;
	}

	.nav-buttons {
		display: flex;
		gap: 0.75rem;
		width: 100%;
		container-type: inline-size;
	}

	.nav-btn {
		flex: 1;
		padding: 1.1rem 0.2rem;
		font-size: clamp(0.5rem, 3.6cqw, 1rem);
		font-weight: 700;
		border-radius: 16px;
		cursor: pointer;
		transition: all 0.2s;
		border: none;
		white-space: nowrap;
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 0;
		letter-spacing: -0.02em;
	}

	.nav-btn span {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 100%;
	}

	.nav-btn.next {
		background: white;
		color: black;
	}

	.nav-btn.prev {
		background: rgba(255, 255, 255, 0.1);
		color: white;
		border: 1px solid rgba(255, 255, 255, 0.15);
	}

	.skip-all-btn {
		background: #27ae60;
		color: white;
		border: 1px solid rgba(255, 255, 255, 0.2);
		padding: 1.1rem;
		border-radius: 18px;
		font-size: 1.1rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.2s;
		box-shadow: 0 4px 15px rgba(39, 174, 96, 0.3);
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.skip-all-btn:hover {
		background: #2ecc71;
		transform: translateY(-2px);
		box-shadow: 0 6px 20px rgba(39, 174, 96, 0.4);
		border-color: rgba(255, 255, 255, 0.3);
	}

	.skip-all-btn:active {
		transform: translateY(0);
	}

	.nav-btn:hover { transform: translateY(-2px); }
	.nav-btn:active { transform: translateY(0); }

	@media (max-width: 360px) {
		.nav-btn {
			font-size: 0.85rem;
		}
	}

	.inline-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 255, 255, 0.1);
		padding: 4px;
		border-radius: 6px;
		margin: 0 4px;
		vertical-align: middle;
		color: var(--accent);
	}

	.header-area {
		height: 120px;
		position: relative;
		width: 100%;
		margin-bottom: 2rem;
		display: grid;
		place-items: center;
	}

	.title-wrapper {
		grid-area: 1 / 1 / 2 / 1;
		width: 100%;
	}

	h1 {
		font-size: 2.2rem;
		margin: 0;
		color: white;
		font-weight: 700;
		line-height: 1.1;
		text-align: center;
	}

	.title-stack {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}

	.secondary {
		font-size: 1.6rem;
		opacity: 0.8;
		font-weight: 500;
	}

	.primary {
		font-size: 2.2rem;
	}

	.flags-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1.5rem;
	}

	@media (max-width: 480px) {
		.flags-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	.flag-btn {
		background: rgba(255, 255, 255, 0.05);
		border: 2px solid rgba(255, 255, 255, 0.1);
		border-radius: 20px;
		padding: 1.5rem 1rem;
		cursor: pointer;
		transition: all 0.3s ease;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.8rem;
		color: white;
	}

	.flag-btn:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.15);
		transform: translateY(-5px);
		border-color: var(--accent);
	}

	.flag-btn:disabled:not(.selected-step1) {
		opacity: 1;
		cursor: default;
	}

	.flag-btn:disabled {
		cursor: default;
	}

	.flag-btn.selected-step1 {
		opacity: 0.4 !important;
		border-color: rgba(255, 255, 255, 0.1);
		background: transparent;
		cursor: default;
		transform: none !important;
	}

	.flag-btn.selected-step1 img {
		filter: grayscale(0.2);
	}

	.flag-btn img {
		width: 80px;
		height: 54px;
		object-fit: cover;
		border-radius: 10px;
	}

	.flag-btn span {
		font-size: 1rem;
	}
</style>
