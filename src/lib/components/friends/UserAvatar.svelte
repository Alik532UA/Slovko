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

	interface Props {
		photoURL: string | null;
		size?: number;
		className?: string;
	}

	let { photoURL, size = 24, className = "" }: Props = $props();

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
</script>

<div class="avatar-container {className}" style:width="{size * 1.6}px" style:height="{size * 1.6}px">
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
</div>

<style>
	.avatar-container {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
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
</style>
