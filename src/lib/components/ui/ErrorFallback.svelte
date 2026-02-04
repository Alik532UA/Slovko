<script lang="ts">
	/**
	 * ErrorFallback — Component to show when a boundary catches an error.
	 */
	import { RefreshCw, AlertTriangle } from "lucide-svelte";

	let { error, reset }: { error: unknown; reset: () => void } = $props();

	let errorMessage = $derived(
		error instanceof Error ? error.message : String(error),
	);
</script>

<div class="error-container">
	<AlertTriangle size={48} class="icon" />
	<h3>Something went wrong</h3>
	<p class="message">{errorMessage}</p>
	<button onclick={reset} class="retry-btn">
		<RefreshCw size={18} />
		Try Again
	</button>
</div>

<style>
	.error-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		text-align: center;
		background: var(--card-bg, #2a2a2a);
		border: 2px solid var(--wrong-border, #ff4444);
		border-radius: 16px;
		gap: 1rem;
		max-width: 400px;
		margin: 1rem auto;
		color: var(--text-primary, #fff);
	}

	.icon {
		color: var(--wrong-bg, #ff4444);
	}

	h3 {
		margin: 0;
		font-size: 1.2rem;
	}

	.message {
		font-size: 0.9rem;
		color: var(--text-secondary, #ccc);
		word-break: break-word;
	}

	.retry-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		background: var(--accent, #3a8fd6);
		color: white;
		border: none;
		border-radius: 8px;
		font-weight: 600;
		cursor: pointer;
		transition: transform 0.2s;
	}

	.retry-btn:hover {
		transform: scale(1.05);
	}

	.retry-btn:active {
		transform: scale(0.95);
	}
</style>
