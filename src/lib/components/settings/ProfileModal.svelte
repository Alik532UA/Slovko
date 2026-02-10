<script lang="ts">
	import { _ } from "svelte-i18n";
	import { fade } from "svelte/transition";
	import {
		X,
		Target,
		LayoutGrid,
		Users,
		Settings,
		Trophy,
	} from "lucide-svelte";
	import { logService } from "../../services/logService";
	import { authStore } from "../../firebase/authStore.svelte";
	import { friendsStore } from "../../stores/friendsStore.svelte";
	import { AuthService } from "../../firebase/AuthService";
	import { progressStore } from "../../stores/progressStore.svelte";

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

	let activeTab = $state<TabType>("stats");

	// Фільтрація доступних табів
	const availableTabs = $derived.by(() => {
		if (mode === "stats") return ["stats", "leaderboard"];
		if (mode === "profile") return ["friends", "account"];
		return ["stats", "friends", "leaderboard", "account"];
	});

	function setActiveTab(tab: TabType) {
		logService.log("profile", `Switching tab to: ${tab}`);
		activeTab = tab;
	}

	// Синхронізація активної вкладки при зміні пропсів або ініціалізації
	$effect(() => {
		if (initialTab) {
			activeTab = initialTab;
		} else {
			// Якщо початкова вкладка не задана, вибираємо дефолтну для режиму
			activeTab = mode === "profile" ? "account" : "stats";
		}
	});

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
				activeTab = availableTabs[0] as TabType;
			}
		}
	});

	// Friends state
	let friendsSubTab = $state<"following" | "followers" | "search">("following");
	let shouldRefreshFriends = $state(false);

	// Derived stats from progress store
	const totalCorrect = $derived(progressStore.value.totalCorrect);
	const streak = $derived(progressStore.value.streak);
	const bestStreak = $derived(progressStore.value.bestStreak || 0);
	const bestCorrectStreak = $derived(
		progressStore.value.bestCorrectStreak || 0,
	);
	const correctToday = $derived(progressStore.value.dailyCorrect || 0);
	const dailyAverage = $derived(progressStore.getDailyAverage());
	const accuracy = $derived(progressStore.getAccuracy());
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
		} catch (e: any) {
			logService.error("auth", "Google login failed", e);
			if (e.code === "auth/popup-closed-by-user") {
				errorMessage = $_("profile.errors.popupClosed");
			} else {
				errorMessage =
					e.message ||
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
		} catch (e: any) {
			logService.warn("auth", "Sign in failed", e.code || e.message);

			const specificError = await checkProviderError(email, e.code);
			errorMessage =
				specificError ||
				getAuthErrorMessage(e.code) ||
				e.message ||
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
		} catch (e: any) {
			logService.warn("auth", "Registration failed", e.code || e.message);
			errorMessage =
				getAuthErrorMessage(e.code) ||
				e.message ||
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
					default: "Ваш акаунт підключено через Google. Оскільки автентифікація керується вашим Google-профілем, окремий пароль Slovko для цієї адреси не встановлено. Будь ласка, увійдіть за допомогою Google."
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
		} catch (e: any) {
			logService.error("auth", "Password reset failed", e);
			errorMessage =
				getAuthErrorMessage(e.code) ||
				e.message ||
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

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === "Escape") {
			if (isEditingAvatar) {
				isEditingAvatar = false;
			} else if (loginMethod) {
				loginMethod = null;
				resetForm();
			} else {
				onclose();
			}
		}
	}

	import BaseModal from "../ui/BaseModal.svelte";

</script>

