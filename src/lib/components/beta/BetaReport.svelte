<script lang="ts">
	/**
	 * Звіт тестувальника: текст у буфер обміну, і обов'язково — запасний шлях.
	 *
	 * `navigator.clipboard.writeText` відмовляє буденно: вкладка не у фокусі,
	 * сторінка не через https, немає дозволу. Кнопка при цьому виглядає
	 * натиснутою — і вся робота людини зникає на останньому кроці
	 * (BETA-CHECKLIST-v8 § 6.2). Тому при відмові звіт з'являється текстом у
	 * полі поруч.
	 */
	import { ClipboardCopy, RotateCcw } from "lucide-svelte";
	import { betaChecklistStore } from "$lib/controllers/BetaChecklistStore.svelte";
	import { logService } from "$lib/services/logService.svelte";

	interface Props {
		lang: "uk" | "en";
	}
	let { lang }: Props = $props();

	let reportText = $state("");
	let clipboardRefused = $state(false);

	async function copyReport() {
		const text = betaChecklistStore.buildReport(new Date().toISOString(), lang);
		clipboardRefused = false;
		try {
			await navigator.clipboard.writeText(text);
			reportText = "";
		} catch (error) {
			clipboardRefused = true;
			reportText = text;
			logService.warn("ui", "Буфер обміну відмовив, звіт показано в полі", error);
		}
	}
</script>

<footer class="report">
	<button class="report__action" data-testid="beta-report-btn" onclick={copyReport}>
		<ClipboardCopy size={17} />
		{lang === "uk" ? "Скопіювати звіт" : "Copy the report"}
	</button>

	<button
		class="report__action report__action--quiet"
		data-testid="beta-clear-btn"
		onclick={() => betaChecklistStore.clear()}
	>
		<RotateCcw size={17} />
		{lang === "uk" ? "Стерти позначки" : "Clear marks"}
	</button>

	{#if clipboardRefused}
		<p class="report__hint" role="alert" data-testid="beta-report-hint">
			{lang === "uk"
				? "Браузер не дав доступу до буфера. Скопіюйте текст із поля нижче."
				: "The browser refused clipboard access. Copy the text from the field below."}
		</p>
	{/if}

	{#if reportText}
		<textarea
			class="report__text"
			readonly
			rows="14"
			data-testid="beta-report-input"
			aria-label={lang === "uk" ? "Текст звіту" : "Report text"}
			value={reportText}
		></textarea>
	{/if}
</footer>

<style>
	.report {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
		align-items: center;
	}

	.report__action {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		min-height: 44px;
		padding: 0 1rem;
		border: none;
		border-radius: 12px;
		background: var(--accent);
		color: var(--text-on-accent, #fff);
		cursor: pointer;
	}

	.report__action--quiet {
		background: transparent;
		border: 1px solid var(--border);
		color: var(--text-secondary);
	}

	.report__hint {
		flex-basis: 100%;
		margin: 0;
		color: var(--toast-error, #ef4444);
		font-size: 0.88rem;
	}

	.report__text {
		flex-basis: 100%;
		width: 100%;
		padding: 0.75rem;
		border: 1px solid var(--border);
		border-radius: 12px;
		background: var(--bg-secondary);
		color: var(--text-primary);
		font-family: monospace;
		font-size: 0.82rem;
		resize: vertical;
	}
</style>
