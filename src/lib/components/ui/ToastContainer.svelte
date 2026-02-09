<script lang="ts">
	import { notificationStore } from "$lib/stores/notificationStore.svelte";
	import { logService } from "$lib/services/logService";
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
		>
			<div class="toast-content">
				<span data-testid="toast-message">{note.message}</span>
				{#if note.type === 'error'}
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
			<button
				class="close-btn"
				onclick={() => notificationStore.remove(note.id)}
				data-testid="toast-close-btn"
			>
				<X size={16} />
			</button>
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
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
		display: flex;
		align-items: center;
		gap: 12px;
		min-width: 250px;
		max-width: 90vw;
		border-left: 4px solid transparent;
		font-size: 0.9rem;
	}

	.toast-content {
		display: flex;
		flex-direction: column;
		gap: 8px;
		flex: 1;
	}

	.copy-logs-btn {
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		color: var(--text-primary);
		padding: 4px 8px;
		border-radius: 6px;
		font-size: 0.7rem;
		font-weight: bold;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 4px;
		align-self: flex-start;
		transition: all 0.2s;
	}

	.copy-logs-btn:hover {
		background: rgba(255, 255, 255, 0.2);
	}

	.toast.info {
		border-left-color: var(--toast-info, #3b82f6);
	}
	.toast.success {
		border-left-color: var(--toast-success, #22c55e);
	}
	.toast.warning {
		border-left-color: var(--toast-warning, #f59e0b);
	}
	.toast.error {
		border-left-color: var(--toast-error, #ef4444);
	}

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
	}
	.close-btn:hover {
		opacity: 1;
	}
</style>
