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
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

<style>
</style>
