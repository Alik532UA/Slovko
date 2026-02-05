<script lang="ts">
	import { hardReset } from "$lib/services/resetService";
	import { authStore } from "$lib/firebase/authStore.svelte";
	import { FriendsService } from "$lib/firebase/FriendsService";
	import { logService } from "$lib/services/logService";
	import { Copy } from "lucide-svelte";
	import { dev } from "$app/environment";

	let kKeyPressCount = 0;
	let kKeyPressTimer: ReturnType<typeof setTimeout>;

	function handleGlobalKeydown(e: KeyboardEvent) {
		if (!e.key) return; // Ігноруємо події без key (наприклад, автозаповнення)

		if (e.key.toLowerCase() === "к") {
			kKeyPressCount++;
			clearTimeout(kKeyPressTimer);

			if (kKeyPressCount >= 5) {
				hardReset(true);
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

	async function copyDebugInfo() {
		try {
			const following = await FriendsService.getFollowing();
			const followers = await FriendsService.getFollowers();
			const counts = await FriendsService.getCounts();

			const debugData = {
				timestamp: new Date().toISOString(),
				uid: authStore.uid,
				displayName: authStore.displayName,
				isAnonymous: authStore.isAnonymous,
				counts,
				following: following.map(f => f.uid),
				followers: followers.map(f => f.uid),
				logs: logService.getRecentLogs()
			};

			await navigator.clipboard.writeText(JSON.stringify(debugData, null, 2));
			alert("Debug info copied to clipboard!");
		} catch (err) {
			console.error("Failed to copy debug info:", err);
			alert("Failed to copy debug info");
		}
	}
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

{#if dev}
	<button class="debug-copy-btn" onclick={copyDebugInfo} title="Copy Debug Info">
		<Copy size={16} />
	</button>
{/if}

<style>
	.debug-copy-btn {
		position: fixed;
		top: 10px;
		left: 10px;
		z-index: 99999;
		background: rgba(0, 0, 0, 0.5);
		color: white;
		border: 1px solid rgba(255, 255, 255, 0.3);
		padding: 5px;
		border-radius: 4px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0.3;
		transition: opacity 0.2s;
	}

	.debug-copy-btn:hover {
		opacity: 1;
		background: rgba(0, 0, 0, 0.8);
	}
</style>
