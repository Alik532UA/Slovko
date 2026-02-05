<script lang="ts">
	import { PresenceService } from "$lib/firebase/PresenceService.svelte";
	import InteractionCapsule from "./InteractionCapsule.svelte";
	import { flip } from "svelte/animate";

	let sortedInteractions = $derived(
		[...PresenceService.interactions]
			.sort((a, b) => b.timestamp - a.timestamp)
			.slice(0, 5) // Показуємо лише 5 найсвіжіших
	);
</script>

<div class="interaction-system">
	{#each sortedInteractions as event (event.id)}
		<div class="capsule-slot" animate:flip={{ duration: 300 }}>
			<InteractionCapsule {event} />
		</div>
	{/each}
</div>

<style>
	.interaction-system {
		position: fixed;
		top: 20px;
		right: 20px;
		z-index: 10000;
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 8px; /* Відступ між сповіщеннями */
		pointer-events: none;
	}

	.capsule-slot {
		pointer-events: auto; /* Повертаємо клікабельність самим капсулам */
	}
</style>
