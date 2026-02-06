<script lang="ts">
	import { Hand, UserPlus, UserCheck, Loader2 } from "lucide-svelte";
	import { PresenceService } from "$lib/firebase/PresenceService.svelte";
	import { FriendsService } from "$lib/firebase/FriendsService";
	import { friendsStore } from "$lib/stores/friendsStore.svelte";
	import { authStore } from "$lib/firebase/authStore.svelte";
	import { _ } from "svelte-i18n";
	import { fade } from "svelte/transition";
	import { onMount, tick } from "svelte";
	import { portal } from "$lib/actions/portal";

	interface Props {
		uid: string;
		displayName: string;
		photoURL: string | null;
		onclose: () => void;
		anchorEl: HTMLElement;
	}

	let { uid, displayName, photoURL, onclose, anchorEl }: Props = $props();

	let isProcessing = $state(false);
	let isWaved = $state(false);
	let menuEl = $state<HTMLDivElement | null>(null);
	let position = $state({ top: -999, left: -999 }); // Початково ховаємо

	let isFollowing = $derived(friendsStore.isFollowing(uid));

	let canClose = $state(false);

	function updatePosition() {
		if (!anchorEl) return;
		const rect = anchorEl.getBoundingClientRect();
		
		// Якщо елемент зник або має нульові розміри (наприклад, під час ре-рендеру списку)
		if (rect.width === 0 || rect.height === 0 || rect.top === 0 && rect.bottom === 0) {
			return;
		}

		const menuWidth = 180;
		const menuHeight = 100;
		
		let top = rect.bottom + 8;
		let left = rect.left;

		// Перевірка меж екрану (flip вгору)
		if (top + menuHeight > window.innerHeight) {
			top = rect.top - menuHeight - 8;
		}
		
		// Перевірка лівої/правої меж
		if (left + menuWidth > window.innerWidth) {
			left = window.innerWidth - menuWidth - 16;
		}
		if (left < 16) left = 16;

		position = { top, left };
	}

	onMount(() => {
		tick().then(() => {
			updatePosition();
			requestAnimationFrame(updatePosition);
		});

		window.addEventListener('scroll', updatePosition, true);
		window.addEventListener('resize', updatePosition);
		
		const timer = setTimeout(() => {
			canClose = true;
		}, 100);

		return () => {
			window.removeEventListener('scroll', updatePosition, true);
			window.removeEventListener('resize', updatePosition);
			clearTimeout(timer);
		};
	});

	function handleBackdropClick(e: MouseEvent) {
		if (!canClose) return;
		e.preventDefault();
		e.stopPropagation();
		onclose();
	}

	async function handleWave(e: MouseEvent) {
		e.stopPropagation();
		if (isWaved) return;
		const senderProfile = {
			name: authStore.displayName || "Гравець",
			photoURL: authStore.photoURL
		};
		await PresenceService.sendWave(uid, senderProfile);
		isWaved = true;
		setTimeout(onclose, 1500);
	}

	async function handleFollow(e: MouseEvent) {
		e.stopPropagation();
		if (isProcessing) return;
		isProcessing = true;
		try {
			if (isFollowing) {
				await FriendsService.unfollow(uid);
			} else {
				await FriendsService.follow(uid, { 
					displayName, 
					photoURL 
				});
			}
			await friendsStore.refreshAll();
		} finally {
			isProcessing = false;
			onclose();
		}
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div use:portal>
	<div class="menu-backdrop" onclick={handleBackdropClick} data-testid="avatar-menu-backdrop"></div>

	<div 
		bind:this={menuEl}
		class="interaction-menu" 
		style:top="{position.top}px" 
		style:left="{position.left}px"
		style:visibility={position.top === -999 ? 'hidden' : 'visible'}
		transition:fade={{duration: 100}}
		data-testid="avatar-interaction-menu"
	>
		<button 
			class="menu-item" 
			onclick={handleWave} 
			disabled={isWaved}
			data-testid="avatar-menu-wave"
		>
			<div class="icon-wrapper" class:sent={isWaved}>
				{#if isWaved}
					<Hand size={18} fill="currentColor" />
				{:else}
					<Hand size={18} />
				{/if}
			</div>
			<span>{isWaved ? $_("interaction.youWaved") : $_("interaction.waveBack")}</span>
		</button>

		<button 
			class="menu-item" 
			onclick={handleFollow} 
			disabled={isProcessing}
			data-testid="avatar-menu-follow"
		>
			<div class="icon-wrapper">
				{#if isProcessing}
					<Loader2 size={18} class="spinner" />
				{:else if isFollowing}
					<UserCheck size={18} />
				{:else}
					<UserPlus size={18} />
				{/if}
			</div>
			<span>{isFollowing ? $_("friends.unfollow") : (friendsStore.isFollower(uid) ? $_("friends.followBack") : $_("friends.follow") || "Підписатися")}</span>
		</button>
	</div>
</div>

<style>
	.menu-backdrop {
		position: fixed;
		inset: 0;
		z-index: 19999; /* Трохи нижче за меню, але вище за все інше */
		background: transparent;
	}

	.interaction-menu {
		position: fixed;
		z-index: 20000;
		background: #1e1e2e;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 16px;
		padding: 6px;
		display: flex;
		flex-direction: column;
		gap: 4px;
		box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
		min-width: 180px;
		pointer-events: auto;
	}

	:global([data-theme="light-gray"]) .interaction-menu,
	:global([data-theme="green"]) .interaction-menu {
		background: white;
		border-color: rgba(0, 0, 0, 0.1);
		box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
	}

	.menu-item {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 14px;
		background: transparent;
		border: none;
		color: var(--text-primary, white);
		cursor: pointer;
		border-radius: 12px;
		font-size: 0.95rem;
		font-weight: 500;
		transition: all 0.2s;
		width: 100%;
		text-align: left;
	}

	:global([data-theme="light-gray"]) .menu-item,
	:global([data-theme="green"]) .menu-item {
		color: #333;
	}

	.menu-item:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.08);
	}

	:global([data-theme="light-gray"]) .menu-item:hover:not(:disabled),
	:global([data-theme="green"]) .menu-item:hover:not(:disabled) {
		background: rgba(0, 0, 0, 0.05);
	}

	.menu-item:disabled {
		opacity: 0.6;
		cursor: default;
	}

	.icon-wrapper {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: 10px;
		background: rgba(255, 255, 255, 0.05);
		color: var(--text-secondary);
	}

	:global([data-theme="light-gray"]) .icon-wrapper,
	:global([data-theme="green"]) .icon-wrapper {
		background: rgba(0, 0, 0, 0.03);
	}

	.icon-wrapper.sent {
		color: #2ecc71;
		background: rgba(46, 204, 113, 0.1);
	}

	.spinner {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}
</style>
