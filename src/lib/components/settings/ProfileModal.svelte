<script lang="ts">
    import { _ } from "svelte-i18n";
    import { fade, scale } from "svelte/transition";
    import {
        X,
        ShieldAlert,
        User,
        Edit2,
        Check,
        ArrowLeft,
        Target,
        LayoutGrid,
        Users,
        Settings,
        Trophy,
    } from "lucide-svelte";
    import { logService } from "../../services/logService";
    import { authStore } from "../../firebase/authStore.svelte";
    import { progressStore } from "../../stores/progressStore.svelte";
    import { FriendsService } from "../../firebase/FriendsService";

    // Sub-components
    import ProfileStats from "../profile/ProfileStats.svelte";
    import Leaderboard from "../profile/Leaderboard.svelte";
    import AvatarEditor from "../profile/AvatarEditor.svelte";
    import AccountActions from "../profile/AccountActions.svelte";
    import EmailAuthForm from "../profile/EmailAuthForm.svelte";
    import FriendsList from "../friends/FriendsList.svelte";
    import UserSearch from "../friends/UserSearch.svelte";
    import FriendsSettingsModal from "../friends/FriendsSettingsModal.svelte";

    interface Props {
        onclose: () => void;
    }
    let { onclose }: Props = $props();

    // UI State
    type LoginMethod =
        | "auth"
        | "forgot-password"
        | "change-password"
        | "delete-account"
        | null;
    let loginMethod = $state<LoginMethod>(null);
    let isLinking = $state(false);
    let isEditingAvatar = $state(false);
    let isEditingName = $state(false);
    let showFriendsSettings = $state(false);
    let editedName = $state("");
    let errorMessage = $state("");
    let successMessage = $state("");
    let activeTab = $state<"stats" | "account" | "friends" | "leaderboard">(
        "stats",
    );

    // Friends state
    let friendsSubTab = $state<"following" | "followers" | "search">(
        "following",
    );
    let shouldRefreshFriends = $state(false);
    let socialCounts = $state({ following: 0, followers: 0 });

    // Load counts on mount if user is logged in
    $effect(() => {
        if (authStore.uid && !authStore.isAnonymous) {
            loadSocialCounts();
        }
    });

    async function loadSocialCounts() {
        if (authStore.uid) {
            socialCounts = await FriendsService.getCounts(authStore.uid);
        }
    }

    // Derived stats
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
                (Date.now() -
                    (progressStore.value.firstSeenDate || Date.now())) /
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
        return "transparent";
    });

    function resetForm() {
        errorMessage = "";
        successMessage = "";
    }

    function refreshCounts() {
        loadSocialCounts();
        shouldRefreshFriends = !shouldRefreshFriends;
    }

    // Google Login
    async function handleGoogleLogin() {
        isLinking = true;
        errorMessage = "";
        try {
            await authStore.loginWithGoogle();
            loginMethod = null;
        } catch (e: any) {
            logService.error("auth", "Google login failed", e);
            errorMessage = e.message || "Помилка входу";
        } finally {
            isLinking = false;
        }
    }

    // Auth handlers
    async function handleEmailSignIn(email: string, password: string) {
        if (!email || !password) {
            errorMessage = $_("profile.errors.fillFields", { default: "Введіть всі поля" });
            return;
        }
        isLinking = true;
        errorMessage = "";
        try {
            await authStore.signInWithEmail(email, password);
            loginMethod = null;
        } catch (e: any) {
            logService.warn("auth", "Sign in failed", e.code || e.message);
            errorMessage = getAuthErrorMessage(e.code) || e.message || "Помилка";
        } finally {
            isLinking = false;
        }
    }

    async function handleEmailRegister(email: string, password: string) {
        if (!email || !password) {
            errorMessage = $_("profile.errors.fillFields", { default: "Введіть всі поля" });
            return;
        }
        isLinking = true;
        errorMessage = "";
        try {
            await authStore.registerWithEmail(email, password);
            loginMethod = null;
        } catch (e: any) {
            logService.warn("auth", "Registration failed", e.code || e.message);
            errorMessage = getAuthErrorMessage(e.code) || e.message || "Помилка";
        } finally {
            isLinking = false;
        }
    }

    async function handleForgotPassword(email: string) {
        if (!email) {
            errorMessage = $_("profile.errors.enterEmail", { default: "Введіть email" });
            return;
        }
        isLinking = true;
        errorMessage = "";
        try {
            const { sendPasswordResetEmail } = await import("firebase/auth");
            const { auth } = await import("$lib/firebase/config");
            await sendPasswordResetEmail(auth, email);
            successMessage = $_("profile.passwordResetSent", {
                default: "Лист для відновлення пароля надіслано",
            });
            setTimeout(() => {
                loginMethod = "auth";
                resetForm();
            }, 3000);
        } catch (e: any) {
            logService.error("auth", "Password reset failed", e);
            errorMessage = getAuthErrorMessage(e.code) || e.message || "Помилка";
        } finally {
            isLinking = false;
        }
    }

    function getAuthErrorMessage(code: string): string {
        const errors: Record<string, string> = {
            "auth/email-already-in-use": $_("profile.errors.emailInUse", {
                default: "Цей email вже використовується",
            }),
            "auth/weak-password": $_("profile.errors.weakPassword", {
                default: "Пароль занадто слабкий (мін. 6 символів)",
            }),
            "auth/invalid-email": $_("profile.errors.invalidEmail", {
                default: "Невірний формат email",
            }),
            "auth/user-not-found": $_("profile.errors.invalidCredentials", {
                default: "Невірний email або пароль",
            }),
            "auth/wrong-password": $_("profile.errors.invalidCredentials", {
                default: "Невірний email або пароль",
            }),
            "auth/invalid-credential": $_("profile.errors.invalidCredentials", {
                default: "Невірний email або пароль",
            }),
        };
        return errors[code] || "";
    }

    // Avatar handlers
    function startEditingAvatar() {
        if (!authStore.isAnonymous) {
            isEditingAvatar = true;
        }
    }

    async function saveAvatar(icon: string, color: string) {
        const photoURL = `internal:${icon}:${color}`;
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

    // Name editing
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

    // Password change
    async function handlePasswordAction(email: string, password: string) {
        if (!password) {
            errorMessage = $_("profile.errors.enterPassword", {
                default: "Введіть пароль",
            });
            return;
        }
        isLinking = true;
        errorMessage = "";
        try {
            if (loginMethod === "delete-account") {
                await authStore.deleteAccount(password);
                loginMethod = null;
                onclose();
            }
        } catch (e: any) {
            logService.error("auth", "Account action failed", e);
            errorMessage =
                getAuthErrorMessage(e.code) || e.message || "Помилка";
        } finally {
            isLinking = false;
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

    // Avatar icons for header display
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
    } from "lucide-svelte";

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
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
    class="modal-backdrop"
    transition:fade={{ duration: 200 }}
    onclick={onclose}
    onkeydown={handleKeydown}
    role="presentation"
>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
        class="modal"
        data-testid="profile-modal"
        transition:scale={{ duration: 300, start: 0.9 }}
        onclick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        tabindex="-1"
    >
        {#if isEditingAvatar}
            <AvatarEditor
                initialIcon={avatarInitialIcon()}
                initialColor={avatarInitialColor()}
                onsave={saveAvatar}
                oncancel={() => (isEditingAvatar = false)}
            />
        {:else if loginMethod === null}
            <!-- Close button -->
            {#if !isEditingName}
                <button
                    class="close-btn"
                    data-testid="profile-close-btn"
                    onclick={onclose}
                >
                    <X size={24} />
                </button>
            {/if}

            {#if authStore.isAnonymous || authStore.isGuest}
                <!-- GUEST / ANONYMOUS LAYOUT (Moved to top) -->
                <div class="warning-box">
                    <ShieldAlert size={24} />
                    <p>
                        {authStore.isGuest 
                            ? $_("profile.guestWarning", { default: "Ви граєте як гість. Увійдіть, щоб зберігати прогрес у хмарі та змагатися з іншими." })
                            : $_("profile.syncWarning", { default: "Ви використовуєте тимчасовий акаунт. Прив'яжіть пошту, щоб не втратити прогрес." })}
                    </p>
                </div>
                <button
                    class="login-btn"
                    data-testid="profile-login-btn"
                    onclick={() => (loginMethod = "auth")}
                    disabled={isLinking}
                    style="margin-bottom: 2rem;"
                >
                    {authStore.isGuest 
                        ? $_("profile.login", { default: "Увійти" }) 
                        : $_("profile.connectAccount", { default: "Прив'язати акаунт" })}
                </button>
            {:else}
                <!-- LOGGED IN HEADER -->
                <div class="header" data-testid="profile-header">
                    <button
                        class="avatar-wrapper-btn"
                        onclick={startEditingAvatar}
                        type="button"
                        data-testid="edit-avatar-trigger"
                    >
                        {#if authStore.photoURL?.startsWith("internal:")}
                            {@const parts = authStore.photoURL.split(":")}
                            {@const iconId = parts[1]}
                            {@const color = parts[2]}
                            {@const Icon = getIconComponent(iconId)}
                            <div
                                class="avatar email-user"
                                style="background-color: {color};"
                                data-testid="profile-avatar-email"
                            >
                                <Icon size={72} color="white" />
                            </div>
                        {:else if authStore.photoURL}
                            <img
                                src={authStore.photoURL}
                                alt=""
                                class="avatar"
                                data-testid="profile-avatar-img"
                            />
                        {:else}
                            <div
                                class="avatar email-user"
                                data-testid="profile-avatar-default"
                            >
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
                                        if (e.key === "Escape")
                                            isEditingName = false;
                                    }}
                                    autofocus
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
                                    {authStore.displayName ||
                                        authStore.email?.split("@")[0] ||
                                        "User"}
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
                        <div class="social-counts">
                            <span class="count-item">
                                <span class="count-val"
                                    >{socialCounts.following}</span
                                >
                                <span class="count-lbl"
                                    >{$_("friends.following", {
                                        default: "Підписки",
                                    })}</span
                                >
                            </span>
                            <span class="divider">•</span>
                            <span class="count-item">
                                <span class="count-val"
                                    >{socialCounts.followers}</span
                                >
                                <span class="count-lbl"
                                    >{$_("friends.followers", {
                                        default: "Підписники",
                                    })}</span
                                >
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Tabs for logged in users -->
                <div class="tabs-nav" data-testid="profile-tabs-nav">
                    <button
                        class:active={activeTab === "stats"}
                        onclick={() => (activeTab = "stats")}
                        data-testid="tab-stats"
                    >
                        <div class="tab-icon"><Target size={18} /></div>
                        <span
                            >{$_("profile.tabs.stats", {
                                default: "Статистика",
                            })}</span
                        >
                    </button>
                    <button
                        class:active={activeTab === "friends"}
                        onclick={() => (activeTab = "friends")}
                        data-testid="tab-friends"
                    >
                        <div class="tab-icon"><Users size={18} /></div>
                        <span
                            >{$_("profile.tabs.friends", {
                                default: "Друзі",
                            })}</span
                        >
                    </button>
                    <button
                        class:active={activeTab === "leaderboard"}
                        onclick={() => (activeTab = "leaderboard")}
                        data-testid="tab-leaderboard"
                    >
                        <div class="tab-icon"><Trophy size={18} /></div>
                        <span
                            >{$_("profile.tabs.leaderboard", {
                                default: "Топ",
                            })}</span
                        >
                    </button>
                    <button
                        class:active={activeTab === "account"}
                        onclick={() => (activeTab = "account")}
                        data-testid="tab-account"
                    >
                        <div class="tab-icon"><LayoutGrid size={18} /></div>
                        <span
                            >{$_("profile.tabs.account", {
                                default: "Акаунт",
                            })}</span
                        >
                    </button>
                </div>
            {/if}

            <!-- Content -->
            <div class="profile-content" data-testid="profile-content">
                {#if activeTab === "stats" || authStore.isAnonymous}
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
                {:else if activeTab === "friends" && !authStore.isAnonymous}
                    <div class="friends-layout" data-testid="friends-layout">
                        <div class="sub-tabs-container">
                            <div
                                class="sub-tabs"
                                data-testid="friends-sub-tabs"
                            >
                                <button
                                    class:active={friendsSubTab === "following"}
                                    onclick={() =>
                                        (friendsSubTab = "following")}
                                    data-testid="subtab-following"
                                >
                                    {$_("friends.tabs.following", {
                                        default: "Підписки",
                                    })}
                                </button>
                                <button
                                    class:active={friendsSubTab === "followers"}
                                    onclick={() =>
                                        (friendsSubTab = "followers")}
                                    data-testid="subtab-followers"
                                >
                                    {$_("friends.tabs.followers", {
                                        default: "Підписники",
                                    })}
                                </button>
                                <button
                                    class:active={friendsSubTab === "search"}
                                    onclick={() => (friendsSubTab = "search")}
                                    data-testid="subtab-search"
                                >
                                    {$_("friends.tabs.search", {
                                        default: "Пошук",
                                    })}
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
                            {#if friendsSubTab === "search"}
                                <UserSearch onFollowChange={refreshCounts} />
                            {:else}
                                <FriendsList
                                    activeTab={friendsSubTab}
                                    shouldRefresh={shouldRefreshFriends}
                                />
                            {/if}
                        </div>
                    </div>

                    {#if showFriendsSettings}
                        <FriendsSettingsModal
                            onclose={() => (showFriendsSettings = false)}
                        />
                    {/if}
                {:else if activeTab === "leaderboard" && !authStore.isAnonymous}
                    <Leaderboard />
                {:else if activeTab === "account" && !authStore.isAnonymous}
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
        {:else if loginMethod === "auth" || loginMethod === "forgot-password"}
            <EmailAuthForm
                mode={loginMethod}
                isLoading={isLinking}
                {errorMessage}
                {successMessage}
                onsubmit={loginMethod === "forgot-password" ? handleForgotPassword : handleEmailSignIn}
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
        {:else if loginMethod === "change-password"}
            <div class="form-section">
                <p class="form-title">
                    {$_("profile.changePasswordTitle", {
                        default: "Змінити пароль",
                    })}
                </p>
                <p class="form-subtitle">
                    {$_("profile.changePasswordHint", {
                        default: "Функція в розробці",
                    })}
                </p>
                <button
                    class="back-btn"
                    onclick={() => {
                        loginMethod = null;
                        resetForm();
                    }}
                    data-testid="change-password-back-btn"
                >
                    <ArrowLeft size={16} />
                    {$_("profile.back", { default: "Назад" })}
                </button>
            </div>
        {:else if loginMethod === "delete-account"}
            <div class="delete-warning">
                <p class="warning-text">
                    {$_("profile.deleteWarning", {
                        default: "Увага! Цю дію неможливо скасувати.",
                    })}
                </p>
                <form
                    class="email-form"
                    onsubmit={(e) => {
                        e.preventDefault();
                        handlePasswordAction(
                            "",
                            (e.target as any).password.value,
                        );
                    }}
                >
                    <input
                        type="password"
                        name="password"
                        placeholder={$_("profile.passwordPlaceholderShort", {
                            default: "Пароль",
                        })}
                        class="input-field"
                        autocomplete="current-password"
                        data-testid="delete-account-password-input"
                    />
                    {#if errorMessage}
                        <p class="error-msg">{errorMessage}</p>
                    {/if}
                    <button
                        type="submit"
                        class="delete-btn"
                        disabled={isLinking}
                        data-testid="confirm-delete-account-btn"
                    >
                        {isLinking
                            ? "..."
                            : $_("profile.confirmDelete", {
                                  default: "Підтвердити видалення",
                              })}
                    </button>
                    <button
                        type="button"
                        class="back-btn"
                        onclick={() => {
                            loginMethod = null;
                            resetForm();
                        }}
                        data-testid="delete-account-cancel-btn"
                    >
                        {$_("profile.cancel", { default: "Скасувати" })}
                    </button>
                </form>
            </div>
        {/if}
    </div>
</div>

<style>
    .modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: 10001;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(8px);
        display: flex;
        flex-direction: column;
        /* justify-content: center; - Removed to fix scroll clipping */
        align-items: center;
        padding: 1.5rem 0;
        overflow-y: auto;
    }

    :global([data-theme="light-gray"]) .modal-backdrop,
    :global([data-theme="green"]) .modal-backdrop {
        background: rgba(255, 255, 255, 0.9);
    }

    .modal {
        background: transparent;
        width: 100%;
        max-width: 480px;
        position: relative;
        color: var(--text-primary);
        margin: auto;
        padding: 3.5rem 1.5rem 1.5rem; /* Added top padding to clear the close button */
    }

    .close-btn {
        position: absolute;
        top: 0.75rem;
        right: 0.75rem;
        background: transparent;
        color: var(--text-secondary);
        padding: 0.5rem;
        border-radius: 50%;
        transition: background 0.2s;
        z-index: 10;
    }

    .close-btn:hover {
        background: rgba(255, 255, 255, 0.1);
    }

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
    }

    @media (max-width: 480px) {
        .avatar {
            width: 64px;
            height: 64px;
            border-radius: 18px;
        }
    }

    .avatar.anonymous {
        color: var(--text-secondary);
    }
    .avatar.email-user {
        color: var(--accent);
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

    .warning-box {
        background: rgba(233, 84, 32, 0.1);
        border: 1px solid var(--accent);
        padding: 1rem;
        border-radius: 16px;
        display: flex;
        gap: 1rem;
        align-items: center;
        margin-bottom: 1.5rem;
    }

    .warning-box p {
        margin: 0;
        font-size: 0.85rem;
        line-height: 1.4;
    }
    .warning-box :global(svg) {
        color: var(--accent);
        flex-shrink: 0;
    }

    .login-btn {
        width: 100%;
        background: white;
        color: #333;
        padding: 1rem;
        border-radius: 16px;
        font-weight: 700;
        font-size: 1rem;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.8rem;
        transition: transform 0.2s;
    }

    .login-btn:hover:not(:disabled) {
        transform: translateY(-2px);
    }

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

    .form-section {
        text-align: center;
        padding: 1rem;
    }

    .form-title {
        font-weight: 600;
        margin: 0 0 0.5rem;
        color: var(--text-primary);
    }

    .form-subtitle {
        font-size: 0.9rem;
        color: var(--text-secondary);
        margin: 0 0 1rem;
    }

    .back-btn {
        background: transparent;
        color: var(--text-secondary);
        padding: 0.5rem;
        font-size: 0.9rem;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.3rem;
        margin-top: 0.5rem;
    }

    .back-btn:hover {
        color: var(--text-primary);
    }

    .delete-warning {
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid var(--toast-error, #ef4444);
        padding: 1.5rem;
        border-radius: 16px;
    }

    .warning-text {
        color: var(--toast-error, #ef4444);
        font-size: 0.9rem;
        margin: 0 0 1rem;
        text-align: center;
    }

    .email-form {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .input-field {
        width: 100%;
        padding: 1rem;
        border-radius: 12px;
        border: 1px solid var(--border);
        background: var(--bg-primary);
        color: var(--text-primary);
        font-size: 1rem;
    }

    .input-field:focus {
        border-color: var(--accent);
        outline: none;
    }

    .delete-btn {
        width: 100%;
        background: var(--toast-error, #ef4444);
        color: white;
        padding: 1rem;
        border-radius: 12px;
        font-weight: 600;
        transition: opacity 0.2s;
    }

    .delete-btn:hover:not(:disabled) {
        opacity: 0.9;
    }
    .delete-btn:disabled {
        opacity: 0.6;
    }

    .error-msg {
        color: var(--toast-error, #ef4444);
        font-size: 0.9rem;
        text-align: center;
        margin: 0;
    }

    .profile-content {
        margin-bottom: 1.5rem;
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
    }
</style>
