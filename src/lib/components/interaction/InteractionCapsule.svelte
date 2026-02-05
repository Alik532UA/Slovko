<script lang="ts">
	import { PresenceService, type InteractionEvent } from "$lib/firebase/PresenceService.svelte";
	import { authStore } from "$lib/firebase/authStore.svelte";
	import { logService } from "$lib/services/logService";
	import UserAvatar from "../friends/UserAvatar.svelte";
	import { fade, slide, scale } from "svelte/transition";
	import { Hand, Check } from "lucide-svelte";
	import { dev } from "$app/environment";
	import { onMount } from "svelte";

	interface Props {
		event: InteractionEvent;
	}

	let { event }: Props = $props();
	let timer: NodeJS.Timeout;

	function handleWave(e: MouseEvent) {
		e.stopPropagation();
		const senderProfile = {
			name: authStore.displayName || "Гравець",
			photoURL: authStore.photoURL
		};
		PresenceService.sendWave(event.uid, senderProfile, event.id);
		
		// Закриваємо через 2 секунди після махання
		if (timer) clearTimeout(timer);
		timer = setTimeout(() => {
			PresenceService.removeInteraction(event.id);
		}, 2000);
	}

	function toggleExpand() {
		if (event.state === 'collapsed') {
			PresenceService.updateInteractionState(event.id, 'expanded');
		} else if (event.state === 'expanded' && event.type === 'manual_menu') {
			PresenceService.updateInteractionState(event.id, 'collapsed');
		}
	}

	onMount(() => {
		const displayTime = dev ? 55000 : 10000;
		const id = event.id; // Фіксуємо ID для замикання
		
		timer = setTimeout(() => {
			logService.log("interaction", `Auto-removing interaction: ${id}`);
			PresenceService.removeInteraction(id);
		}, displayTime);

		return () => {
			if (timer) clearTimeout(timer);
		};
	});
</script>

<div 
	class="capsule-container" 
	class:expanded={event.state !== 'collapsed'}
	class:sent={event.state === 'sent'}
	transition:scale={{ duration: 200, start: 0.8 }}
>
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="interactive-area" onclick={toggleExpand}>
		
		{#if event.state !== 'collapsed'}
			<div class="content-panel" transition:slide={{ axis: 'x', duration: 250 }}>
				<div class="text-block">
					<span class="nickname">{event.profile.name}</span>
					<span class="status-text">
						{event.state === 'sent' ? 'Ви помахали!' : (event.type === 'incoming_wave' ? 'махає тобі!' : 'помахати?')}
					</span>
				</div>

				{#if event.state === 'sent'}
					<div class="sent-indicator" transition:scale>
						<Check size={18} />
					</div>
				{:else}
					<button class="wave-btn" onclick={handleWave} aria-label="Помахати">
						<Hand size={18} />
					</button>
				{/if}
			</div>
		{/if}

		<div class="avatar-anchor">
			<UserAvatar 
				uid={event.uid} 
				photoURL={event.profile.photoURL} 
				size={40} 
				interactive={false}
				showStatus={event.type === 'online' || event.state === 'collapsed'}
			/>
		</div>
	</div>
</div>

<style>
	.capsule-container {
		display: flex;
		justify-content: flex-end;
		pointer-events: auto;
	}

	.interactive-area {
		display: flex;
		align-items: center;
		flex-direction: row; /* Текст зліва, аватар справа */
		background: rgba(30, 30, 46, 0.95);
		backdrop-filter: blur(12px);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 12px;
		padding: 4px;
		cursor: pointer;
		box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		max-width: fit-content;
	}

	/* У згорнутому стані робимо фон мінімальним або взагалі прибираємо рамку */
	.capsule-container:not(.expanded) .interactive-area {
		background: transparent;
		border-color: transparent;
		box-shadow: none;
		padding: 0;
	}

	.avatar-anchor {
		flex-shrink: 0;
		z-index: 2;
	}

	.content-panel {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 0 12px 0 16px;
		overflow: hidden;
	}

	.text-block {
		display: flex;
		flex-direction: column;
		line-height: 1.2;
	}

	.nickname {
		font-weight: 700;
		font-size: 0.85rem;
		color: white;
		white-space: nowrap;
	}

	.status-text {
		font-size: 0.7rem;
		color: rgba(255, 255, 255, 0.6);
		white-space: nowrap;
	}

	.wave-btn {
		background: var(--accent, #3a8fd6);
		color: white;
		border: none;
		border-radius: 50%;
		width: 34px;
		height: 34px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: transform 0.2s, background 0.2s;
		flex-shrink: 0;
	}

	.wave-btn:hover {
		transform: scale(1.1);
		background: #4a9fe6;
	}

	.sent-indicator {
		color: #2ecc71;
		width: 34px;
		height: 34px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.sent .interactive-area {
		border-color: rgba(46, 204, 113, 0.5);
	}
</style>