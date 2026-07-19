<script lang="ts">
	import { notificationStore } from "$lib/controllers/NotificationStore.svelte";
	import { logService } from "$lib/services/logService.svelte";
	import { X, ClipboardCopy } from "lucide-svelte";
	import { fade, fly } from "svelte/transition";

	let copiedId = $state<string | null>(null);

	async function handleCopyLogs(id: string) {
		const ok = await logService.copyLogsToClipboard();
		if (ok) {
			copiedId = id;
			setTimeout(() => { if (copiedId === id) copiedId = null; }, 2000);
		}
	}
</script>

<div class="toast-container" data-testid="toast-container">
	{#each notificationStore.value as note (note.id)}
		<div
			class="toast {note.type}"
			in:fly={{ y: 20, duration: 300 }}
			out:fade={{ duration: 200 }}
			role="alert"
			data-testid="toast-{note.type}"
			onmouseenter={() => notificationStore.pauseTimer(note.id)}
			onmouseleave={() => notificationStore.resumeTimer(note.id)}
		>
			<div class="toast-content">
				<span data-testid="toast-message">{note.message}</span>
				<div class="toast-actions">
					{#if note.action}
						<button 
							class="action-btn"
							onclick={() => { note.action?.onClick(); notificationStore.remove(note.id); }}
						>
							{note.action.label}
						</button>
					{/if}
					{#if note.type === 'error' && !note.hideLogs}
						<button 
							class="copy-logs-btn" 
							onclick={() => handleCopyLogs(note.id)}
							title="Copy debug logs"
						>
							<ClipboardCopy size={14} />
							{copiedId === note.id ? "COPIED" : "LOGS"}
						</button>
					{/if}
				</div>
			</div>
			<button
				class="close-btn"
				onclick={() => notificationStore.remove(note.id)}
				data-testid="toast-close-btn"
			>
				<X size={16} />
			</button>
			{#if note.timeout && note.timeout > 0}
				<div
					class="toast-progress"
					style="animation-duration: {note.timeout}ms"
					aria-hidden="true"
				></div>
			{/if}
		</div>
	{/each}
</div>

<style>
	.toast-container {
		position: fixed;
		bottom: 20px;
		right: 20px;
		display: flex;
		flex-direction: column;
		gap: 10px;
		z-index: 20000;
		pointer-events: none;
	}

	.toast {
		pointer-events: auto;
		background: var(--bg-secondary);
		color: var(--text-primary);
		padding: 12px 16px;
		border-radius: 12px;
		box-shadow: var(--shadow-md);
		display: flex;
		align-items: center;
		gap: 12px;
		min-width: 250px;
		max-width: 90vw;
		border-left: 4px solid transparent;
		font-size: 0.9rem;
		backdrop-filter: blur(8px);
		position: relative;
		overflow: hidden;
	}

	.toast:hover .toast-progress {
		animation-play-state: paused;
	}

	@keyframes toast-shrink {
		from { transform: scaleX(1); }
		to   { transform: scaleX(0); }
	}

	.toast-progress {
		position: absolute;
		bottom: 0;
		left: 0;
		width: 100%;
		height: 3px;
		transform-origin: left center;
		animation: toast-shrink linear forwards;
		border-radius: 0 0 0 12px;
	}

	.toast-content {
		display: flex;
		flex-direction: column;
		gap: 8px;
		flex: 1;
		z-index: 1;
	}

	.toast-actions {
		display: flex;
		align-items: center;
		gap: 8px;
		align-self: flex-start;
	}

	.copy-logs-btn, .action-btn {
		background: var(--bg-hover);
		border: 1px solid var(--glass-border);
		color: var(--text-primary);
		padding: 4px 8px;
		border-radius: 6px;
		font-size: 0.7rem;
		font-weight: bold;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 4px;
		transition: all 0.2s;
	}

	.copy-logs-btn:hover, .action-btn:hover {
		background: var(--bg-active);
	}

	.toast.info { border-left-color: var(--toast-info, #3b82f6); }
	.toast.info .toast-progress { background: var(--toast-info, #3b82f6); }
	
	.toast.success { border-left-color: var(--toast-success, #22c55e); }
	.toast.success .toast-progress { background: var(--toast-success, #22c55e); }
	
	.toast.warning { border-left-color: var(--toast-warning, #f59e0b); }
	.toast.warning .toast-progress { background: var(--toast-warning, #f59e0b); }
	
	.toast.error { border-left-color: var(--toast-error, #ef4444); }
	.toast.error .toast-progress { background: var(--toast-error, #ef4444); }

	.close-btn {
		margin-left: auto;
		opacity: 0.6;
		transition: opacity 0.2s;
		display: flex;
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
		color: inherit;
		z-index: 1;
	}
	.close-btn:hover {
		opacity: 1;
	}
</style>
