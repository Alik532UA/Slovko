<script lang="ts">
	import { onMount } from "svelte";
	import { fade, fly } from "svelte/transition";
	import { waitLocale, _ } from "svelte-i18n";
	import { settingsStore } from "$lib/stores/settingsStore.svelte";
	import { setInterfaceLanguage, LANGUAGES } from "$lib/i18n/init";
	import { LANGUAGE_NAMES, type Language } from "$lib/types";
	import { base } from "$app/paths";
	import { Languages, Speech, Captions } from "lucide-svelte";

	let step = $state(1);
	let detectedLang = $state("en");
	let isVisible = $state(true);
	let isFinalizing = $state(false);
	let showExplanation = $state(false);
	let isFlyingTriggered = $state(false);
	let selectedFlags = $state<Language[]>([]);

	// Координати для анімації
	let flyingFlags = $state<
		{
			lang: Language;
			x: number;
			y: number;
			tx: number;
			ty: number;
			delay: number;
		}[]
	>([]);

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
		selectedFlags.push(lang);
		step = 2;
	}

	async function selectStep2(lang: Language) {
		if (lang === settingsStore.value.targetLanguage) {
			settingsStore.update({ sourceLanguage: "en" });
		} else {
			settingsStore.update({ sourceLanguage: lang });
		}
		selectedFlags.push(lang);
		
		await waitLocale();

		// ПІДГОТОВКА ПРАПОРІВ ЗАЗДАЛЕГІДЬ
		const settingsBtn = document.querySelector('[data-testid="language-settings-btn"]');
		const targetRect = settingsBtn?.getBoundingClientRect();
		const tx = targetRect ? targetRect.left + targetRect.width / 2 : window.innerWidth * 0.9;
		const ty = targetRect ? targetRect.top + targetRect.height / 2 : 40;

		const newFlyingFlags: any[] = [];
		const centerX = window.innerWidth / 2;
		const centerY = window.innerHeight / 2;

		LANGUAGES.forEach((l, index) => {
			newFlyingFlags.push({
				lang: l,
				x: centerX + (Math.random() - 0.5) * window.innerWidth * 0.9,
				y: centerY + (Math.random() - 0.5) * window.innerHeight * 0.8,
				tx,
				ty,
				delay: index * 0.08,
			});
		});
		flyingFlags = newFlyingFlags;
		
		showExplanation = true;
		isFinalizing = true;
	}

	async function startAnimations() {
		setTimeout(() => {
			const btn = document.querySelector('[data-testid="language-settings-btn"]');
			if (btn) {
				btn.classList.add("settings-btn-blink");
				setTimeout(() => btn.classList.remove("settings-btn-blink"), 2000);
			}
		}, 1500);

		setTimeout(() => {
			finishOnboarding();
		}, 3000);
	}

	function handleFinish() {
		showExplanation = false;
		isFlyingTriggered = true;
		startAnimations();
	}

	function finishOnboarding() {
		isVisible = false;
		settingsStore.completeOnboarding();
		window.dispatchEvent(new Event("resize"));
	}

	const detectedTitle = $derived(
		detectedLang !== "en" ? titles[detectedLang] : null,
	);

	const transitionParams = {
		in: { y: 30, duration: 400, delay: 300 },
		out: { y: -30, duration: 300 }
	};
</script>

