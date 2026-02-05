<script lang="ts">
	import { PresenceService } from "$lib/firebase/PresenceService.svelte";
	import { authStore } from "$lib/firebase/authStore.svelte";
	import UserAvatar from "../friends/UserAvatar.svelte";
	import { fade, scale } from "svelte/transition";
	import { Hand, X } from "lucide-svelte";

	function handleWave() {
		if (PresenceService.activeTargetUid && PresenceService.activeTargetProfile) {
			const senderProfile = {
				name: authStore.displayName || "Гравець",
				photoURL: authStore.photoURL
			};
			PresenceService.sendWave(PresenceService.activeTargetUid, senderProfile);
			PresenceService.closeInteractionMenu();
		}
	}

	function close() {
		PresenceService.closeInteractionMenu();
	}
</script>

{#if PresenceService.activeTargetUid && PresenceService.activeTargetProfile}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="modal-backdrop" transition:fade={{ duration: 200 }} onclick={close}>
		<div 
			class="menu-card" 
			transition:scale={{ duration: 200, start: 0.95 }} 
			onclick={(e) => e.stopPropagation()}
		>
			<button class="close-btn" onclick={close} aria-label="Закрити">
				<X size={20} />
			</button>

			<div class="user-header">
				<UserAvatar 
					uid={PresenceService.activeTargetUid} 
					photoURL={PresenceService.activeTargetProfile.photoURL} 
					size={48} 
				/>
				<h3>{PresenceService.activeTargetProfile.name}</h3>
				<span class="status-badge" class:online={PresenceService.isOnline(PresenceService.activeTargetUid)}>
					{PresenceService.isOnline(PresenceService.activeTargetUid) ? "В мережі" : "Поза мережею"}
				</span>
			</div>

			<div class="actions">
				<button class="action-btn wave" onclick={handleWave}>
					<Hand size={20} />
					<span>Помахати</span>
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.6);
		backdrop-filter: blur(4px);
		z-index: 2000;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 20px;
	}

	.menu-card {
		background: var(--bg-secondary, #2a2a40);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 24px;
		width: 100%;
		max-width: 320px;
		padding: 24px;
		position: relative;
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
		color: white;
	}

	.close-btn {
		position: absolute;
		top: 16px;
		right: 16px;
		background: none;
		border: none;
		color: var(--text-secondary, #a0a0a0);
		cursor: pointer;
		padding: 4px;
	}

	.user-header {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		margin-bottom: 24px;
		text-align: center;
	}

	h3 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
	}

	.status-badge {
		font-size: 0.75rem;
		padding: 4px 10px;
		border-radius: 12px;
		background: rgba(255, 255, 255, 0.1);
		color: var(--text-secondary, #a0a0a0);
	}

	.status-badge.online {
		background: rgba(46, 204, 113, 0.2);
		color: #2ecc71;
	}

	.actions {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.action-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12px;
		padding: 14px;
		border-radius: 16px;
		border: none;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: transform 0.2s, background 0.2s;
	}

	.action-btn:active {
		transform: scale(0.98);
	}

	.action-btn.wave {
		background: var(--accent, #3a8fd6);
		color: white;
	}

	.action-btn.wave:hover {
		background: #4a9fe6;
	}
</style>
