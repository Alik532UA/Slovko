<script lang="ts">
	/**
	 * +error.svelte - Global Error Boundary
	 * Shows when a fatal error occurs during rendering or loading.
	 * Includes debug logs copy functionality.
	 */
	import { page } from "$app/stores";
	import { logService } from "$lib/services/logService.svelte";
	import { onMount } from "svelte";

	let logsCopied = $state(false);
	let logs = $state("");

	onMount(() => {
		// Capture logs immediately when error page mounts
		try {
			logs = logService.getRecentLogs();
		} catch {
			logs = "Failed to retrieve logs.";
		}
	});

	async function copyLogs() {
		const errorInfo = `
ERROR: ${$page.status} 
MESSAGE: ${$page.error?.message || "Unknown error"}
URL: ${$page.url.href}
UA: ${navigator.userAgent}
----------------------------------------
LOGS:
${logs}
`;

		try {
			await navigator.clipboard.writeText(errorInfo);
			logsCopied = true;
			setTimeout(() => logsCopied = false, 2000);
		} catch (err) {
			logService.error("debug", "Failed to copy logs:", err);
			// Fallback alert if clipboard API fails
			alert("Failed to copy logs to clipboard. Check console.");
		}
	}

	function reload() {
		window.location.reload();
	}
</script>

<div class="error-page">
	<div class="error-container">
		<div class="icon">⚠️</div>
		<h1>Something went wrong</h1>
		<p class="status">Error {$page.status}</p>
		
		<!-- Optional Chaining for error message -->
		<p class="message">{$page.error?.message || "An unexpected error occurred."}</p>

		<div class="actions">
			<button class="primary-btn" onclick={reload}>
				Reload App
			</button>
			
			<button class="secondary-btn" onclick={copyLogs}>
				{logsCopied ? "Logs Copied! ✅" : "Copy Debug Logs 📋"}
			</button>
		</div>
		
		<details>
			<summary>Technical Details</summary>
			<pre>{JSON.stringify($page.error, null, 2)}</pre>
		</details>
	</div>
</div>

<style>
	.error-page {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		background: var(--bg-primary);
		color: var(--text-primary);
		padding: 1rem;
	}

	.error-container {
		text-align: center;
		max-width: 400px;
		width: 100%;
		background: var(--glass-bg);
		padding: 2.5rem 2rem;
		border-radius: 24px;
		border: 1px solid var(--glass-border);
		box-shadow: var(--shadow-lg);
		backdrop-filter: blur(var(--glass-blur));
	}

	.icon {
		font-size: 4rem;
		margin-bottom: 1.5rem;
	}

	h1 {
		font-size: 1.75rem;
		margin-bottom: 0.5rem;
		color: var(--text-primary);
		font-weight: 800;
	}

	.status {
		color: var(--status-danger);
		font-weight: bold;
		margin-bottom: 0.75rem;
		font-size: 1.1rem;
	}

	.message {
		color: var(--text-secondary);
		margin-bottom: 2rem;
		line-height: 1.5;
		word-wrap: break-word;
		font-size: 1rem;
	}

	.actions {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-bottom: 2rem;
	}

	button {
		padding: 1rem 1.5rem;
		border-radius: 14px;
		border: none;
		font-weight: 700;
		cursor: pointer;
		font-size: 1rem;
		transition: var(--hover-transition);
	}

	button:active {
		transform: scale(var(--active-scale));
	}

	.primary-btn {
		background: var(--accent);
		color: white;
		box-shadow: var(--shadow-sm);
	}

	.primary-btn:hover {
		background: var(--accent-hover);
		transform: scale(var(--hover-scale));
		box-shadow: var(--shadow-md);
	}

	.secondary-btn {
		background: var(--bg-hover);
		color: var(--text-primary);
		border: 1px solid var(--glass-border);
	}

	.secondary-btn:hover {
		background: var(--bg-active);
		transform: scale(var(--hover-scale));
	}

	details {
		text-align: left;
		font-size: 0.85rem;
		color: var(--text-secondary);
		margin-top: 1rem;
		padding: 1rem;
		background: var(--bg-hover);
		border-radius: 12px;
	}
	
	summary {
		cursor: pointer;
		margin-bottom: 0.5rem;
		font-weight: 600;
	}

	pre {
		background: var(--bg-active);
		padding: 0.75rem;
		border-radius: 8px;
		overflow-x: auto;
		white-space: pre-wrap;
		word-wrap: break-word;
		max-height: 200px;
		overflow-y: auto;
		color: var(--text-secondary);
		font-family: monospace;
		border: 1px solid var(--glass-border);
	}
</style>