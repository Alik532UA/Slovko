<script lang="ts">
	import { _ } from "svelte-i18n";
	import { AlertTriangle, Copy, RotateCcw } from "lucide-svelte";
	import { settingsStore } from "$lib/stores/settingsStore.svelte";
	import { versionStore } from "$lib/stores/versionStore.svelte";
	import { logService } from "../../services/logService";
	import type { Snippet } from "svelte";

	interface Props {
		children: Snippet;
		compact?: boolean;
	}
	let { children, compact = false }: Props = $props();

	function copyReport(error: unknown) {
		const err = error as any;
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

		navigator.clipboard
			.writeText(JSON.stringify(report, null, 2))
			.then(() => alert("Report copied to clipboard!"));
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
					{(error as any)?.message || "An unexpected error occurred"}
				</p>

				<div class="actions" class:compact-actions={compact}>
					<button class="action-btn retry" onclick={reset}>
						<RotateCcw size={compact ? 16 : 20} />
						<span>{$_("common.retry")}</span>
					</button>

					{#if !compact}
						<button class="action-btn report" onclick={() => copyReport(error)}>
							<Copy size={20} />
							<span>{$_("common.copyReport")}</span>
						</button>
					{/if}
				</div>
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
		background: rgba(255, 255, 255, 0.05);
		backdrop-filter: blur(10px);
		border: 1px solid var(--border);
		border-radius: 24px;
		padding: 2.5rem;
		max-width: 400px;
		width: 100%;
		text-align: center;
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
	}

	.error-card.compact-card {
		padding: 1rem;
		border-radius: 12px;
	}

	.icon-box {
		color: #f59e0b;
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
		transition: all 0.2s;
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
	}

	.retry:hover {
		filter: brightness(1.1);
		transform: translateY(-1px);
	}

	.report {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid var(--border);
		color: var(--text-primary);
	}

	.report:hover {
		background: rgba(255, 255, 255, 0.1);
	}
</style>
