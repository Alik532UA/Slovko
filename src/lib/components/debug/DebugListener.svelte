<script lang="ts">
	import { hardReset } from "$lib/services/resetService";
	import { authStore } from "$lib/firebase/authStore.svelte";
	import { FriendsService } from "$lib/firebase/FriendsService";
	import { logService } from "$lib/services/logService";
	import { Copy } from "lucide-svelte";
	import { dev } from "$app/environment";

	let kKeyPressCount = 0;
	let kKeyPressTimer: ReturnType<typeof setTimeout>;
	let copied = $state(false);

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
		const logs = logService.getRecentLogs();
		const header = `--- SLOVKO DEBUG LOG (MANUAL COPY VIA BUTTON) ---\n` + 
					 `Generated: ${new Date().toLocaleString()}\n` +
					 `-----------------------------------------------\n\n`;
		await navigator.clipboard.writeText(header + logs);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

{#if dev}
	<button class="debug-copy-btn" data-testid="debug-copy-btn" onclick={handleCopy} title="Копіювати логи">
		<Copy size={16} />
		{#if copied}<span>Скопійовано!</span>{/if}
	</button>
{/if}

<style>
	.debug-copy-btn {
		position: fixed;
		bottom: 10px;
		right: 10px;
		z-index: 999999;
		background: rgba(0, 0, 0, 0.7);
		color: white;
		border: 1px solid rgba(255, 255, 255, 0.2);
		padding: 8px 12px;
		border-radius: 8px;
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
		cursor: pointer;
		font-family: monospace;
		transition: all 0.2s;
	}
	.debug-copy-btn:hover {
		background: rgba(0, 0, 0, 0.9);
		border-color: rgba(255, 255, 255, 0.4);
	}
</style>
