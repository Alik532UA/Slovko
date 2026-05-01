<script lang="ts">
	import { _ } from "svelte-i18n";
	import { LayoutGrid, Users, TriangleAlert } from "lucide-svelte";
	import { logService } from "../../services/logService.svelte";
	import { authStore } from "../../firebase/authStore.svelte";
	import { AuthService } from "../../firebase/AuthService";
	import { page } from "$app/stores";
	import { navigationState } from "../../controllers/NavigationState.svelte";

	// Sub-components
	import AvatarEditor from "../profile/AvatarEditor.svelte";
	import AccountActions from "../profile/AccountActions.svelte";
	import FriendsList from "../friends/FriendsList.svelte";
	import UserSearch from "../friends/UserSearch.svelte";
	import FriendsSettingsModal from "../friends/FriendsSettingsModal.svelte";
	import ErrorBoundary from "../ui/ErrorBoundary.svelte";
	import ProfileHeader from "../profile/ProfileHeader.svelte";
	import EmailAuthForm from "../profile/EmailAuthForm.svelte";
	import { smoothHeight } from "../../actions/smoothHeight";
	import BaseModal from "../ui/BaseModal.svelte";
	import SegmentedControl from "../ui/SegmentedControl.svelte";

	interface Props {
		onclose: () => void;
		initialTab?: "friends" | "account";
	}
	let { onclose, initialTab }: Props = $props();

	// UI State
	type TabType = "friends" | "account";
	type LoginMethod =
		| "auth"
		| "forgot-password"
		| "change-password"
		| "delete-account"
		| null;
	let loginMethod = $state<LoginMethod>(null);
	let isEditingAvatar = $state(false);
	let showFriendsSettings = $state(false);
	let errorMessage = $state("");
	let successMessage = $state("");
	let isLoading = $state(false);

	const defaultTab: TabType = "friends";
	const urlTab = $derived($page.url.searchParams.get("tab") as TabType | null);
	const activeTab = $derived(urlTab || initialTab || defaultTab);

	const availableTabs: TabType[] = ["friends", "account"];

	function setActiveTab(tab: TabType) {
		if (authStore.isGuest) return; // Забороняємо перемикання для гостей
		logService.log("profile", `Switching tab to: ${tab}`);
		navigationState.setTab(tab);
	}

	// Friends state
	let urlSubTab = $derived(
		$page.url.searchParams.get("subtab") as
			| "following"
			| "followers"
			| "search"
			| null,
	);
	let friendsSubTab = $derived(urlSubTab || "following");
	let shouldRefreshFriends = $state(false);

	const friendsSubTabOptions = [
		{
			id: "following",
			label: "friends.tabs.following",
			testId: "subtab-following",
		},
		{
			id: "followers",
			label: "friends.tabs.followers",
			testId: "subtab-followers",
		},
		{ id: "search", label: "friends.tabs.search", testId: "subtab-search" },
	];

	// Auth Handlers
	async function handleEmailAuth(email: string, pass: string) {
		isLoading = true;
		errorMessage = "";
		try {
			await AuthService.signInWithEmail(email, pass);
			loginMethod = null;
		} catch (e: unknown) {
			const err = e as { message?: string };
			errorMessage = err.message || $_("profile.errors.unknownError");
		} finally {
			isLoading = false;
		}
	}

	async function handleRegister(email: string, pass: string) {
		isLoading = true;
		errorMessage = "";
		try {
			await AuthService.linkWithEmail(email, pass);
			loginMethod = null;
		} catch (e: unknown) {
			const err = e as { message?: string };
			errorMessage = err.message || $_("profile.errors.unknownError");
		} finally {
			isLoading = false;
		}
	}

	async function handleGoogleAuth() {
		isLoading = true;
		errorMessage = "";
		try {
			await AuthService.linkWithGoogle();
			loginMethod = null;
		} catch (e: unknown) {
			const err = e as { message?: string };
			errorMessage = err.message || $_("profile.errors.unknownError");
		} finally {
			isLoading = false;
		}
	}

	async function handleForgotPassword(email: string) {
		isLoading = true;
		errorMessage = "";
		successMessage = "";
		try {
			const { sendPasswordResetEmail } = await import("firebase/auth");
			const { auth } = await import("$lib/firebase/config");
			await sendPasswordResetEmail(auth, email);
			successMessage = $_("profile.passwordResetSent");
			setTimeout(() => {
				loginMethod = "auth";
			}, 3000);
		} catch (e: unknown) {
			const err = e as { message?: string };
			errorMessage = err.message || $_("profile.errors.unknownError");
		} finally {
			isLoading = false;
		}
	}

	// Avatar handlers
	function startEditingAvatar() {
		if (!authStore.isAnonymous && !authStore.isGuest) {
			isEditingAvatar = true;
		}
	}

	async function saveAvatar(icon: string, color: string) {
		let photoURL = `internal:${icon}:${color}`;
		if (color === "google" && authStore.originalPhotoURL) {
			photoURL = authStore.originalPhotoURL;
		}
		try {
			await authStore.updateProfile(undefined, photoURL);
			isEditingAvatar = false;
		} catch (e) {
			logService.error("profile", "Failed to update avatar", e);
		}
	}

	async function handleLogout() {
		if (confirm($_("profile.confirmLogout") || "Ви впевнені?")) {
			await authStore.logout();
		}
	}
