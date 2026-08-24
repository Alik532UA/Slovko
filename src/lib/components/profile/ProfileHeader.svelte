<script lang="ts">
	import { _ } from "svelte-i18n";
	import { Edit2, Check, X } from "lucide-svelte";
	import { authStore } from "../../controllers/AuthStore.svelte";
	import { friendsStore } from "../../controllers/FriendsStore.svelte";
	import { logService } from "../../services/logService.svelte";
	import ProfileAvatar from "./ProfileAvatar.svelte";

	/**
	 * ШАПКА ПРОФІЛЮ: ім'я змінює будь-хто, аватар — лише з акаунтом.
	 *
	 * Асиметрія тут навмисна, і причина не технічна: обидва поля лежать в тому
	 * самому профілі Firebase Auth. Ім'я гостя має де жити без акаунта —
	 * локальний ключ у `AuthStore.setDisplayName()`, який при реєстрації
	 * переїжджає в новий акаунт. Аватар такого притулку не має: це рішення
	 * власника продукту, і воно записане в `ProfileAvatar`.
	 *
	 * Доти замкнені були ОБА — і це прибрало те, що для аноніма справді
	 * працювало: `updateProfile()` пише в Auth, а `SyncService` дублює ім'я в
	 * `profiles/{uid}` навіть анонімам. Не працювало воно лише там, де сеансу
	 * немає зовсім, — і тепер працює й там.
	 */
	interface Props {
		oneditAvatar?: () => void;
		/** Шапка лише показує (статистика): жодних олівців. */
		hideEditButton?: boolean;
		/** Гість: аватар замкнений і підписаний причиною. Ім'я — ні. */
		locked?: boolean;
	}

	let {
		oneditAvatar,
		hideEditButton = false,
		locked = false,
	}: Props = $props();

	const avatarMode = $derived(
		hideEditButton ? "plain" : locked ? "locked" : "edit",
	);

	let isEditingName = $state(false);
	let editedName = $state("");

	const followingCount = $derived(friendsStore.followingCount);
	const followersCount = $derived(friendsStore.followersCount);

	function startEditingName() {
		// Порожнє поле, а не підставлене «Гість»: інакше перше, що робить людина,
		// — витирає слово, яке вона не писала.
		editedName = authStore.displayName || authStore.email?.split("@")[0] || "";
		isEditingName = true;
	}

	async function saveName() {
		if (!editedName.trim()) return;
		try {
			await authStore.setDisplayName(editedName);
			isEditingName = false;
		} catch (e) {
			logService.error("profile", "Failed to update name", e);
		}
	}
</script>

<div class="header" data-testid="profile-header">
	<ProfileAvatar mode={avatarMode} onedit={oneditAvatar} />

	<div class="user-info">
		{#if isEditingName}
			<div class="edit-name-wrapper" role="group" aria-labelledby="edit-name-title">
				<h3 id="edit-name-title" class="sr-only">{$_("profile.editNameTitle")}</h3>
				<!--
					`maxlength` замість повідомлення про помилку: межу видно з
					самого поля, а сказати про неї після натиску «зберегти»
					означало б відмовити вже введеному. 30 символів — стеля, за
					якою ім'я перестає вміщатися в шапку на телефоні.
				-->
				<input
					type="text"
					bind:value={editedName}
					maxlength="30"
					class="name-input"
					aria-label={$_("profile.nameLabel")}
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
						aria-label={$_("common.save")}
						data-testid="save-name-btn"
					>
						<Check size={20} />
					</button>
					<button
						class="icon-action-btn cancel"
						onclick={() => (isEditingName = false)}
						aria-label={$_("common.cancel")}
						data-testid="cancel-name-btn"
					>
						<X size={20} />
					</button>
				</div>
			</div>
		{:else}
			<div class="name-row">
				<h2>
					{authStore.displayName ||
						authStore.email?.split("@")[0] ||
						$_("profile.anonymousTitle")}
				</h2>
				<!-- Шапка статистики нічого не редагує: там олівця немає взагалі. -->
				{#if !hideEditButton}
					<button
						class="edit-name-btn"
						onclick={startEditingName}
						aria-label={$_("common.edit")}
						data-testid="start-edit-name-btn"
					>
						<Edit2 size={16} />
					</button>
				{/if}
			</div>
		{/if}
		<p>{authStore.email}</p>

		<!-- Social Counts -->
		<div class="social-counts" data-testid="profile-social-counts-container">
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
		padding: 0.5rem; /* Space for scaling avatar */
		overflow: visible; /* Prevent clipping */
	}

	@media (max-width: 480px) {
		.header {
			gap: 1rem;
			margin-bottom: 1.5rem;
		}
	}

	/* `min-width: 0` — те, без чого перенесення лічильників нижче не спрацює:
	   за замовчуванням флекс-елемент не стискається менше за свій вміст. */
	.user-info {
		min-width: 0;
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

	/*
	 * Рядок «0 Підписки • 0 Підписники» розпирав шапку профілю на 45px за її
	 * власну ширину, і вміст обрізався: у `.user-info` діяв типовий
	 * `min-width: auto`, тобто блок не міг стати вужчим за min-content, а той
	 * дорівнював усьому рядку одразу.
	 *
	 * Тепер лічильники переносяться, а сам блок може стискатися. Ціна —
	 * другий рядок на вузькому екрані замість обрізаного першого.
	 */
	.social-counts {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: 0.5rem;
		font-size: clamp(0.72rem, 2.6vw, 0.85rem);
		color: var(--text-secondary);
		min-width: 0;
	}

	.count-item {
		display: flex;
		gap: 0.3rem;
		white-space: nowrap;
	}

	.count-val {
		font-weight: 700;
		color: var(--text-primary);
	}

	.divider {
		opacity: 0.5;
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
