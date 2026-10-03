<script lang="ts">
	/**
	 * Один пункт чеклиста з чотирма станами відповіді.
	 *
	 * Винесений із сторінки не заради охайності: `+page.svelte` перетнув
	 * орієнтир розміру (PROJECT-STRUCTURE-v8 § 7), і саме тут проходить межа
	 * відповідальності — сторінка розкладає вкладки й рівні, пункт малює себе.
	 */
	import { Check, HelpCircle, SkipForward, X } from "lucide-svelte";
	import type { BetaCheck, Vote } from "$lib/data/beta/types";
	import { betaChecklistStore } from "$lib/controllers/BetaChecklistStore.svelte";

	interface Props {
		check: BetaCheck;
		number: number;
		lang: "uk" | "en";
	}
	let { check, number, lang }: Props = $props();

	const VOTES: readonly Vote[] = ["ok", "fail", "unclear", "skip"];

	const VOTE_TITLE: Record<Vote, { uk: string; en: string }> = {
		ok: { uk: "Працює", en: "Works" },
		fail: { uk: "Не працює", en: "Broken" },
		unclear: { uk: "Не зрозуміло", en: "Unclear" },
		skip: { uk: "Пропустити", en: "Skip" },
	};

	/**
	 * Локатор бере `id` пункта в kebab-case (§ 5.6, `BETA-LOCATOR-PER-CHECK`).
	 *
	 * Доти `check.id` підставлявся ЯК Є, і `game_1` давав
	 * `beta-check-game_1-item` — назву, яку TESTID-AND-NAMING § 1.2 забороняє
	 * (підкреслень у локаторах немає). Обидва правила стояли в каноні, і не
	 * падало жодне: за форму `id` і за форму локатора відповідали різні гейти.
	 * Заміна `_` → `-` повна й однозначна в обидва боки, тож локатор лишається
	 * ПОХІДНИМ від `id`, а не другим іменем, яке треба тримати узгодженим.
	 */
	const tid = $derived(check.id.replace(/_/g, "-"));
	const currentVote = $derived(betaChecklistStore.voteOf(check.id));
</script>

<li
	class="item"
	class:item--ok={currentVote === "ok"}
	class:item--fail={currentVote === "fail"}
	class:item--unclear={currentVote === "unclear"}
	class:item--skip={currentVote === "skip"}
	data-testid="beta-check-{tid}-item"
>
	<span class="item__num">{number}</span>
	<div class="item__body">
		<p class="item__category" data-testid="beta-check-{tid}-category-text">
			{check.category[lang]}
			{#if check.negative}
				<span class="item__flag">
					{lang === "uk" ? "перевірка межі" : "boundary check"}
				</span>
			{/if}
		</p>

		<p class="item__text" data-testid="beta-check-{tid}-text">{check.text[lang]}</p>

		{#if check.test}
			<p class="item__aside">{check.test}</p>
		{/if}

		{#if betaChecklistStore.isStale(check.id)}
			<p class="item__aside" data-testid="beta-check-{tid}-stale-hint">
				{lang === "uk"
					? "позначено на іншій збірці — не рахується"
					: "marked on another build — not counted"}
			</p>
		{/if}

		<div class="item__votes">
			{#each VOTES as vote (vote)}
				<button
					class="vote vote--{vote}"
					class:is-picked={currentVote === vote}
					aria-pressed={currentVote === vote}
					data-testid="beta-vote-{tid}-{vote}-btn"
					onclick={() => betaChecklistStore.setVote(check.id, vote)}
				>
					{#if vote === "ok"}<Check size={15} />
					{:else if vote === "fail"}<X size={15} />
					{:else if vote === "unclear"}<HelpCircle size={15} />
					{:else if vote === "skip"}<SkipForward size={15} />{/if}
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

	.item.item--ok {
		border-color: var(--toast-success, #22c55e);
		border-width: 2px;
	}
	.item.item--fail {
		border-color: var(--toast-error, #ef4444);
		border-width: 2px;
	}
	.item.item--unclear {
		border-color: var(--toast-warning, #eab308);
		border-width: 2px;
	}
	.item.item--skip {
		border-color: #3b82f6;
		border-width: 2px;
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
		--vote-ok: var(--toast-success, #22c55e);
		--vote-fail: var(--toast-error, #ef4444);
		--vote-unclear: var(--toast-warning, #eab308);
		--vote-skip: #3b82f6;
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		min-height: 44px;
		min-width: 44px;
		padding: 0 0.8rem;
		border: 1px solid var(--border);
		border-radius: 12px;
		font-size: 0.88rem;
		cursor: pointer;
	}

	.vote--ok {
		background: color-mix(in srgb, var(--vote-ok) 8%, var(--bg-primary, #ffffff));
		color: var(--text-secondary);
	}
	.vote--fail {
		background: color-mix(in srgb, var(--vote-fail) 8%, var(--bg-primary, #ffffff));
		color: var(--text-secondary);
	}
	.vote--unclear {
		background: color-mix(in srgb, var(--vote-unclear) 8%, var(--bg-primary, #ffffff));
		color: var(--text-secondary);
	}
	.vote--skip {
		background: color-mix(in srgb, var(--vote-skip) 8%, var(--bg-primary, #ffffff));
		color: var(--text-secondary);
	}

	.vote.is-picked {
		border-width: 4px;
		font-weight: 700;
	}

	.vote--ok.is-picked {
		border-color: var(--vote-ok);
		background: color-mix(in srgb, var(--vote-ok) 18%, var(--bg-primary, #ffffff));
		color: var(--vote-ok);
	}
	.vote--fail.is-picked {
		border-color: var(--vote-fail);
		background: color-mix(in srgb, var(--vote-fail) 18%, var(--bg-primary, #ffffff));
		color: var(--vote-fail);
	}
	.vote--unclear.is-picked {
		border-color: var(--vote-unclear);
		background: color-mix(in srgb, var(--vote-unclear) 18%, var(--bg-primary, #ffffff));
		color: var(--vote-unclear);
	}
	.vote--skip.is-picked {
		border-color: var(--vote-skip);
		background: color-mix(in srgb, var(--vote-skip) 18%, var(--bg-primary, #ffffff));
		color: var(--vote-skip);
	}
</style>
