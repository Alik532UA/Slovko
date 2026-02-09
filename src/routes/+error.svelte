<script lang="ts">
	/**
	 * +error.svelte - Global Error Boundary
	 * Shows when a fatal error occurs during rendering or loading.
	 * Includes debug logs copy functionality.
	 */
	import { page } from "$app/stores";
	import { logService } from "$lib/services/logService";
	import { onMount } from "svelte";

	let logsCopied = $state(false);
	let logs = $state("");

	onMount(() => {
		// Capture logs immediately when error page mounts
		try {
			// Using type assertion as logService might be typed differently in various contexts
			// Assuming logService has getLogs or logs array
			const entries = (logService as any).getLogs ? (logService as any).getLogs() : 
						   (logService as any).logs ? (logService as any).logs : [];
			
			if (Array.isArray(entries)) {
				logs = entries.map((l: any) => 
					`[${l.timestamp ? new Date(l.timestamp).toISOString() : ''}] [${l.category}] ${l.message} ${l.data ? JSON.stringify(l.data) : ''}`
				).join('\n');
			}
		} catch (e) {
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
			console.error("Failed to copy logs:", err);
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
		background: #1a1a2e;
		color: #e0e0e0;
		font-family: system-ui, -apple-system, sans-serif;
		padding: 1rem;
	}

	.error-container {
		text-align: center;
		max-width: 400px;
		width: 100%;
		background: rgba(255, 255, 255, 0.05);
		padding: 2rem;
		border-radius: 16px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
	}

	.icon {
		font-size: 4rem;
		margin-bottom: 1rem;
	}

	h1 {
		font-size: 1.5rem;
		margin-bottom: 0.5rem;
		color: #fff;
	}

	.status {
		color: #ff6b6b;
		font-weight: bold;
		margin-bottom: 0.5rem;
	}

	.message {
		color: #a0a0a0;
		margin-bottom: 2rem;
		line-height: 1.4;
		word-wrap: break-word;
	}

	.actions {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-bottom: 2rem;
	}

	button {
		padding: 0.8rem 1.5rem;
		border-radius: 8px;
		border: none;
		font-weight: 600;
		cursor: pointer;
		font-size: 1rem;
		transition: opacity 0.2s, transform 0.1s;
	}

	button:active {
		transform: scale(0.98);
	}

	.primary-btn {
		background: #3a8fd6;
		color: white;
	}

	.secondary-btn {
		background: rgba(255, 255, 255, 0.1);
		color: #ccc;
		border: 1px solid rgba(255, 255, 255, 0.2);
	}

	details {
		text-align: left;
		font-size: 0.8rem;
		color: #666;
		margin-top: 1rem;
	}
	
	summary {
		cursor: pointer;
		margin-bottom: 0.5rem;
	}

	pre {
		background: rgba(0,0,0,0.2);
		padding: 0.5rem;
		border-radius: 4px;
		overflow-x: auto;
		white-space: pre-wrap;
		word-wrap: break-word;
		max-height: 200px;
		overflow-y: auto;
	}
</style>