</script>

{#snippet tabsNav()}
	<ProfileHeader oneditAvatar={startEditingAvatar} />

	<SegmentedControl
		options={availableTabs.map((id) => ({
			id,
			label: `profile.tabs.${id}`,
			icon: id === "friends" ? Users : LayoutGrid,
			testId: `tab-${id}`,
			disabled: authStore.isGuest // Вкладки неклікабельні для гостя
		}))}
		value={activeTab}
		onchange={(id) => setActiveTab(id as TabType)}
	/>
{/snippet}

<BaseModal {onclose} testid="profile-modal">
	<div class="modal-internal-wrapper" use:smoothHeight={{ duration: 300 }}>
		<div class="modal-content-measure">
			{#if isEditingAvatar}
				<AvatarEditor
					initialIcon={authStore.photoURL?.startsWith("internal:") ? authStore.photoURL.split(":")[1] : "user"}
					initialColor={authStore.photoURL?.startsWith("internal:") ? authStore.photoURL.split(":")[2] : "blue"}
					onsave={saveAvatar}
					oncancel={() => (isEditingAvatar = false)}
				/>
			{:else}
				{#if authStore.isGuest}
					<div class="guest-warning-box" data-testid="guest-warning-box" style="margin-bottom: 1rem;">
						<div class="warning-icon"><TriangleAlert size={48} /></div>
						<p>{$_("profile.guestWarning") || "Ви граєте як гість. Авторизуйтесь, щоб зберігати прогрес та додавати друзів."}</p>
					</div>
				{/if}

				{@render tabsNav()}

				<div class="profile-content" data-testid="profile-content">
					<ErrorBoundary>
						{#if authStore.isGuest}
							<div class="guest-full-view">
								<div class="auth-section">
									<EmailAuthForm
										mode={loginMethod === "forgot-password" ? "forgot-password" : "auth"}
										{isLoading}
										{errorMessage}
										{successMessage}
										onsubmit={(email, pass) => {
											if (loginMethod === "forgot-password") {
												handleForgotPassword(email);
											} else {
												handleEmailAuth(email, pass);
											}
										}}
										onregister={handleRegister}
										ongoogle={handleGoogleAuth}
										onforgotPassword={() => (loginMethod = "forgot-password")}
										onback={() => (loginMethod = null)}
									/>
								</div>
							</div>
						{:else}
							{#key activeTab}
								{#if activeTab === "friends"}
									<div class="friends-container">
										<SegmentedControl
											options={friendsSubTabOptions}
											value={friendsSubTab}
											onchange={(id) => navigationState.setSubTab(id)}
											class="mb-2"
										/>

										{#if friendsSubTab === "search"}
											<UserSearch onfollow={() => (shouldRefreshFriends = true)} />
										{:else}
											<FriendsList
												activeTab={friendsSubTab}
												bind:shouldRefresh={shouldRefreshFriends}
												onopenSettings={() => (showFriendsSettings = true)}
											/>
										{/if}
									</div>

									{#if showFriendsSettings}
										<FriendsSettingsModal onclose={() => (showFriendsSettings = false)} />
									{/if}
								{:else if activeTab === "account"}
									{#if loginMethod === "change-password" || loginMethod === "delete-account"}
										<!-- Форми зміни пароля або видалення (можна додати за потреби) -->
										<button class="back-link" onclick={() => loginMethod = null}>
											{$_("profile.back")}
										</button>
									{:else}
										<AccountActions
											onchangePassword={() => {
												loginMethod = "change-password";
											}}
											onlogout={handleLogout}
											ondeleteAccount={() => {
												loginMethod = "delete-account";
											}}
										/>
									{/if}
								{/if}
							{/key}
						{/if}
					</ErrorBoundary>
				</div>
			{/if}
		</div>
	</div>
</BaseModal>

<style>
	.modal-internal-wrapper {
		width: 100%;
		overflow: hidden;
	}
	.modal-content-measure {
		padding: 0;
	}
	.profile-content {
		margin-top: 1.5rem;
		min-height: 200px;
	}
	.friends-container {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}
	.guest-full-view {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}
	.guest-warning-box {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		padding: 1.5rem;
		background: rgba(241, 196, 15, 0.05);
		border-radius: 20px;
		border: 1px dashed rgba(241, 196, 15, 0.2);
		gap: 0.75rem;
		color: var(--text-secondary);
	}
	.warning-icon {
		color: #f1c40f;
		opacity: 0.8;
	}
	.auth-section {
		background: rgba(255, 255, 255, 0.02);
		padding: 1.5rem;
		border-radius: 24px;
		border: 1px solid rgba(255, 255, 255, 0.05);
	}
	.back-link {
		background: none;
		border: none;
		color: var(--text-secondary);
		cursor: pointer;
		padding: 0.5rem;
		font-size: 0.9rem;
	}
</style>
