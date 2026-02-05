<script lang="ts">
	import {
		User as UserIcon,
		Cat,
		Dog,
		Rabbit,
		Bird,
		Fish,
		Snail,
		Turtle,
		Bug,
		Smile,
		Star,
		Heart,
		Zap,
		Target,
	} from "lucide-svelte";
	import { PresenceService } from "$lib/firebase/PresenceService.svelte";
	import { authStore } from "$lib/firebase/authStore.svelte";
	import { logService } from "$lib/services/logService";

	interface Props {
		uid: string | null;
		photoURL: string | null;
		displayName?: string | null;
		size?: number;
		className?: string;
		interactive?: boolean;
		showStatus?: boolean;
	}

	let { 
		uid, 
		photoURL, 
		displayName, 
		size = 24, 
		className = "", 
		interactive = true,
		showStatus = true 
	}: Props = $props();

	const AVATAR_ICONS: Record<string, any> = {
		user: UserIcon,
		cat: Cat,
		dog: Dog,
		rabbit: Rabbit,
		bird: Bird,
		fish: Fish,
		snail: Snail,
		turtle: Turtle,
		bug: Bug,
		smile: Smile,
		star: Star,
		heart: Heart,
		zap: Zap,
		target: Target,
	};

	function getIconId(url: string | null) {
		if (url?.startsWith("internal:")) {
			return url.split(":")[1];
		}
		return "user";
	}

	function getAvatarColor(url: string | null) {
		if (url?.startsWith("internal:")) {
			return url.split(":")[2] || "var(--accent)";
		}
		return "var(--accent)";
	}

	let isInternal = $derived(photoURL?.startsWith("internal:"));
	let Icon = $derived(AVATAR_ICONS[getIconId(photoURL)] || UserIcon);
	let bgColor = $derived(getAvatarColor(photoURL));

	// Відстежуємо статус тільки якщо увімкнено показ і є UID
	$effect(() => {
		if (uid && showStatus) {
			const unsub = PresenceService.trackFriendStatus(uid);
			return () => unsub();
		}
	});

	let isOnline = $derived(uid ? PresenceService.isOnline(uid) : false);
	let isCurrentUser = $derived(uid === authStore.uid);

	function handleClick(e: MouseEvent) {
		if (interactive && uid && !isCurrentUser) {
			logService.log("interaction", `[UserAvatar] Opening menu for ${uid}`);
			e.stopPropagation();
			PresenceService.openInteractionMenu(
				uid, 
				{
					name: displayName || "Користувач",
					photoURL: photoURL
				},
				{ x: e.clientX, y: e.clientY }
			);
		}
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div 
	class="avatar-container {className}" 
	class:interactive={interactive && uid && !isCurrentUser}
	style:width="{size * 1.6}px" 
	style:height="{size * 1.6}px"
	onclick={handleClick}
	data-testid="user-avatar-container"
	data-uid={uid}
>
	{#if isInternal}
		<div class="avatar-circle" style:background-color={bgColor} data-testid="user-avatar-internal">
			<Icon size={size} color="white" />
		</div>
	{:else if photoURL}
		<img src={photoURL} alt="" class="avatar-img" data-testid="user-avatar-img" />
	{:else}
		<div class="avatar-circle fallback" data-testid="user-avatar-fallback">
			<UserIcon size={size} />
		</div>
	{/if}

	{#if showStatus && isOnline}
		<div
			class="online-indicator"
			style:width="{size / 2.5}px"
			style:height="{size / 2.5}px"
			data-testid="user-avatar-online-status"
		></div>
	{/if}
</div>

<style>
	.avatar-container {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		position: relative;
	}

	.avatar-container.interactive {
		cursor: pointer;
		transition: transform 0.2s;
	}

	.avatar-container.interactive:hover {
		transform: scale(1.1);
	}

	.avatar-container.interactive:active {
		transform: scale(0.95);
	}

	.avatar-circle {
		width: 100%;
		height: 100%;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.05);
	}

	.avatar-circle.fallback {
		background: rgba(255, 255, 255, 0.05);
		color: var(--text-secondary);
	}

	.avatar-img {
		width: 100%;
		height: 100%;
		border-radius: 12px;
		object-fit: cover;
	}

	.online-indicator {
		position: absolute;
		bottom: -2px;
		right: -2px;
		background: #2ecc71;
		border: 2px solid var(--bg-primary, #1a1a2e);
		border-radius: 50%;
		box-shadow: 0 0 8px rgba(46, 204, 113, 0.6);
		z-index: 2;
	}
</style>