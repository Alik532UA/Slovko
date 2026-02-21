<script lang="ts">
	import {
		PresenceService,
		type InteractionEvent,
	} from "$lib/firebase/PresenceService.svelte";
	import { localEventsStore } from "$lib/stores/localEventsStore.svelte";
	import { authStore } from "$lib/firebase/authStore.svelte";
	import InteractionCapsule from "./InteractionCapsule.svelte";
	import ProfileModal from "../settings/ProfileModal.svelte";
	import { flip } from "svelte/animate";

	let showStatsModal = $state(false);

	let sortedInteractions = $derived(
		(
			[
				...PresenceService.interactions,
				...localEventsStore.events,
			] as InteractionEvent[]
		)
			.sort((a, b) => b.timestamp - a.timestamp)
			.slice(0, 5), // Показуємо лише 5 найсвіжіших
	);
</script>

<div class="interaction-system" data-testid="interaction-system">
	{#each sortedInteractions as event (event.id)}
		<div
			class="capsule-slot"
			animate:flip={{ duration: 300 }}
			data-testid="interaction-slot-{event.type}"
		>
			<InteractionCapsule
				{event}
				onAction={async () => {
					if (event.type === "daily_goal_reached") {
						showStatsModal = true;
					} else if (event.type === "new_follower") {
						const { FriendsService } =
							await import("$lib/firebase/FriendsService");
						await FriendsService.follow(event.uid, {
							displayName: event.profile.name,
							photoURL: event.profile.photoURL,
						});
					} else {
						const senderProfile = {
							name: authStore.displayName || "Гравець",
							photoURL: authStore.photoURL,
						};
						PresenceService.sendWave(event.uid, senderProfile, event.id);
					}
				}}
				onRemove={(id: string) => {
					if (event.type === "daily_goal_reached") {
						localEventsStore.removeEvent(id);
					} else {
						PresenceService.removeInteraction(id);
					}
				}}
				onUpdateState={(
					id: string,
					state: "collapsed" | "expanded" | "sent",
				) => {
					if (event.type !== "daily_goal_reached") {
						PresenceService.updateInteractionState(id, state);
					}
				}}
			/>
		</div>
	{/each}
</div>

{#if showStatsModal}
	<ProfileModal mode="stats" onclose={() => (showStatsModal = false)} />
{/if}

<style>
	.interaction-system {
		position: fixed;
		top: 20px;
		right: 20px;
		z-index: 10200;
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
