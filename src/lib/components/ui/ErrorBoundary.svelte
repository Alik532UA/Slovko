<script lang="ts">
	import { _ } from "svelte-i18n";
	import { AlertTriangle, Check, Copy, RotateCcw } from "lucide-svelte";
	import { settingsStore } from "$lib/controllers/SettingsStore.svelte";
	import { versionStore } from "$lib/controllers/VersionStore.svelte";
	import { logService } from "../../services/logService.svelte";
	import type { Snippet } from "svelte";

	interface Props {
		children: Snippet;
		compact?: boolean;
	}
	let { children, compact = false }: Props = $props();

	let reportCopied = $state(false);
	/** Текст звіту показується полем, коли буфер обміну відмовив. */
	let reportFallback = $state<string | null>(null);

	async function copyReport(error: unknown) {
		const err = error as { message?: string; stack?: string };
		const report = {
			error: err?.message || "Unknown error",
			stack: err?.stack,
			version: versionStore.currentVersion,
			settings: {
				mode: settingsStore.value.mode,
				level: settingsStore.value.currentLevel,
				topic: settingsStore.value.currentTopic,
				source: settingsStore.value.sourceLanguage,
				target: settingsStore.value.targetLanguage,
			},
			timestamp: new Date().toISOString(),
			userAgent: navigator.userAgent,
		};

		const text = JSON.stringify(report, null, 2);

		/*
		 * Доти тут стояв `.then(() => alert(...))` БЕЗ `.catch()`, і це два різні
		 * дефекти в одному рядку:
		 *
		 *   * відмова буфера (небезпечний контекст, відкликаний дозвіл, Safari
		 *     поза жестом користувача) давала відхилений проміс, який нікуди не
		 *     спливав: людина натискала кнопку, і не відбувалося НІЧОГО —
		 *     ні звіту, ні пояснення;
		 *   * `alert()` — блокувальне вікно з англійським рядком повз усі сім
		 *     словників і повз тости застосунку.
		 *
		 * Тепер успіх позначається станом кнопки, а відмова показує сам текст
		 * полем: звіт — єдине, заради чого ця кнопка існує.
		 */
		try {
			await navigator.clipboard.writeText(text);
			reportCopied = true;
			reportFallback = null;
			setTimeout(() => (reportCopied = false), 2000);
		} catch (clipboardError) {
			logService.warn("game", "Clipboard unavailable for error report:", clipboardError);
			reportFallback = text;
		}
	}

	function handleError(error: unknown) {
		logService.error("game", "ErrorBoundary caught an error:", error);
	}
</script>

<svelte:boundary onerror={handleError}>
	{@render children()}
	{#snippet failed(error, reset)}
		<div class="error-container" class:compact data-testid="error-boundary">
			<div class="error-card" class:compact-card={compact}>
				<div class="icon-box" class:compact-icon={compact}>
					<AlertTriangle size={compact ? 24 : 48} />
				</div>

				{#if !compact}
					<h2>
						{$_("common.error.oops")}
					</h2>
				{/if}

				<p class="error-msg" class:compact-msg={compact}>
					{(error as { message?: string })?.message || $_("errors.page.unexpected")}
				</p>

				<div class="actions" class:compact-actions={compact}>
					<button class="action-btn retry" onclick={reset}>
						<RotateCcw size={compact ? 16 : 20} />
						<span>{$_("common.retry")}</span>
					</button>

					{#if !compact}
						<button class="action-btn report" onclick={() => copyReport(error)}>
							{#if reportCopied}
								<Check size={20} />
								<span>{$_("common.copied")}</span>
							{:else}
								<Copy size={20} />
								<span>{$_("common.copyReport")}</span>
							{/if}
						</button>
					{/if}
				</div>

				{#if reportFallback}
					<p class="copy-failed">{$_("startup.copyFailed")}</p>
					<textarea class="copy-fallback" data-testid="error-boundary-report-text" readonly rows="6"
						>{reportFallback}</textarea
					>
				{/if}
			</div>
		</div>
	{/snippet}
</svelte:boundary>

<style>
	.error-container {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 2rem;
		width: 100%;
		height: 100%;
		min-height: 300px;
	}

	.error-container.compact {
		padding: 0.5rem;
		min-height: auto;
	}

	.error-card {
		background: var(--glass-bg);
		backdrop-filter: blur(var(--glass-blur));
		border: 1px solid var(--border);
		border-radius: 24px;
		padding: 2.5rem;
		max-width: 400px;
		width: 100%;
		text-align: center;
		box-shadow: var(--shadow-lg);
	}

	.error-card.compact-card {
		padding: 1rem;
		border-radius: 12px;
	}

	.icon-box {
		color: var(--status-warning);
		margin-bottom: 1.5rem;
		display: flex;
		justify-content: center;
	}

	.icon-box.compact-icon {
		margin-bottom: 0.5rem;
	}

	h2 {
		margin: 0 0 1rem;
		font-size: 1.5rem;
		color: var(--text-primary);
	}

	.error-msg {
		color: var(--text-secondary);
		font-size: 0.9rem;
		margin-bottom: 2rem;
		line-height: 1.5;
		word-break: break-word;
	}

	.error-msg.compact-msg {
		font-size: 0.8rem;
		margin-bottom: 1rem;
	}

	.actions {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.actions.compact-actions {
		flex-direction: row;
	}

	.action-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		padding: 0.85rem;
		border-radius: 14px;
		font-weight: 600;
		cursor: pointer;
		transition: var(--hover-transition);
		border: none;
		width: 100%;
	}

	.actions.compact-actions .action-btn {
		padding: 0.5rem;
		font-size: 0.8rem;
		border-radius: 8px;
	}

	.retry {
		background: var(--accent);
		color: white;
		box-shadow: var(--shadow-sm);
	}

	.retry:hover {
		background: var(--accent-hover);
		transform: scale(var(--hover-scale));
		box-shadow: var(--shadow-md);
	}

	.report {
		background: var(--bg-hover);
		border: 1px solid var(--border);
		color: var(--text-primary);
	}

	.report:hover {
		background: var(--bg-active);
		transform: scale(var(--hover-scale));
	}

	.copy-failed {
		margin: 1rem 0 0;
		color: var(--text-secondary);
		font-size: 0.8rem;
		text-align: left;
	}

	.copy-fallback {
		width: 100%;
		margin-top: 0.5rem;
		padding: 0.5rem;
		border-radius: 10px;
		border: 1px solid var(--border);
		background: var(--bg-active);
		color: var(--text-secondary);
		font-family: monospace;
		font-size: 0.7rem;
		resize: vertical;
	}
</style>
