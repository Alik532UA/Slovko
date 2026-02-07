<script lang="ts">
	import { _ } from "svelte-i18n";
	import { base } from "$app/paths";
	import {
		User,
		Edit2,
		Check,
		X,
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
	import { authStore } from "../../firebase/authStore.svelte";
	import { friendsStore } from "../../stores/friendsStore.svelte";
	import { logService } from "../../services/logService";

	interface Props {
		oneditAvatar: () => void;
	}

	let { oneditAvatar }: Props = $props();

	let isEditingName = $state(false);
	let editedName = $state("");

	const followingCount = $derived(friendsStore.followingCount);
	const followersCount = $derived(friendsStore.followersCount);

	const AVATAR_ICONS: Record<string, any> = {
		user: User,
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

	function getIconComponent(iconId: string) {
		return AVATAR_ICONS[iconId] || User;
	}

	function startEditingName() {
		editedName =
			authStore.displayName || authStore.email?.split("@")[0] || "User";
		isEditingName = true;
	}

	async function saveName() {
		if (!editedName.trim()) return;
		try {
			await authStore.updateProfile(editedName);
			isEditingName = false;
		} catch (e) {
			logService.error("profile", "Failed to update name", e);
		}
	}
</script>

<div class="header" data-testid="profile-header">
	<button
		class="avatar-wrapper-btn"
		onclick={oneditAvatar}
		type="button"
		data-testid="edit-avatar-trigger"
	>
		{#if authStore.photoURL?.startsWith("internal:")}
			{@const parts = authStore.photoURL.split(":")}
			{@const iconId = parts[1]}
			{@const rawColor = parts[2]}
			{@const Icon = iconId === "none" ? null : getIconComponent(iconId)}
			{@const isFlag = rawColor?.startsWith("flag-")}
			<div
				class="avatar email-user"
				style:background-color={isFlag ? "transparent" : rawColor}
				data-testid="profile-avatar-email"
			>
				{#if isFlag}
					{@const lang = rawColor.replace("flag-", "")}
					<div class="flag-bg-wrapper">
						<img src="{base}/flags/{lang}.svg" alt={lang} class="flag-bg-img" />
					</div>
				{/if}
				{#if Icon}
					<Icon size={72} color="white" />
				{/if}
			</div>
		{:else if authStore.photoURL}
			<img
				src={authStore.photoURL}
				alt=""
				class="avatar"
				data-testid="profile-avatar-img"
			/>
		{:else}
			<div class="avatar email-user" data-testid="profile-avatar-default">
				<User size={72} />
			</div>
		{/if}
		<div class="edit-overlay">
			<Edit2 size={16} />
		</div>
	</button>

	<div class="user-info">
		{#if isEditingName}
			<div class="edit-name-wrapper">
				<input
					type="text"
					bind:value={editedName}
					class="name-input"
					data-testid="profile-name-input"
					onkeydown={(e) => {
						if (e.key === "Enter") saveName();
						if (e.key === "Escape") isEditingName = false;
					}}
				/>
				<div class="edit-actions">
					<button
						class="icon-action-btn save"
						onclick={saveName}
						data-testid="save-name-btn"
					>
						<Check size={20} />
					</button>
					<button
						class="icon-action-btn cancel"
						onclick={() => (isEditingName = false)}
						data-testid="cancel-name-btn"
					>
						<X size={20} />
					</button>
				</div>
			</div>
		{:else}
			<div class="name-row">
				<h2>
					{authStore.displayName || authStore.email?.split("@")[0] || "User"}
				</h2>
				<button
					class="edit-name-btn"
					onclick={startEditingName}
					data-testid="start-edit-name-btn"
				>
					<Edit2 size={16} />
				</button>
			</div>
		{/if}
		<p>{authStore.email}</p>

		<!-- Social Counts -->
		<div class="social-counts" data-testid="profile-social-counts">
			<span class="count-item" data-testid="following-count">
				<span class="count-val">{followingCount}</span>
				<span class="count-lbl"
					>{$_("friends.following", {
						default: "Підписки",
					})}</span
				>
			</span>
			<span class="divider">•</span>
			<span class="count-item" data-testid="followers-count">
				<span class="count-val">{followersCount}</span>
				<span class="count-lbl"
					>{$_("friends.followers", {
						default: "Підписники",
					})}</span
				>
			</span>
		</div>
	</div>
</div>

<style>
	.header {
		display: flex;
		align-items: center;
		gap: 1.5rem;
		margin-bottom: 2rem;
	}

	@media (max-width: 480px) {
		.header {
			gap: 1rem;
			margin-bottom: 1.5rem;
		}
	}

	.avatar {
		width: 80px;
		height: 80px;
		border-radius: 24px;
		object-fit: cover;
		background: var(--bg-primary);
		display: flex;
		align-items: center;
		justify-content: center;
		border: 2px solid var(--border);
		flex-shrink: 0;
		position: relative;
		overflow: hidden;
	}

	.flag-bg-wrapper {
		position: absolute;
		inset: 0;
		z-index: 0;
	}

	.flag-bg-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.avatar :global(svg) {
		position: relative;
		z-index: 1;
		filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4));
	}

	@media (max-width: 480px) {
		.avatar {
			width: 64px;
			height: 64px;
			border-radius: 18px;
		}
	}

	.user-info h2 {
		margin: 0;
		font-size: 1.5rem;
		line-height: 1.2;
	}
	.user-info p {
		margin: 0.2rem 0 0;
		color: var(--text-secondary);
		font-size: 0.9rem;
		word-break: break-all;
	}

	@media (max-width: 480px) {
		.user-info h2 {
			font-size: 1.2rem;
		}
		.user-info p {
			font-size: 0.8rem;
		}
	}

	.social-counts {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 0.5rem;
		font-size: 0.85rem;
		color: var(--text-secondary);
	}

	.count-item {
		display: flex;
		gap: 0.3rem;
	}

	.count-val {
		font-weight: 700;
		color: var(--text-primary);
	}

	.divider {
		opacity: 0.5;
	}

	.avatar-wrapper-btn {
		position: relative;
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		border-radius: 20px;
		transition: transform 0.2s;
		overflow: hidden;
	}

	.avatar-wrapper-btn:hover {
		transform: scale(1.05);
	}
	.avatar-wrapper-btn:hover .edit-overlay {
		opacity: 1;
	}

	.edit-overlay {
		position: absolute;
		bottom: 0;
		right: 0;
		background: var(--accent);
		color: white;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		display: flex;
		justify-content: center;
		align-items: center;
		opacity: 0;
		transition: opacity 0.2s;
		border: 2px solid var(--bg-primary);
	}

	.name-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.edit-name-btn {
		background: transparent;
		color: var(--text-secondary);
		padding: 0.2rem;
		display: flex;
		align-items: center;
		opacity: 0.6;
		transition: all 0.2s;
	}

	.edit-name-btn:hover {
		color: var(--accent);
		opacity: 1;
	}

	.edit-name-wrapper {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
	}

	.name-input {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid var(--border);
		color: var(--text-primary);
		padding: 0.4rem 0.8rem;
		border-radius: 8px;
		font-size: 1.1rem;
		font-weight: 600;
		width: 100%;
		max-width: 200px;
	}

	.name-input:focus {
		outline: none;
		border-color: var(--accent);
	}

	.edit-actions {
		display: flex;
		gap: 0.2rem;
	}

	.icon-action-btn {
		background: transparent;
		padding: 0.4rem;
		border-radius: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.2s;
	}

	.icon-action-btn:hover {
		background: rgba(255, 255, 255, 0.1);
	}
	.icon-action-btn.save {
		color: #4caf50;
	}
	.icon-action-btn.cancel {
		color: #f44336;
	}
</style>
