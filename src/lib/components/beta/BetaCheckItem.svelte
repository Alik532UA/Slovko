<script lang="ts">
	/**
	 * Один пункт чеклиста з чотирма станами відповіді.
	 *
	 * Винесений із сторінки не заради охайності: `+page.svelte` перетнув
	 * орієнтир розміру (PROJECT-STRUCTURE-v8 § 7), і саме тут проходить межа
	 * відповідальності — сторінка розкладає вкладки й рівні, пункт малює себе.
	 */
	import { Check, TriangleAlert, X } from "lucide-svelte";
	import type { BetaCheck, Vote } from "$lib/data/beta/types";
	import { betaChecklistStore } from "$lib/controllers/BetaChecklistStore.svelte";

	interface Props {
		check: BetaCheck;
		number: number;
		lang: "uk" | "en";
	}
	let { check, number, lang }: Props = $props();

	const VOTE_TITLE: Record<Vote, { uk: string; en: string }> = {
		fail: { uk: "Не працює", en: "Broken" },
		weird: { uk: "Працює, але дивно", en: "Works, but odd" },
		ok: { uk: "Працює", en: "Works" },
	};
</script>

<li class="item" data-testid="beta-check-{check.id}-item">
	<span class="item__num">{number}</span>
	<div class="item__body">
		<p class="item__category" data-testid="beta-check-{check.id}-category-text">
			{check.category[lang]}
			{#if check.negative}
				<span class="item__flag">
					{lang === "uk" ? "перевірка межі" : "boundary check"}
				</span>
			{/if}
		</p>

		<p class="item__text" data-testid="beta-check-{check.id}-text">{check.text[lang]}</p>

		{#if check.test}
			<p class="item__aside">{check.test}</p>
		{/if}

		{#if betaChecklistStore.isStale(check.id)}
			<p class="item__aside" data-testid="beta-check-{check.id}-stale-hint">
				{lang === "uk"
					? "позначено на іншій збірці — не рахується"
					: "marked on another build — not counted"}
			</p>
		{/if}

		<div class="item__votes">
			{#each ["fail", "weird", "ok"] as const as vote (vote)}
				<button
					class="vote vote--{vote}"
					class:is-picked={betaChecklistStore.voteOf(check.id) === vote}
					aria-pressed={betaChecklistStore.voteOf(check.id) === vote}
					data-testid="beta-vote-{check.id}-{vote}-btn"
					onclick={() => betaChecklistStore.setVote(check.id, vote)}
				>
					{#if vote === "fail"}<X size={15} />
					{:else if vote === "weird"}<TriangleAlert size={15} />
					{:else}<Check size={15} />{/if}
					{VOTE_TITLE[vote][lang]}
				</button>
			{/each}
		</div>
	</div>
</li>

<style>
	.item {
		display: grid;
		grid-template-columns: 2rem 1fr;
		gap: 0.75rem;
		padding: 0.85rem;
		border: 1px solid var(--border);
		border-radius: 14px;
		background: var(--bg-primary);
	}

	.item__num {
		color: var(--text-secondary);
		font-variant-numeric: tabular-nums;
	}

	.item__body {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		min-width: 0;
	}

	.item__category {
		margin: 0;
		font-size: 0.78rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-secondary);
	}

	.item__flag {
		margin-left: 0.4rem;
		padding: 0.1rem 0.35rem;
		border: 1px solid currentColor;
		border-radius: 6px;
		font-size: 0.72rem;
		letter-spacing: 0;
		text-transform: none;
	}

	.item__text {
		margin: 0;
		line-height: 1.5;
	}

	.item__aside {
		margin: 0;
		font-size: 0.8rem;
		color: var(--text-secondary);
	}

	.item__votes {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-top: 0.25rem;
	}

	/*
	 * Стан позначено НЕ лише кольором (§ 3.2): міняються рамка, її товщина й
	 * накреслення, інакше вибір недоступний тому, хто кольори не розрізняє.
	 * `aria-pressed` каже те саме читалці.
	 */
	.vote {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		min-height: 44px;
		padding: 0 0.8rem;
		border: 1px solid var(--border);
		border-radius: 12px;
		background: transparent;
		color: var(--text-secondary);
		font-size: 0.88rem;
		cursor: pointer;
	}

	.vote.is-picked {
		border-width: 3px;
		font-weight: 700;
		color: var(--text-primary);
	}

	.vote--fail.is-picked {
		border-color: var(--toast-error, #ef4444);
	}
	.vote--weird.is-picked {
		border-color: var(--toast-warning, #eab308);
	}
	.vote--ok.is-picked {
		border-color: var(--toast-success, #22c55e);
	}
</style>
