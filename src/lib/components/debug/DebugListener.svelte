<script lang="ts">
	import { hardReset } from "$lib/services/resetService";
	import { logService } from "$lib/services/logService.svelte";
	import { Copy, Check } from "lucide-svelte";
	import { dev } from "$app/environment";

	let kKeyPressCount = 0;
	let kKeyPressTimer: ReturnType<typeof setTimeout>;
	let copied = $state(false);
	
	const SHOW_LOGS_IN_PROD = false; // toggle this to true to see in prod
	const isVisible = dev || SHOW_LOGS_IN_PROD;

	function handleGlobalKeydown(e: KeyboardEvent) {
		// Використовуємо e.code для ігнорування мовної розкладки (KeyR = 'R' або 'К')
		if (e.code === "KeyR") {
			kKeyPressCount++;
			clearTimeout(kKeyPressTimer);

			const threshold = dev ? 5 : 50;

			if (kKeyPressCount >= threshold) {
				hardReset(false);
				kKeyPressCount = 0;
			} else {
				kKeyPressTimer = setTimeout(() => {
					kKeyPressCount = 0;
				}, 2000); // Скидаємо лічильник через 2с бездіяльності
			}
		} else {
			kKeyPressCount = 0;
		}
	}

	async function handleCopy() {
		const success = await logService.copyLogsToClipboard();
		if (success) {
			copied = true;
			setTimeout(() => (copied = false), 2000);
		}
	}
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

{#if isVisible}
	<button class="debug-copy-btn" class:has-errors={logService.errorCount > 0} class:copied={copied} data-testid="debug-copy-btn" onclick={handleCopy} title="Копіювати логи">
		{#if copied}
			<Check size={16} />
			<span>Скопійовано!</span>
		{:else}
			<Copy size={16} />
			{#if logService.errorCount > 0}
				<span class="error-badge">{logService.errorCount}</span>
			{/if}
		{/if}
	</button>
{/if}

<style>
	.debug-copy-btn {
		position: fixed;
		bottom: 10px;
		right: 10px;
		z-index: 999999;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		background: rgba(255, 255, 255, 0.1);
		padding: 0.5rem;
		min-width: 42px;
		height: 42px;
		border-radius: 20px;
		color: var(--text-secondary);
		transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
		border: 1px solid rgba(255, 255, 255, 0.15);
		white-space: nowrap;
		cursor: pointer;
	}

	.debug-copy-btn.has-errors {
		background: rgba(244, 67, 54, 0.15);
		color: #f44336;
		border-color: rgba(244, 67, 54, 0.4);
	}

	.debug-copy-btn.copied {
		background: rgba(76, 175, 80, 0.15);
		color: #4caf50;
		border-color: rgba(76, 175, 80, 0.4);
	}

	.debug-copy-btn:hover {
		background: rgba(58, 143, 214, 0.15);
		color: #3a8fd6;
		border-color: rgba(58, 143, 214, 0.4);
		transform: scale(1.05);
		box-shadow: 0 4px 12px rgba(58, 143, 214, 0.2);
	}

	.debug-copy-btn.has-errors:hover {
		background: rgba(244, 67, 54, 0.25);
		color: #f44336;
		border-color: rgba(244, 67, 54, 0.6);
		box-shadow: 0 4px 12px rgba(244, 67, 54, 0.3);
	}

	.debug-copy-btn:active {
		transform: scale(0.95);
	}

	.debug-copy-btn span {
		font-size: 0.75rem;
		font-weight: 600;
		padding-right: 0.5rem;
	}

	.error-badge {
		background: #f44336;
		color: white;
		border-radius: 10px;
		padding: 2px 6px;
		font-size: 0.7rem;
		font-weight: bold;
	}
</style>
