<script lang="ts">
	/**
	 * Сторінка чеклиста бета-тестування (BETA-CHECKLIST-v8).
	 *
	 * Довга адреса замість короткої `/beta-test/` — про однозначність, а не про
	 * таємницю: `/beta-test/` читається як пісочниця, де тестують якусь
	 * бета-механіку. Ця не читається ніяк інакше.
	 */
	import { onMount } from "svelte";
	import { resolve } from "$app/paths";

	import { BETA_TABS } from "$lib/data/beta/checks";
	import type { Coverage } from "$lib/data/beta/types";
	import { APP_STATES } from "$lib/config/appStates";
	import { betaChecklistStore, groupByCoverage } from "$lib/controllers/BetaChecklistStore.svelte";
	import { versionStore } from "$lib/controllers/VersionStore.svelte";
	import BetaCheckItem from "$lib/components/beta/BetaCheckItem.svelte";
	import BetaReport from "$lib/components/beta/BetaReport.svelte";

	let activeTabId = $state(BETA_TABS[0].id);
	let lang = $state<"uk" | "en">("uk");

	onMount(() => betaChecklistStore.load());

	const activeTab = $derived(BETA_TABS.find((t) => t.id === activeTabId) ?? BETA_TABS[0]);
	const groups = $derived(groupByCoverage(activeTab.checks));
	/**
	 * Екрани, які заявляє вкладка, — посиланнями. Той самий перелік читає
	 * e2e-перевірка й інваріант § 5.1, тож він не може розійтися з дійсністю
	 * непоміченим: список, який читають лише перевірки, поповнити забувають.
	 */
	const tabStates = $derived(APP_STATES.filter((s) => activeTab.states.includes(s.id)));

	const LEVEL_TITLE: Record<Coverage, { uk: string; en: string }> = {
		manual: { uk: "Тільки людина", en: "Human only" },
		testable: { uk: "Можна покрити тестом", en: "Could be tested" },
		covered: { uk: "Покрито тестом", en: "Covered by a test" },
	};

	const LEVEL_HINT: Record<Coverage, { uk: string; en: string }> = {
		manual: {
			uk: "Машина цього не побачить. Починайте звідси.",
			en: "A machine cannot see this. Start here.",
		},
		testable: {
			uk: "Тесту поки немає — це перелік того, який варто написати.",
			en: "No test yet — this is the backlog of tests worth writing.",
		},
		covered: {
			uk: "Тест це вже перевіряє. Помилка тут — дефект ТЕСТА, і це важливіше за звичайний баг.",
			en: "A test already checks this. A failure here is a defect in the TEST, which matters more than a plain bug.",
		},
	};
</script>

<svelte:head>
	<title>Чеклист бета-тестування — Slovko</title>
</svelte:head>

<div class="beta" data-testid="beta-page-container">
	<header class="beta__head">
		<h1 data-testid="beta-title">
			{lang === "uk" ? "Чеклист бета-тестування" : "Beta testing checklist"}
		</h1>
		<p class="beta__meta" data-testid="beta-version-text">
			{lang === "uk" ? "Збірка" : "Build"}
			{versionStore.currentVersion}
		</p>
		<p class="beta__meta" data-testid="beta-progress-value">
			{betaChecklistStore.doneOnThisVersion} / {betaChecklistStore.total}
			{lang === "uk" ? "позначено на цій збірці" : "marked on this build"}
		</p>
		<button
			class="beta__lang"
			data-testid="beta-lang-btn"
			onclick={() => (lang = lang === "uk" ? "en" : "uk")}
		>
			{lang === "uk" ? "English" : "Українська"}
		</button>
	</header>

	<nav class="beta__tabs" data-testid="beta-tabs">
		{#each BETA_TABS as tab (tab.id)}
			<button
				class="beta__tab"
				class:is-active={tab.id === activeTabId}
				aria-current={tab.id === activeTabId ? "true" : undefined}
				data-testid="beta-tab-{tab.id}-btn"
				onclick={() => (activeTabId = tab.id)}
			>
				{tab.title[lang]}
			</button>
		{/each}
	</nav>

	<p class="beta__screens">
		<span>{lang === "uk" ? "Екрани вкладки:" : "Screens on this tab:"}</span>
		{#each tabStates as state (state.id)}
				<!--
				`resolve('/')` замість склеювання з `base`: правило
				`no-navigation-without-resolve` тут доречне, на відміну від
				дванадцяти відомих попереджень у грі (там передають готовий URL
				або самі параметри). Тут це справжнє посилання на маршрут.
			-->
			<a
				class="beta__screen-link"
				href="{resolve('/')}{state.path}"
				data-testid="beta-screen-{state.id}-link"
			>
				{state.label[lang]}
			</a>
		{/each}
	</p>

	{#each groups as group (group.coverage)}
		<section class="beta__level" data-testid="beta-level-{group.coverage}-section">
			<h2>{LEVEL_TITLE[group.coverage][lang]}</h2>
			<p class="beta__level-hint">{LEVEL_HINT[group.coverage][lang]}</p>

			<ol class="beta__list">
				{#each group.checks as check, index (check.id)}
					<BetaCheckItem {check} number={index + 1} {lang} />
				{/each}
			</ol>
		</section>
	{/each}

	<BetaReport {lang} />
</div>

<style>
	.beta {
		max-width: 860px;
		margin: 0 auto;
		padding: clamp(1rem, 3dvh, 2rem) 1rem 4rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		color: var(--text-primary);
	}

	.beta__head {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.beta__head h1 {
		margin: 0;
		font-size: clamp(1.4rem, 4dvh, 1.9rem);
	}

	.beta__meta {
		margin: 0;
		color: var(--text-secondary);
		font-size: 0.9rem;
	}

	.beta__lang {
		align-self: flex-start;
		margin-top: 0.5rem;
		min-height: 44px;
		padding: 0 1rem;
		border: 1px solid var(--border);
		border-radius: 12px;
		background: var(--bg-primary);
		color: var(--text-primary);
		cursor: pointer;
	}

	.beta__tabs {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.beta__tab {
		min-height: 44px;
		padding: 0 0.9rem;
		border: 1px solid var(--border);
		border-radius: 12px;
		background: var(--bg-primary);
		color: var(--text-secondary);
		cursor: pointer;
	}

	.beta__tab.is-active {
		border-color: var(--accent);
		color: var(--text-primary);
		font-weight: 600;
	}

	.beta__screens {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
		margin: 0;
		font-size: 0.88rem;
		color: var(--text-secondary);
	}

	.beta__screen-link {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		padding: 0 0.7rem;
		border: 1px dashed var(--border);
		border-radius: 10px;
		color: var(--accent);
		text-decoration: none;
	}

	.beta__level {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.beta__level h2 {
		margin: 0;
		font-size: 1.05rem;
	}

	.beta__level-hint {
		margin: 0 0 0.5rem;
		color: var(--text-secondary);
		font-size: 0.86rem;
	}

	.beta__list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
</style>
