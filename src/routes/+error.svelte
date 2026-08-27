<script lang="ts">
	/**
	 * +error.svelte - Global Error Boundary
	 * Shows when a fatal error occurs during rendering or loading.
	 * Includes debug logs copy functionality.
	 */
	import { page } from "$app/state";
	import { logService } from "$lib/services/logService.svelte";
	import { onMount } from "svelte";
	import { _, isLoading, locale } from "svelte-i18n";
	import { dictionaryReady } from "$lib/i18n/dictionaryReady";
	import { AlertTriangle, Check, Copy, RotateCcw } from "lucide-svelte";

	let logsCopied = $state(false);
	let logs = $state("");
	/** Текст звіту показується полем, коли буфер обміну відмовив. */
	let copyFallback = $state<string | null>(null);

	onMount(() => {
		// Capture logs immediately when error page mounts
		try {
			logs = logService.getRecentLogs();
		} catch {
			logs = "Failed to retrieve logs.";
		}
	});

	/**
	 * Ця сторінка показується, коли зламалося, — зокрема тоді, коли не доїхав
	 * словник. Чому охорона саме `dictionaryReady`, а не `!$isLoading`, —
	 * у самій функції: інакше `$_` кинув би, і замість повідомлення про
	 * поломку лишилася б порожня сторінка.
	 */
	const text = $derived.by(() => {
		const fallback = {
			title: "Something went wrong",
			code: `Error ${page.status}`,
			unexpected: "An unexpected error occurred.",
			reload: "Reload",
			copy: "Copy report",
			copied: "Copied",
			technical: "Technical details",
			copyFailed: "Clipboard unavailable — select the text below and copy it manually",
		};
		if (!dictionaryReady($locale, $isLoading)) return fallback;
		try {
			return {
				title: $_("common.error.oops"),
				code: $_("errors.page.code", { values: { status: page.status } }),
				unexpected: $_("errors.page.unexpected"),
				reload: $_("startup.reload"),
				copy: $_("common.copyReport"),
				copied: $_("common.copied"),
				technical: $_("errors.page.technical"),
				copyFailed: $_("startup.copyFailed"),
			};
		} catch {
			return fallback;
		}
	});

	function report(): string {
		return `
ERROR: ${page.status}
MESSAGE: ${page.error?.message || "Unknown error"}
URL: ${page.url.href}
UA: ${navigator.userAgent}
----------------------------------------
LOGS:
${logs}
`;
	}

	async function copyLogs() {
		const errorInfo = report();

		try {
			await navigator.clipboard.writeText(errorInfo);
			logsCopied = true;
			copyFallback = null;
			setTimeout(() => (logsCopied = false), 2000);
		} catch (err) {
			logService.error("debug", "Failed to copy logs:", err);
			/*
			 * Доти тут стояв `alert("… Check console.")`. Порада відкрити консоль
			 * на телефоні не виконується взагалі, а звіт — єдине, заради чого ця
			 * сторінка має кнопки: без нього лишається сам факт «щось зламалось».
			 * Тепер текст показується полем — виділити й скопіювати можна завжди.
			 */
			copyFallback = errorInfo;
		}
	}

	function reload() {
		window.location.reload();
	}
</script>

<div class="error-page">
	<div class="error-container">
		<div class="icon" aria-hidden="true"><AlertTriangle size={64} /></div>
		<h1>{text.title}</h1>
		<p class="status">{text.code}</p>

		<!-- Optional Chaining for error message -->
		<p class="message">{page.error?.message || text.unexpected}</p>

		<div class="actions">
			<button class="primary-btn" data-testid="error-reload-btn" onclick={reload}>
				<RotateCcw size={18} aria-hidden="true" />
				{text.reload}
			</button>

			<button class="secondary-btn" data-testid="error-copy-btn" onclick={copyLogs}>
				{#if logsCopied}
					<Check size={18} aria-hidden="true" />
					{text.copied}
				{:else}
					<Copy size={18} aria-hidden="true" />
					{text.copy}
				{/if}
			</button>
		</div>

		{#if copyFallback}
			<p class="copy-failed">{text.copyFailed}</p>
			<textarea class="copy-fallback" data-testid="error-report-text" readonly rows="8"
				>{copyFallback}</textarea
			>
		{/if}

		<details>
			<summary>{text.technical}</summary>
			<pre>{JSON.stringify(page.error, null, 2)}</pre>
		</details>
	</div>
</div>

<style>
	.error-page {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 100dvh;
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
		display: flex;
		justify-content: center;
		color: var(--status-warning);
		margin-bottom: 1.5rem;
	}

	.copy-failed {
		margin: 1rem 0 0;
		color: var(--text-secondary);
		font-size: 0.85rem;
		text-align: left;
	}

	.copy-fallback {
		width: 100%;
		margin-top: 0.5rem;
		padding: 0.75rem;
		border-radius: 12px;
		border: 1px solid var(--glass-border);
		background: var(--bg-active);
		color: var(--text-secondary);
		font-family: monospace;
		font-size: 0.75rem;
		resize: vertical;
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
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
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