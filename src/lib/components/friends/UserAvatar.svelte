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

	interface Props {
		uid: string | null;
		photoURL: string | null;
		size?: number;
		className?: string;
	}

	let { uid, photoURL, size = 24, className = "" }: Props = $props();

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

	// Відстежуємо статус, якщо є UID
	$effect(() => {
		if (uid) {
			PresenceService.trackFriendStatus(uid);
		}
	});

	let isOnline = $derived(uid ? PresenceService.isOnline(uid) : false);
</script>

<div
	class="avatar-container {className}"
	style:width="{size * 1.6}px"
	style:height="{size * 1.6}px"
>
	{#if isInternal}
		<div class="avatar-circle" style:background-color={bgColor}>
			<Icon size={size} color="white" />
		</div>
	{:else if photoURL}
		<img src={photoURL} alt="" class="avatar-img" />
	{:else}
		<div class="avatar-circle fallback">
			<UserIcon size={size} />
		</div>
	{/if}

	{#if isOnline}
		<div
			class="online-indicator"
			style:width="{size / 2.5}px"
			style:height="{size / 2.5}px"
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