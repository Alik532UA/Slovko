<script lang="ts">
	import { _ } from "svelte-i18n";
	import { LayoutGrid, Users, TriangleAlert } from "lucide-svelte";
	import { logService } from "../../services/logService.svelte";
	import { authStore } from "../../controllers/AuthStore.svelte";
	import { AuthService } from "../../services/firebase/AuthService";
	import { page } from "$app/state";
	import { navigationState } from "../../controllers/NavigationState.svelte";

	// Sub-components
	import AvatarEditor from "../profile/AvatarEditor.svelte";
	import AccountActions from "../profile/AccountActions.svelte";
	import ChangePasswordForm from "../profile/ChangePasswordForm.svelte";
	import DeleteAccountForm from "../profile/DeleteAccountForm.svelte";
	import FriendsList from "../friends/FriendsList.svelte";
	import UserSearch from "../friends/UserSearch.svelte";
	import FriendsSettingsModal from "../friends/FriendsSettingsModal.svelte";
	import ErrorBoundary from "../ui/ErrorBoundary.svelte";
	import ProfileHeader from "../profile/ProfileHeader.svelte";
	import AuthForm from "../auth/AuthForm.svelte";
	import { smoothHeight } from "../../utils/actions/smoothHeight";
	import BaseModal from "../ui/BaseModal.svelte";
	import { errorToMessageKey } from "$lib/errors";
	import SegmentedControl from "../ui/SegmentedControl.svelte";
	import GuestWarning from "../ui/GuestWarning.svelte";

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
	const urlTab = $derived(page.url.searchParams.get("tab") as TabType | null);
	const activeTab = $derived(urlTab || initialTab || defaultTab);

	const availableTabs: TabType[] = ["friends", "account"];

	function setActiveTab(tab: TabType) {
		if (authStore.isGuest) return; // Забороняємо перемикання для гостей
		logService.log("profile", `Switching tab to: ${tab}`);
		navigationState.setTab(tab);
	}

	// Friends state
	let urlSubTab = $derived(
		page.url.searchParams.get("subtab") as
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
			errorMessage = $_(errorToMessageKey(e));
		} finally {
			isLoading = false;
		}
	}

	async function handleRegister(email: string, pass: string) {
		isLoading = true;
		errorMessage = "";
		try {
			/*
			 * Ім'я, яке гість дав собі до реєстрації, переїжджає в новий акаунт —
			 * але лише якщо в того імені немає (`claimGuestName` перевіряє це сам).
			 */
			const user = await AuthService.linkWithEmail(email, pass);
			await authStore.claimGuestName(user);
			loginMethod = null;
		} catch (e: unknown) {
			errorMessage = $_(errorToMessageKey(e));
		} finally {
			isLoading = false;
		}
	}

	async function handleGoogleAuth() {
		isLoading = true;
		errorMessage = "";
		try {
			const user = await AuthService.linkWithGoogle();
			await authStore.claimGuestName(user);
			loginMethod = null;
		} catch (e: unknown) {
			errorMessage = $_(errorToMessageKey(e));
		} finally {
			isLoading = false;
		}
	}

	/*
	 * Коди, які у ВІДНОВЛЕННІ ПАРОЛЯ читаються як успіх.
	 *
	 * Firebase кидає `auth/user-not-found` на незареєстровану адресу (а з
	 * увімкненим Email Enumeration Protection — `auth/invalid-credential`), і
	 * показане повідомлення означало б те саме, що й різні тексти у формі входу:
	 * підставляючи адреси по одній, будь-хто дізнається, які з них існують.
	 *
	 * Тому відповідь однакова для обох випадків, а сам текст став умовним
	 * («якщо така пошта зареєстрована…») — інакше він обіцяв би лист, якого
	 * ніхто не надсилав.
	 */
	const RESET_SILENT_CODES = ["auth/user-not-found", "auth/invalid-credential"];

	function reportResetSent() {
		successMessage = $_("profile.passwordResetSent");
		setTimeout(() => {
			loginMethod = "auth";
		}, 3000);
	}

	async function handleForgotPassword(email: string) {
		isLoading = true;
		errorMessage = "";
		successMessage = "";
		try {
			const { sendPasswordResetEmail } = await import("firebase/auth");
			const { getAuthInstance } = await import("$lib/services/firebase/config");
			await sendPasswordResetEmail(getAuthInstance(), email);
			reportResetSent();
		} catch (e: unknown) {
			/*
			 * Решта помилок ЛИШАЄТЬСЯ на екрані: неправильно записана адреса й
			 * обрив мережі — це те, що людина може виправити, і ховати їх за
			 * «лист надіслано» означало б збрехати про надісланий лист.
			 */
			const code = (e as { code?: string })?.code ?? "";
			if (RESET_SILENT_CODES.includes(code)) reportResetSent();
			else errorMessage = $_(errorToMessageKey(e));
		} finally {
			isLoading = false;
		}
	}

	/*
	 * Другий шар до замка в шапці (`locked`), а не єдина заборона: стан, який
	 * тримається лише стилями, падає від першого ж виклику обробника іншим
	 * шляхом. `isGuest` тут покриває і анонімний вхід, і повну відсутність
	 * сеансу — це те саме поле в `AuthStore`.
	 */
	function startEditingAvatar() {
		if (authStore.isGuest) return;
		isEditingAvatar = true;
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
	<ProfileHeader oneditAvatar={startEditingAvatar} locked={authStore.isGuest} />

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
					<GuestWarning
						text={$_("profile.guestWarning") ||
							"Ви граєте як гість. Авторизуйтесь, щоб зберігати прогрес та додавати друзів."}
					>
						{#snippet icon()}
							<TriangleAlert size={28} />
						{/snippet}
					</GuestWarning>
				{/if}

				{@render tabsNav()}

				<div class="profile-content" data-testid="profile-panel">
					<ErrorBoundary>
						{#if authStore.isGuest}
							<div class="guest-full-view">
								<div class="auth-section">
									<AuthForm
										mode={loginMethod === "forgot-password" ? "forgot" : "auth"}
										loading={isLoading}
										error={errorMessage}
										info={successMessage}
										withGoogle
										onlogin={handleEmailAuth}
										onregister={handleRegister}
										onforgot={handleForgotPassword}
										ongoogle={handleGoogleAuth}
										onmode={(m) => (loginMethod = m === "forgot" ? "forgot-password" : "auth")}
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
									{#if loginMethod === "change-password"}
										<ChangePasswordForm onback={() => (loginMethod = null)} />
									{:else if loginMethod === "delete-account"}
										<DeleteAccountForm onback={() => (loginMethod = null)} />
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
	.auth-section {
		background: rgba(255, 255, 255, 0.02);
		padding: 1.5rem;
		border-radius: 24px;
		border: 1px solid rgba(255, 255, 255, 0.05);
	}
</style>
