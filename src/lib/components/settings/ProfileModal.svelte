<script lang="ts">
	import { _ } from "svelte-i18n";
	import { fade } from "svelte/transition";
	import { Target, LayoutGrid, Users, Settings, Trophy } from "lucide-svelte";
	import { logService } from "../../services/logService";
	import { authStore } from "../../firebase/authStore.svelte";
	import { AuthService } from "../../firebase/AuthService";
	import { progressStore } from "../../stores/progressStore.svelte";
	import { page } from "$app/stores";
	import { navigationState } from "../../services/navigationState.svelte";

	// Sub-components
	import ProfileStats from "../profile/ProfileStats.svelte";
	import Leaderboard from "../profile/Leaderboard.svelte";
	import AvatarEditor from "../profile/AvatarEditor.svelte";
	import AccountActions from "../profile/AccountActions.svelte";
	import EmailAuthForm from "../profile/EmailAuthForm.svelte";
	import FriendsList from "../friends/FriendsList.svelte";
	import UserSearch from "../friends/UserSearch.svelte";
	import FriendsSettingsModal from "../friends/FriendsSettingsModal.svelte";
	import ErrorBoundary from "../ui/ErrorBoundary.svelte";
	import SecuritySettings from "../profile/SecuritySettings.svelte";
	import ProfileHeader from "../profile/ProfileHeader.svelte";
	import GuestProfileView from "../profile/GuestProfileView.svelte";
	import { smoothHeight } from "../../actions/smoothHeight";

	interface Props {
		onclose: () => void;
		mode?: "stats" | "profile" | "full";
		initialTab?: "stats" | "account" | "friends" | "leaderboard";
	}
	let { onclose, mode = "full", initialTab }: Props = $props();

	// UI State
	type TabType = "stats" | "account" | "friends" | "leaderboard";
	type LoginMethod =
		| "auth"
		| "forgot-password"
		| "change-password"
		| "delete-account"
		| null;
	let loginMethod = $state<LoginMethod>(null);
	let isLinking = $state(false);
	let isEditingAvatar = $state(false);
	let showFriendsSettings = $state(false);
	let errorMessage = $state("");
	let successMessage = $state("");

	// Визначаємо початкову вкладку залежно від режиму
	const defaultTab = $derived.by(() => {
		if (initialTab) return initialTab;
		if (mode === "stats") return "stats";
		if (mode === "profile") return "friends";
		return "stats";
	});

	const urlTab = $derived($page.url.searchParams.get("tab") as TabType | null);
	let activeTab = $derived(urlTab || defaultTab);

	// Фільтрація доступних табів
	const availableTabs = $derived.by(() => {
		if (mode === "stats") return ["stats", "leaderboard"];
		if (mode === "profile") return ["friends", "account"];
		return ["stats", "leaderboard", "friends", "account"];
	});

	const activeIndex = $derived(availableTabs.indexOf(activeTab));

	function setActiveTab(tab: TabType) {
		logService.log("profile", `Switching tab to: ${tab}`);
		navigationState.setTab(tab);
	}

	// Корекція вкладки при зміні стану авторизації або режиму
	$effect(() => {
		const isGuest = authStore.isAnonymous || authStore.isGuest;

		if (isGuest) {
			// Для гостя в режимі профілю дозволяємо лише account (вхід)
			if (mode === "profile" && activeTab !== "account") {
				activeTab = "account";
			}
			// В режимі статистики — лише stats
			else if (mode === "stats" && activeTab !== "stats") {
				activeTab = "stats";
			}
		} else {
			// Для авторизованого користувача перевіряємо чи вкладка доступна в поточному режимі
			if (!availableTabs.includes(activeTab)) {
				navigationState.setTab(availableTabs[0] as TabType);
			}
		}
	});

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
	let subtabRefs = $state<Record<string, HTMLButtonElement>>({});
	let underlineStyle = $derived.by(() => {
		const el = subtabRefs[friendsSubTab];
		if (el) {
			return `left: ${el.offsetLeft}px; width: ${el.offsetWidth}px;`;
		}
		return "opacity: 0;";
	});

	// Derived stats from progress store
	const totalCorrect = $derived(progressStore.value.totalCorrect);
	const streak = $derived(progressStore.value.streak);
	const bestStreak = $derived(progressStore.value.bestStreak || 0);
	const bestCorrectStreak = $derived(
		progressStore.value.bestCorrectStreak || 0,
	);
	const correctToday = $derived(progressStore.todayActivity.totalCorrect || 0);
	const dailyAverage = $derived(progressStore.getDailyAverage());
	const accuracy = $derived(progressStore.getAccuracy());
	const activeDaysCount = $derived(progressStore.value.activeDaysCount || 0);
	const daysInApp = $derived(
		Math.max(
			1,
			Math.ceil(
				(Date.now() - (progressStore.value.firstSeenDate || Date.now())) /
					(1000 * 60 * 60 * 24),
			),
		),
	);
	const levelStats = $derived(progressStore.value.levelStats || {});

	import { statisticsService } from "../../services/statisticsService.svelte";
	import { untrack } from "svelte";
	let isRecoveringActiveDays = $state(false);

	// Авто-відновлення статистики при відкритті профілю
	$effect(() => {
		const uid = authStore.user?.uid;
		const isGuest = authStore.isGuest;

		if (!isGuest && uid && !isRecoveringActiveDays) {
			untrack(() => {
				const progress = progressStore.value;
				const needsRecovery =
					!progress.isActiveDaysRecovered ||
					(progress.activeDaysCount <= 1 && progress.totalCorrect >= 10);

				if (needsRecovery) {
					isRecoveringActiveDays = true;
					statisticsService.recoverActiveDaysCount().finally(() => {
						isRecoveringActiveDays = false;
					});
				}
			});
		}
	});

	// Avatar initial values
	const avatarInitialIcon = $derived(() => {
		if (authStore.photoURL?.startsWith("internal:")) {
			return authStore.photoURL.split(":")[1] || "user";
		}
		return "user";
	});
	const avatarInitialColor = $derived(() => {
		if (authStore.photoURL?.startsWith("internal:")) {
			return authStore.photoURL.split(":")[2] || "transparent";
		}
		// Якщо photoURL є, але він не internal — значить це Google або інший зовнішній аватар
		if (authStore.photoURL) return "google";
		return "transparent";
	});

	function resetForm() {
		errorMessage = "";
		successMessage = "";
	}

	// Google Login
	async function handleGoogleLogin() {
		if (isLinking) return;
		isLinking = true;
		errorMessage = "";
		try {
			await authStore.loginWithGoogle();
			loginMethod = null;
		} catch (e) {
			const err = e as { code?: string; message?: string };
			logService.error("auth", "Google login failed", err);
			if (err.code === "auth/popup-closed-by-user") {
				errorMessage = $_("profile.errors.popupClosed");
			} else {
				errorMessage =
					err.message ||
					$_("profile.errors.loginFailed", { default: "Login error" });
			}
		} finally {
			isLinking = false;
		}
	}

	// Auth handlers
	async function checkProviderError(
		email: string,
		originalCode: string,
	): Promise<string | null> {
		if (
			originalCode !== "auth/invalid-credential" &&
			originalCode !== "auth/user-not-found" &&
			originalCode !== "auth/wrong-password"
		) {
			return null;
		}

		try {
			const providers = await AuthService.getProvidersForEmail(email);
			if (providers.includes("google.com")) {
				return $_("profile.errors.accountUsesGoogle");
			}
			if (providers.length === 0 && originalCode === "auth/user-not-found") {
				return $_("profile.errors.userNotFound");
			}
		} catch (e) {
			// Ignore check errors (e.g. if protection is enabled)
		}
		return null;
	}

	async function handleEmailSignIn(email: string, password: string) {
		if (isLinking) return;
		if (!email || !password) {
			errorMessage = $_("profile.errors.fillFields");
			return;
		}
		isLinking = true;
		errorMessage = "";
		try {
			await authStore.signInWithEmail(email, password);
			loginMethod = null;
		} catch (e) {
			const err = e as { code?: string; message?: string };
			logService.warn("auth", "Sign in failed", err.code || err.message);

			const specificError = await checkProviderError(email, err.code || "");
			errorMessage =
				specificError ||
				getAuthErrorMessage(err.code || "") ||
				err.message ||
				$_("profile.errors.unknownError", { default: "Error" });
		} finally {
			isLinking = false;
		}
	}

	async function handleEmailRegister(email: string, password: string) {
		if (isLinking) return;
		if (!email || !password) {
			errorMessage = $_("profile.errors.fillFields");
			return;
		}
		isLinking = true;
		errorMessage = "";
		try {
			await authStore.registerWithEmail(email, password);
			loginMethod = null;
		} catch (e) {
			const err = e as { code?: string; message?: string };
			logService.warn("auth", "Registration failed", err.code || err.message);
			errorMessage =
				getAuthErrorMessage(err.code || "") ||
				err.message ||
				$_("profile.errors.unknownError", { default: "Error" });
		} finally {
			isLinking = false;
		}
	}

	async function handleForgotPassword(email: string) {
		if (!email) {
			errorMessage = $_("profile.errors.enterEmail");
			return;
		}
		isLinking = true;
		errorMessage = "";
		try {
			// Перевіряємо методи входу для цього email
			const providers = await AuthService.getProvidersForEmail(email);

			if (providers.includes("google.com")) {
				errorMessage = $_("profile.forgotPasswordGoogleInfo", {
					default:
						"Ваш акаунт підключено через Google. Оскільки автентифікація керується вашим Google-профілем, окремий пароль Slovko для цієї адреси не встановлено. Будь ласка, увійдіть за допомогою Google.",
				});
				isLinking = false;
				return;
			}

			const { sendPasswordResetEmail } = await import("firebase/auth");
			const { auth } = await import("$lib/firebase/config");
			await sendPasswordResetEmail(auth, email);
			successMessage = $_("profile.passwordResetSent");
			setTimeout(() => {
				loginMethod = "auth";
				resetForm();
			}, 3000);
		} catch (e) {
			const err = e as { code?: string; message?: string };
			logService.error("auth", "Password reset failed", err);
			errorMessage =
				getAuthErrorMessage(err.code || "") ||
				err.message ||
				$_("profile.errors.unknownError", { default: "Error" });
		} finally {
			isLinking = false;
		}
	}

	function getAuthErrorMessage(code: string): string {
		const errors: Record<string, string> = {
			"auth/email-already-in-use": $_("profile.errors.emailInUse"),
			"auth/weak-password": $_("profile.errors.weakPassword"),
			"auth/invalid-email": $_("profile.errors.invalidEmail"),
			"auth/user-not-found": $_("profile.errors.invalidCredentials"),
			"auth/wrong-password": $_("profile.errors.invalidCredentials"),
			"auth/invalid-credential": $_("profile.errors.invalidCredentials"),
			"auth/popup-closed-by-user": $_("profile.errors.popupClosed"),
			"auth/cancelled-by-user": $_("profile.errors.popupClosed"),
			ACCOUNT_EXISTS_EMAIL: $_("profile.errors.accountExistsEmail"),
			GOOGLE_ALREADY_LINKED_ELSEWHERE: $_("profile.errors.googleAlreadyLinked"),
		};
		return errors[code] || code;
	}

	// Avatar handlers
	function startEditingAvatar() {
		if (!authStore.isAnonymous) {
			isEditingAvatar = true;
		}
	}

	async function saveAvatar(icon: string, color: string) {
		let photoURL = `internal:${icon}:${color}`;

		// Якщо вибрано Google-аватарку, використовуємо оригінальний URL
		if (color === "google" && authStore.originalPhotoURL) {
			photoURL = authStore.originalPhotoURL;
		}

		try {
			await authStore.updateProfile(
				undefined, // Не змінювати ім'я
				photoURL,
			);
			logService.log("profile", "Avatar saved:", photoURL);
			isEditingAvatar = false;
		} catch (e) {
			logService.error("profile", "Failed to update avatar", e);
		}
	}

	async function handleLogout() {
		if (
			confirm(
				$_("profile.confirmLogout", {
					default: "Ви впевнені, що хочете вийти?",
				}),
			)
		) {
			await authStore.logout();
		}
	}

	import BaseModal from "../ui/BaseModal.svelte";
	import SegmentedControl from "../ui/SegmentedControl.svelte";