{#if isVisible}
	<div
		class="onboarding-overlay"
		class:transparent={isFinalizing && !showExplanation}
		transition:fade
		data-testid="onboarding-modal"
	>
		<!-- Прапори на фоні -->
		{#if isFinalizing}
			<div class="flying-container" class:is-running={isFlyingTriggered}>
				{#each flyingFlags as flag (flag.lang)}
					<div
						class="flying-flag"
						style:--start-x="{flag.x}px"
						style:--start-y="{flag.y}px"
						style:--target-x="{flag.tx}px"
						style:--target-y="{flag.ty}px"
						style:--delay="{flag.delay}s"
					>
						<img src="{base}/flags/{flag.lang}.svg" alt="" />
					</div>
				{/each}
			</div>
		{/if}

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
													<div class="secondary" data-testid="onboarding-detected-title">{detectedTitle}</div>
												{/if}
												<div class="primary" data-testid="onboarding-primary-title">{titles.en}</div>
											</div>
										{:else}
											<span data-testid="onboarding-step2-title">{$_("onboarding.whatToLearn")}</span>
										{/if}
									</h1>
								</div>
							{/key}
						{/if}
					</div>

					<div class="flags-grid" class:hidden={flyingFlags.length > 0} data-testid="onboarding-flags-grid">
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
				<div 
					class="step-container"
					in:fly={transitionParams.in}
					out:fly={transitionParams.out}
				>
					<div class="explanation-card" data-testid="onboarding-explanation-card">
						<div class="icon-header">
							<div class="icon-circle">
								<Languages size={32} />
							</div>
						</div>

						<div class="explanation-text" data-testid="onboarding-explanation-text">
							<p>
								{$_("onboarding.explanation")}
								<span class="inline-icon"><Languages size={18} /></span>
							</p>
							<p class="detail" data-testid="onboarding-explanation-detail">
								{$_("onboarding.explanationPart1")}
								<span class="inline-icon"><Speech size={16} /></span>,
								{$_("onboarding.explanationPart2")}
								<span class="inline-icon"><Captions size={16} /></span>
								{$_("onboarding.explanationPart3")}
							</p>
						</div>

						<button
							class="start-btn"
							onclick={handleFinish}
							data-testid="onboarding-finish-btn"
						>
							<span>{$_("onboarding.startBtn")}</span>
						</button>
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.onboarding-overlay {
		position: fixed;
		inset: 0;
		z-index: 20000;
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

	.onboarding-overlay.transparent {
		background: rgba(0, 0, 0, 0);
		backdrop-filter: blur(0px);
		pointer-events: none;
	}

	.onboarding-overlay.transparent .step-wrapper {
		display: none;
	}

	.explanation-card {
		background: rgba(255, 255, 255, 0.05);
		backdrop-filter: blur(25px);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 32px;
		padding: 2.5rem 2rem;
		max-width: 450px;
		width: 100%;
		text-align: center;
		pointer-events: auto;
		box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.inline-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 255, 255, 0.1);
		padding: 4px;
		border-radius: 6px;
		margin: 0 2px;
		vertical-align: middle;
		color: var(--accent);
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

	.explanation-text {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.explanation-text p {
		font-size: 1.15rem;
		color: white;
		line-height: 1.4;
		margin: 0;
		font-weight: 500;
	}

	.explanation-text .detail {
		font-size: 0.95rem;
		opacity: 0.7;
		font-weight: 400;
	}

	.start-btn {
		background: white;
		color: black;
		border: none;
		border-radius: 16px;
		padding: 1rem;
		font-size: 1.1rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.2s;
		margin-top: 0.5rem;
	}

	.start-btn:hover {
		transform: scale(1.02);
		background: #f0f0f0;
	}

	.start-btn:active {
		transform: scale(0.98);
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

	.flags-grid.hidden {
		opacity: 0;
		pointer-events: none;
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

	.flying-container {
		position: fixed;
		inset: 0;
		pointer-events: none;
		z-index: 10;
	}

	.flying-flag {
		position: fixed;
		top: 0;
		left: 0;
		width: 80px;
		height: 54px;
		pointer-events: none;
		transform: translate(var(--start-x), var(--start-y)) translate(-50%, -50%);
		opacity: 0;
		/* Анімація появи на 3 секунди */
		animation: flag-materialize 3s forwards ease-out;
	}

	.flying-flag img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		border-radius: 10px;
		box-shadow: 0 8px 25px rgba(0, 0, 0, 0.5);
	}

	/* Перехід до польоту */
	.is-running .flying-flag {
		opacity: 1;
		animation: fly-to-settings 2s forwards cubic-bezier(0.4, 0, 0.2, 1);
		animation-delay: var(--delay);
	}

	@keyframes flag-materialize {
		from { opacity: 0; }
		to { opacity: 0.15; }
	}

	@keyframes fly-to-settings {
		0% {
			transform: translate(var(--start-x), var(--start-y)) translate(-50%, -50%) scale(1);
			opacity: 0.15;
		}
		15% {
			opacity: 1;
			transform: translate(var(--start-x), var(--start-y)) translate(-50%, -50%) scale(1.1);
		}
		100% {
			transform: translate(var(--target-x), var(--target-y)) translate(-50%, -50%) scale(0.1);
			opacity: 0;
		}
	}

	:global(.settings-btn-blink) {
		animation: settings-blink-pulse 1.5s ease-in-out;
	}

	@keyframes settings-blink-pulse {
		0% {
			box-shadow: 0 0 0 0 rgba(58, 143, 214, 0);
			transform: scale(1);
		}
		50% {
			box-shadow: 0 0 15px 2px rgba(58, 143, 214, 0.4);
			transform: scale(1.1);
		}
		100% {
			box-shadow: 0 0 0 0 rgba(58, 143, 214, 0);
			transform: scale(1);
		}
	}
</style>
