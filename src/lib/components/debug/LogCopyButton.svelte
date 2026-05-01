<script lang="ts">
	import { dev } from "$app/environment";
	import { logService } from "$lib/services/logService.svelte";
	import { hardReset } from "$lib/services/resetService";
	import { Check } from "lucide-svelte";

	let copied = $state(false);
	
	// Кнопка видима ТІЛЬКИ у dev-режимі І ТІЛЬКИ коли є зареєстровані помилки
	const isVisible = $derived(dev && logService.errorCount > 0);

	// Логіка Hard Reset (залишаємо для dev)
	let kKeyPressCount = 0;
	let kKeyPressTimer: ReturnType<typeof setTimeout>;

	function handleGlobalKeydown(e: KeyboardEvent) {
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
				}, 2000);
			}
		} else {
			kKeyPressCount = 0;
		}
	}

	async function handleCopy() {
		const success = await logService.copyLogsToClipboard();
		if (success) {
			copied = true;
			setTimeout(() => (copied = false), 1500);
		}
	}
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

{#if isVisible}
	<button 
		class="log-fab" 
		class:copied={copied}
		onclick={handleCopy} 
		title="Копіювати звіт про помилки"
		aria-label="Copy debug logs"
	>
		{#if copied}
			<Check size={18} />
		{:else}
			<span class="error-count">{logService.errorCount > 99 ? '!' : logService.errorCount}</span>
		{/if}
	</button>
{/if}

<style>
	.log-fab {
		position: fixed;
		bottom: 16px;
		left: 16px;
		z-index: 9999;
		
		display: flex;
		align-items: center;
		justify-content: center;
		
		/* Стандарт V5: 32px desktop, 24px mobile (реалізовано через clamp/media) */
		width: 32px;
		height: 32px;
		
		background: #f44336;
		color: white;
		border: none;
		border-radius: 50%;
		cursor: pointer;
		
		box-shadow: 0 4px 12px rgba(244, 67, 54, 0.4);
		transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
		padding: 0;
	}

	@media (max-width: 640px) {
		.log-fab {
			width: 24px;
			height: 24px;
			bottom: 12px;
			left: 12px;
		}
	}

	.log-fab:hover {
		transform: scale(1.1);
		background: #d32f2f;
	}

	.log-fab.copied {
		background: #4caf50;
		box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
	}

	.error-count {
		font-size: 0.75rem;
		font-weight: 800;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
	}

	@media (max-width: 640px) {
		.error-count {
			font-size: 0.65rem;
		}
	}
</style>