<BaseModal {onclose} testid="profile-modal">
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
			<!-- Header and Tabs -->
			{#if !authStore.isGuest}
				<ProfileHeader oneditAvatar={startEditingAvatar} />

				<!-- Tabs for logged in users -->
				<div class="tabs-nav" data-testid="profile-tabs-nav">
					{#if availableTabs.includes("stats")}
						<button
							class:active={activeTab === "stats"}
							onclick={() => setActiveTab("stats")}
							data-testid="tab-stats"
						>
							<div class="tab-icon"><Target size={18} /></div>
							<span>{$_("profile.tabs.stats")}</span>
						</button>
					{/if}

					{#if availableTabs.includes("friends")}
						<button
							class:active={activeTab === "friends"}
							onclick={() => setActiveTab("friends")}
							data-testid="tab-friends"
						>
							<div class="tab-icon"><Users size={18} /></div>
							<span>{$_("profile.tabs.friends")}</span>
						</button>
					{/if}

					{#if availableTabs.includes("leaderboard")}
						<button
							class:active={activeTab === "leaderboard"}
							onclick={() => setActiveTab("leaderboard")}
							data-testid="tab-leaderboard"
						>
							<div class="tab-icon"><Trophy size={18} /></div>
							<span>{$_("profile.tabs.leaderboard")}</span>
						</button>
					{/if}

					{#if availableTabs.includes("account")}
						<button
							class:active={activeTab === "account"}
							onclick={() => setActiveTab("account")}
							data-testid="tab-account"
						>
							<div class="tab-icon"><LayoutGrid size={18} /></div>
							<span>{$_("profile.tabs.account")}</span>
						</button>
					{/if}
				</div>
			{:else if activeTab !== "stats"}
				<!-- Якщо гість і НЕ на вкладці статистики — показуємо форму входу -->
				<GuestProfileView {isLinking} onlogin={() => (loginMethod = "auth")} />
			{/if}

			<div class="profile-content" data-testid="profile-content">
				<ErrorBoundary>
					{#key activeTab}
						<div in:fade={{ duration: 250, delay: 50 }} out:fade={{ duration: 150 }} class="tab-content-wrapper" data-testid="tab-content-{activeTab}">
						{#if activeTab === "stats"}
							<ProfileStats
								{totalCorrect}
								{streak}
								{daysInApp}
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
									<div class="sub-tabs" data-testid="friends-sub-tabs">
										<button
											class:active={friendsSubTab === "following"}
											onclick={() => (friendsSubTab = "following")}
											data-testid="subtab-following"
										>
											{$_("friends.tabs.following")}
										</button>
										<button
											class:active={friendsSubTab === "followers"}
											onclick={() => (friendsSubTab = "followers")}
											data-testid="subtab-followers"
										>
											{$_("friends.tabs.followers")}
										</button>
										<button
											class:active={friendsSubTab === "search"}
											onclick={() => (friendsSubTab = "search")}
											data-testid="subtab-search"
										>
											{$_("friends.tabs.search")}
										</button>
									</div>
									<div class="friends-actions">
										<button
											class="friends-settings-btn"
											onclick={() => (showFriendsSettings = true)}
											title={$_("settings.privacyTitle", {
												default: "Privacy Settings",
											})}
											data-testid="friends-settings-btn"
										>
											<Settings size={18} />
										</button>
									</div>
								</div>

								<div
									class="friends-content-area"
									data-testid="friends-content-area"
								>
									{#key friendsSubTab}
										<div in:fade={{ duration: 300, delay: 150 }} out:fade={{ duration: 150 }} class="friends-subtab-wrapper">
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
								<FriendsSettingsModal
									onclose={() => (showFriendsSettings = false)}
								/>
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
									onclose={onclose}
								/>
							{/if}
							</div>
						</div>
					</BaseModal>
					
		<style>
	.tabs-nav {
		display: flex;
		gap: 0.25rem;
		margin-bottom: 1.5rem;
		background: rgba(255, 255, 255, 0.03);
		padding: 0.4rem;
		border-radius: 16px;
		border: 1px solid rgba(255, 255, 255, 0.05);
		overflow-x: auto;
		scrollbar-width: none;
	}

	.tabs-nav::-webkit-scrollbar {
		display: none;
	}

	.tabs-nav button {
		flex: 1;
		background: none;
		border: none;
		padding: 0.6rem 0.5rem;
		color: var(--text-secondary);
		font-weight: 600;
		border-radius: 12px;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.35rem;
		font-size: 0.75rem;
		white-space: nowrap;
		min-width: 70px;
	}

	.tab-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: 8px;
		background: rgba(255, 255, 255, 0.03);
		transition: all 0.3s;
		color: var(--text-secondary);
	}

	.tabs-nav button.active {
		background: rgba(255, 255, 255, 0.08);
		color: var(--text-primary);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
	}

	.tabs-nav button.active .tab-icon {
		background: var(--accent);
		color: white;
		transform: scale(1.1);
	}

	@media (max-width: 480px) {
		.tabs-nav button {
			padding: 0.5rem 0.4rem;
			font-size: 0.7rem;
			gap: 0.25rem;
			min-width: 60px;
		}
		.tab-icon {
			width: 28px;
			height: 28px;
		}
	}

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

	/* Friends layout styles */
	.friends-layout {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.sub-tabs-container {
		display: flex;
		align-items: center;
		border-bottom: 1px solid var(--border);
		position: relative;
		gap: 0.5rem;
	}

	.sub-tabs {
		display: flex;
		flex: 1;
		overflow-x: auto;
		scrollbar-width: none; /* Hide scrollbar for cleaner look */
		gap: 0.5rem;
	}

	.sub-tabs::-webkit-scrollbar {
		display: none;
	}

	.sub-tabs button {
		background: transparent;
		border: none;
		color: var(--text-secondary);
		padding: 0.75rem 0.5rem;
		cursor: pointer;
		font-size: 0.9rem;
		font-weight: 600;
		border-bottom: 2px solid transparent;
		transition: all 0.2s;
		white-space: nowrap;
		flex-shrink: 0;
		position: relative;
		top: 1px; /* Push border down to overlap container border */
	}

	.sub-tabs button:hover {
		color: var(--text-primary);
	}

	.sub-tabs button.active {
		color: var(--accent);
		border-bottom-color: var(--accent);
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