</script>

{#snippet tabsNav()}
	{#if !authStore.isGuest}
		<ProfileHeader oneditAvatar={startEditingAvatar} />

		<SegmentedControl
			options={availableTabs.map((id) => ({
				id,
				label: `profile.tabs.${id}`,
				icon:
					id === "stats"
						? Target
						: id === "leaderboard"
							? Trophy
							: id === "friends"
								? Users
								: LayoutGrid,
				testId: `tab-${id}`,
			}))}
			value={activeTab}
			onchange={(id) => setActiveTab(id as any)}
			variant="vertical"
			testid="profile-tabs-nav"
			class="profile-tabs-nav"
		/>
	{:else if activeTab !== "stats"}
		<GuestProfileView {isLinking} onlogin={() => (loginMethod = "auth")} />
	{/if}
{/snippet}

{#snippet tabContent()}
	{#if activeTab === "stats"}
		<ProfileStats
			{totalCorrect}
			{streak}
			{daysInApp}
			{activeDaysCount}
			{accuracy}
			{bestStreak}
			{bestCorrectStreak}
			{correctToday}
			{dailyAverage}
			{levelStats}
		/>
	{:else if activeTab === "friends" && !authStore.isGuest}
		<div class="friends-layout" data-testid="friends-layout">
			<div class="sub-tabs-container">
				<SegmentedControl
					options={[
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
						{
							id: "search",
							label: "friends.tabs.search",
							testId: "subtab-search",
						},
					]}
					value={friendsSubTab}
					onchange={(id) => navigationState.setSubTab(id as any)}
					testid="friends-sub-tabs"
					class="flex-1"
				/>
				<div class="friends-actions">
					<button
						class="friends-settings-btn"
						onclick={() => (showFriendsSettings = true)}
						title={$_("settings.privacyTitle", { default: "Privacy Settings" })}
						data-testid="friends-settings-btn"
					>
						<Settings size={18} />
					</button>
				</div>
			</div>

			<div class="friends-content-area" data-testid="friends-content-area">
				{#key friendsSubTab}
					<div
						in:fade={{ duration: 300, delay: 150 }}
						out:fade={{ duration: 150 }}
						class="friends-subtab-wrapper"
					>
						{#if friendsSubTab === "search"}
							<UserSearch />
						{:else}
							<FriendsList
								activeTab={friendsSubTab}
								shouldRefresh={shouldRefreshFriends}
							/>
						{/if}
					</div>
				{/key}
			</div>
		</div>

		{#if showFriendsSettings}
			<FriendsSettingsModal onclose={() => (showFriendsSettings = false)} />
		{/if}
	{:else if activeTab === "leaderboard" && !authStore.isAnonymous}
		<Leaderboard />
	{:else if activeTab === "account" && !authStore.isGuest}
		<AccountActions
			onchangePassword={() => {
				loginMethod = "change-password";
				resetForm();
			}}
			onlogout={handleLogout}
			ondeleteAccount={() => {
				loginMethod = "delete-account";
				resetForm();
			}}
		/>
	{/if}
{/snippet}

<BaseModal
	{onclose}
	testid={mode === "stats" ? "stats-modal" : "profile-modal"}
>
	<div class="modal-internal-wrapper" use:smoothHeight={{ duration: 300 }}>
		<div class="modal-content-measure">
			{#if isEditingAvatar}
				<AvatarEditor
					initialIcon={avatarInitialIcon()}
					initialColor={avatarInitialColor()}
					onsave={saveAvatar}
					oncancel={() => (isEditingAvatar = false)}
				/>
			{:else if loginMethod === null}
				{@render tabsNav()}

				<div class="profile-content" data-testid="profile-content">
					<ErrorBoundary>
						{#key activeTab}
							<div
								in:fade={{ duration: 250, delay: 50 }}
								out:fade={{ duration: 150 }}
								class="tab-content-wrapper"
								data-testid="tab-content-{activeTab}"
							>
								{@render tabContent()}
							</div>
						{/key}
					</ErrorBoundary>
				</div>
			{:else if loginMethod === "auth" || loginMethod === "forgot-password"}
				<EmailAuthForm
					mode={loginMethod}
					isLoading={isLinking}
					{errorMessage}
					{successMessage}
					onsubmit={loginMethod === "forgot-password"
						? handleForgotPassword
						: handleEmailSignIn}
					onregister={handleEmailRegister}
					ongoogle={handleGoogleLogin}
					onback={() => {
						loginMethod = null;
						resetForm();
					}}
					onforgotPassword={loginMethod === "auth"
						? () => {
								loginMethod = "forgot-password";
								resetForm();
							}
						: undefined}
				/>
			{:else if loginMethod === "change-password" || loginMethod === "delete-account"}
				<SecuritySettings
					mode={loginMethod}
					onback={() => {
						loginMethod = null;
						resetForm();
					}}
					{onclose}
				/>
			{/if}
		</div>
	</div>
</BaseModal>

<style>
	.profile-content {
		margin-bottom: 1.5rem;
		display: grid;
		grid-template-columns: 100%;
		grid-template-rows: 1fr;
	}

	.tab-content-wrapper {
		grid-area: 1 / 1 / 2 / 2;
		width: 100%;
	}

	.modal-content-measure {
		display: block;
		width: 100%;
		height: auto;
	}

	.modal-internal-wrapper {
		display: block;
	}

	:global(.profile-tabs-nav) {
		margin-bottom: 2rem !important;
	}

	/* Friends layout styles */
	.friends-layout {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.sub-tabs-container {
		display: flex;
		align-items: center;
		position: relative;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.friends-actions {
		display: flex;
		align-items: center;
		padding-left: 0.5rem;
		border-left: 1px solid var(--border); /* Visual separator */
		flex-shrink: 0;
	}

	.friends-settings-btn {
		background: transparent;
		border: none;
		color: var(--text-secondary);
		cursor: pointer;
		padding: 0.5rem;
		border-radius: 8px;
		transition: all 0.2s;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.friends-settings-btn:hover {
		color: var(--text-primary);
		background: var(--bg-primary);
	}

	.friends-content-area {
		min-height: 200px;
		display: grid;
		grid-template-columns: 100%;
		grid-template-rows: 1fr;
	}

	.friends-subtab-wrapper {
		grid-area: 1 / 1 / 2 / 2;
		width: 100%;
	}
</style>
