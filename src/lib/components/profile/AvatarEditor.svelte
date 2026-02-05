<script lang="ts">
	import { _ } from "svelte-i18n";
	import { User, Check, X, Ban } from "lucide-svelte";
	import {
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
	import { logService } from "../../services/logService";
	import { THEME_COLORS } from "../../config/colors";
	import { untrack } from "svelte";
	import { authStore } from "../../firebase/authStore.svelte";
	import { LANGUAGES } from "../../i18n/init";
	import { base } from "$app/paths";

	interface Props {
		initialIcon: string;
		initialColor: string;
		onsave: (icon: string, color: string) => void;
		oncancel: () => void;
	}

	let { initialIcon, initialColor, onsave, oncancel }: Props = $props();

	let selectedIcon = $state("");
	let selectedColor = $state("");

	// Sync when props are available or change
	$effect(() => {
		const icon = initialIcon;
		const color = initialColor;
		untrack(() => {
			selectedIcon = icon;
			selectedColor = color;
		});
	});

	const AVATAR_ICONS = [
		{ id: "none", component: null },
		{ id: "user", component: User },
		{ id: "cat", component: Cat },
		{ id: "dog", component: Dog },
		{ id: "rabbit", component: Rabbit },
		{ id: "bird", component: Bird },
		{ id: "fish", component: Fish },
		{ id: "snail", component: Snail },
		{ id: "turtle", component: Turtle },
		{ id: "bug", component: Bug },
		{ id: "smile", component: Smile },
		{ id: "star", component: Star },
		{ id: "heart", component: Heart },
		{ id: "zap", component: Zap },
		{ id: "target", component: Target },
	];

	function handleSave() {
		logService.log("profile", "saveAvatar:", {
			selectedIcon,
			selectedColor,
		});
		onsave(selectedIcon, selectedColor);
	}

	const Icon = $derived(
		AVATAR_ICONS.find((i) => i.id === selectedIcon)?.component || null,
	);
</script>

<div class="avatar-editor-modal" data-testid="avatar-editor-modal">
	<div class="header" data-testid="avatar-editor-header">
		<h2 style="text-align: center; width: 100%; margin: 0;">
			{$_("profile.editAvatarTitle", { default: "Редагування аватара" })}
		</h2>
	</div>

	<div class="avatar-editor" data-testid="avatar-editor-container">
		<div
			class="avatar email-user preview-avatar"
			style:background-color={selectedColor.startsWith("flag-") || selectedColor === "google" ? "transparent" : selectedColor}
			data-testid="profile-preview-avatar"
		>
			{#if selectedColor === "google" && authStore.originalPhotoURL}
				<img
					src={authStore.originalPhotoURL}
					alt=""
					class="google-preview-img"
				/>
			{:else if selectedColor.startsWith("flag-")}
				{@const lang = selectedColor.replace("flag-", "")}
				<div class="flag-bg-wrapper">
					<img src="{base}/flags/{lang}.svg" alt={lang} class="flag-bg-img" />
					<div class="overlay-dim"></div>
				</div>
				{#if Icon}
					<Icon size={86} color="white" />
				{/if}
			{:else}
				{#if Icon}
					<Icon size={86} color="white" />
				{/if}
			{/if}
		</div>

		<div class="color-picker-grid" data-testid="color-picker-grid">
			{#if authStore.originalPhotoURL}
				<button
					class="color-btn google-btn"
					class:selected={selectedColor === "google"}
					onclick={() => {
						selectedColor = "google";
						selectedIcon = "user";
					}}
					aria-label="Google Profile Picture"
					data-testid="color-btn-google"
				>
					<img src={authStore.originalPhotoURL} alt="" class="google-btn-img" />
				</button>
			{/if}

			{#each LANGUAGES as lang (lang)}
				<button
					class="color-btn flag-btn-choice"
					class:selected={selectedColor === `flag-${lang}`}
					onclick={() => (selectedColor = `flag-${lang}`)}
					aria-label="Flag {lang}"
					data-testid="color-btn-flag-{lang}"
				>
					<img src="{base}/flags/{lang}.svg" alt={lang} class="flag-choice-img" />
				</button>
			{/each}

			{#each THEME_COLORS as color (color)}
				<button
					class="color-btn"
					style="background-color: {color === 'transparent'
						? 'rgba(255,255,255,0.1)'
						: color}"
					class:selected={selectedColor === color}
					onclick={() => {
						selectedColor = color;
						if (selectedIcon === "google") selectedIcon = "user";
					}}
					aria-label={color}
					data-testid="color-btn-{color}"
				></button>
			{/each}
		</div>

		<div class="icon-picker-grid" data-testid="icon-picker-grid">
			{#each AVATAR_ICONS as { id, component: IconComp } (id)}
				<button
					class="icon-btn"
					class:selected={selectedIcon === id}
					style:background-color={selectedColor.startsWith("flag-") || selectedColor === "google" ? "transparent" : selectedColor}
					onclick={() => (selectedIcon = id)}
					data-testid="icon-btn-{id}"
				>
					{#if selectedColor.startsWith("flag-")}
						{@const lang = selectedColor.replace("flag-", "")}
						<div class="flag-bg-wrapper">
							<img src="{base}/flags/{lang}.svg" alt={lang} class="flag-bg-img" />
							<div class="overlay-dim"></div>
						</div>
					{/if}
					
					{#if IconComp}
						<IconComp size={36} color={selectedColor === "" || selectedColor === "transparent" ? "currentColor" : "white"} />
					{/if}
				</button>
			{/each}
		</div>

		<div class="edit-actions" style="margin-top: 1rem;">
			<button
				class="icon-action-btn save"
				onclick={handleSave}
				data-testid="avatar-editor-save-btn"
			>
				<Check size={20} />
			</button>
			<button
				class="icon-action-btn cancel"
				onclick={oncancel}
				data-testid="avatar-editor-cancel-btn"
			>
				<X size={20} />
			</button>
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

	.avatar-editor {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
	}

	.avatar {
		width: 120px;
		height: 120px;
		border-radius: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 3px solid var(--border);
		position: relative;
		overflow: hidden;
	}

	.avatar.email-user {
		color: white;
	}

	.preview-avatar {
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
		overflow: hidden;
	}

	.google-preview-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.google-btn {
		padding: 0;
		overflow: hidden;
		background: var(--bg-primary);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.google-btn-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
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

	.overlay-dim {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.2);
	}

	.flag-btn-choice {
		padding: 0;
		overflow: hidden;
		background: var(--bg-primary);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.flag-choice-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.color-picker-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		justify-content: center;
		max-width: 320px;
	}

	.color-btn {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		border: 2px solid transparent;
		cursor: pointer;
		transition:
			transform 0.2s,
			border-color 0.2s;
		flex-shrink: 0;
	}

	.color-btn:hover {
		transform: scale(1.1);
	}

	.color-btn.selected {
		border-color: var(--accent);
		box-shadow: 0 0 0 2px var(--accent);
	}

	.icon-picker-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		justify-content: center;
		max-width: 380px;
	}

	.icon-btn {
		width: 48px;
		height: 48px;
		border-radius: 12px;
		background: var(--bg-primary);
		border: 2px solid var(--border);
		color: var(--text-primary);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
		flex-shrink: 0;
		position: relative;
		overflow: hidden;
	}

	.icon-btn :global(svg),
	.avatar :global(svg) {
		position: relative;
		z-index: 1;
	}

	.icon-btn:hover {
		background: var(--bg-secondary);
	}

	.icon-btn.selected {
		border-color: var(--accent);
		background: var(--selected-bg);
		color: var(--accent);
	}

	.edit-actions {
		display: flex;
		gap: 0.5rem;
	}

	.icon-action-btn {
		padding: 0.5rem;
		border-radius: 50%;
		border: none;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
		width: 40px;
		height: 40px;
	}

	.icon-action-btn.save {
		background: var(--accent);
		color: white;
	}

	.icon-action-btn.save:hover {
		background: var(--accent-hover);
	}

	.icon-action-btn.cancel {
		background: var(--bg-secondary);
		color: var(--text-secondary);
	}

	.icon-action-btn.cancel:hover {
		background: var(--border);
	}
</style>
