<script lang="ts">
	import {
		PresenceService,
		type InteractionEvent,
	} from "$lib/firebase/PresenceService.svelte";
	import { localEventsStore } from "$lib/stores/localEventsStore.svelte";
	import { authStore } from "$lib/firebase/authStore.svelte";
	import InteractionCapsule from "./InteractionCapsule.svelte";
	import StatsModal from "../settings/StatsModal.svelte";
	import { flip } from "svelte/animate";
	import { logService } from "$lib/services/logService";

	let showStatsModal = $state(false);
	let initialTab = $state<"stats" | "leaderboard" | undefined>(undefined);

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
					logService.log(
						"interaction",
						`Action triggered for event ID: ${event.id}, type: ${event.type}, uid: ${event.uid}`,
					);
					if (event.uid === "local_system") {
						initialTab =
							event.type === "leader_gap_reached" ||
							event.type === "leader_overtaken"
								? "leaderboard"
								: "stats";
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
					logService.log(
						"ui",
						`Requested removal of interaction capsule. Event ID: ${id}, type: ${event.type}, uid: ${event.uid}`,
					);
					if (event.uid === "local_system") {
						localEventsStore.removeEvent(id);
					} else {
						PresenceService.removeInteraction(id);
					}
				}}
				onUpdateState={(
					id: string,
					state: "collapsed" | "expanded" | "sent",
				) => {
					logService.log(
						"ui",
						`Interaction state update to '${state}'. Event ID: ${id}, type: ${event.type}, uid: ${event.uid}`,
					);
					if (event.uid === "local_system") {
						localEventsStore.updateEventState(id, state);
					} else {
						PresenceService.updateInteractionState(id, state);
					}
				}}
			/>
		</div>
	{/each}
</div>

{#if showStatsModal}
	<StatsModal
		{initialTab}
		onclose={() => {
			showStatsModal = false;
			initialTab = undefined;
		}}
	/>
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
