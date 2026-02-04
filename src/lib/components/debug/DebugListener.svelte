<script lang="ts">
	import { hardReset } from "$lib/services/resetService";

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
</script>

<svelte:window onkeydown={handleGlobalKeydown} />
