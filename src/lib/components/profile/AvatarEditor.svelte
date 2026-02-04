<script lang="ts">
	import { _ } from "svelte-i18n";
	import { User, Check, X } from "lucide-svelte";
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
		selectedIcon = initialIcon;
		selectedColor = initialColor;
	});

	const AVATAR_ICONS = [
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
		AVATAR_ICONS.find((i) => i.id === selectedIcon)?.component || User,
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
			style="background-color: {selectedColor}"
			data-testid="profile-preview-avatar"
		>
			<Icon size={86} color="white" />
		</div>

		<div class="color-picker-grid" data-testid="color-picker-grid">
			{#each THEME_COLORS as color (color)}
				<button
					class="color-btn"
					style="background-color: {color === 'transparent'
						? 'rgba(255,255,255,0.1)'
						: color}"
					class:selected={selectedColor === color}
					onclick={() => (selectedColor = color)}
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
					onclick={() => (selectedIcon = id)}
					data-testid="icon-btn-{id}"
				>
					<IconComp size={36} />
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
	}

	.avatar.email-user {
		color: white;
	}

	.preview-avatar {
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
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