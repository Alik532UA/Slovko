<script lang="ts">
	import { PresenceService } from "$lib/firebase/PresenceService.svelte";
	import UserAvatar from "../friends/UserAvatar.svelte";
	import { fade, fly } from "svelte/transition";
	import { Hand } from "lucide-svelte";
	import { onMount } from "svelte";

	let visible = $state(false);
	let timer: NodeJS.Timeout;

	// Слідкуємо за новим сигналом
	$effect(() => {
		if (PresenceService.latestSignal) {
			showBubble();
		}
	});

	function showBubble() {
		visible = true;
		if (timer) clearTimeout(timer);
		
		timer = setTimeout(() => {
			dismiss();
		}, 5000);
	}

	function dismiss() {
		visible = false;
		// Чекаємо завершення анімації перед очищенням даних, якщо потрібно
		setTimeout(() => {
			if (!visible) PresenceService.clearSignal();
		}, 500);
	}

	function handleClick() {
		if (PresenceService.latestSignal) {
			PresenceService.openInteractionMenu(
				PresenceService.latestSignal.fromUid,
				{
					name: PresenceService.latestSignal.fromName,
					photoURL: PresenceService.latestSignal.fromPhoto
				}
			);
		}
		dismiss();
	}
</script>

{#if visible && PresenceService.latestSignal}
	<button 
		class="interaction-bubble" 
		transition:fly={{ y: -20, duration: 300 }} 
		onclick={handleClick}
		aria-label="Взаємодія від {PresenceService.latestSignal.fromName}"
	>
		<div class="avatar-wrapper">
			<UserAvatar 
				uid={PresenceService.latestSignal.fromUid} 
				photoURL={PresenceService.latestSignal.fromPhoto} 
				size={36} 
			/>
			<div class="icon-badge">
				<Hand size={14} color="white" />
			</div>
		</div>
		
		<div class="content">
			<span class="name">{PresenceService.latestSignal.fromName}</span>
			<span class="action">махає тобі!</span>
		</div>
	</button>
{/if}

<style>
	.interaction-bubble {
		position: fixed;
		top: 80px; /* Відступ від хедера */
		left: 20px;
		z-index: 1000;
		display: flex;
		align-items: center;
		gap: 12px;
		background: rgba(30, 30, 46, 0.95);
		backdrop-filter: blur(8px);
		border: 1px solid rgba(255, 255, 255, 0.1);
		padding: 8px 16px 8px 8px;
		border-radius: 30px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
		cursor: pointer;
		transition: transform 0.2s, background 0.2s;
		color: white;
		text-align: left;
	}

	.interaction-bubble:hover {
		transform: translateY(2px);
		background: rgba(40, 40, 60, 0.98);
	}

	.avatar-wrapper {
		position: relative;
	}

	.icon-badge {
		position: absolute;
		bottom: -2px;
		right: -4px;
		background: #ffb700; /* Жовтий для "хвилі" */
		border-radius: 50%;
		padding: 3px;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 2px solid rgba(30, 30, 46, 1);
		animation: wave 1s infinite;
	}

	.content {
		display: flex;
		flex-direction: column;
		line-height: 1.2;
	}

	.name {
		font-weight: 600;
		font-size: 0.9rem;
	}

	.action {
		font-size: 0.75rem;
		opacity: 0.7;
	}

	@keyframes wave {
		0%, 100% { transform: rotate(0deg); }
		25% { transform: rotate(-15deg); }
		75% { transform: rotate(15deg); }
	}
</style>
