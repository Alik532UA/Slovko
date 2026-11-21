<script lang="ts">
	interface Props {
		item: {
			timestamp: string;
			level: 'error' | 'warn' | 'info';
			category: string;
			message: string;
		};
	}
	let { item }: Props = $props();
</script>

<div class="log-entry" class:log-entry--error={item.level === 'error'} class:log-entry--warn={item.level === 'warn'} data-testid="error-log-modal-item">
	<div class="entry-meta">
		<span class="badge" class:badge--error={item.level === 'error'} class:badge--warn={item.level === 'warn'}>{item.level.toUpperCase()}</span>
		<span class="category">{item.category}</span>
		{#if item.timestamp}<span class="timestamp">{item.timestamp}</span>{/if}
	</div>
	<div class="message">{item.message}</div>
</div>

<style>
	.log-entry { font-family: monospace; font-size: 0.75rem; padding: 6px 10px; border-radius: 6px; background: rgba(255, 255, 255, 0.04); border-left: 3px solid rgba(255, 255, 255, 0.3); }
	.log-entry--error { border-left-color: #ef4444; background: rgba(239, 68, 68, 0.08); }
	.log-entry--warn { border-left-color: #f59e0b; background: rgba(245, 158, 11, 0.08); }
	.entry-meta { display: flex; align-items: center; gap: 6px; margin-bottom: 2px; }
	.badge { font-size: 0.625rem; font-weight: 700; padding: 1px 4px; border-radius: 3px; background: rgba(255, 255, 255, 0.15); color: #fff; }
	.badge--error { background: #ef4444; }
	.badge--warn { background: #f59e0b; color: #000; }
	.category { font-weight: 600; color: #94a3b8; }
	.timestamp { color: #64748b; font-size: 0.6875rem; margin-left: auto; }
	.message { white-space: pre-wrap; word-break: break-word; color: #e2e8f0; line-height: 1.35; }
</style>
