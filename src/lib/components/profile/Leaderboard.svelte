<script lang="ts">
    import { _ } from "svelte-i18n";
    import { ALL_LEVELS } from "$lib/types";
    import {
        Trophy,
        Medal,
        Crown,
        User,
        Star,
        Flame,
        Target,
        CheckCircle,
        Loader2,
        Cat,
        Dog,
        Rabbit,
        Bird,
        Fish,
        Snail,
        Turtle,
        Bug,
        Smile,
        Heart,
        Zap,
    } from "lucide-svelte";
    import { FriendsService } from "$lib/firebase/FriendsService";
    import { authStore } from "$lib/firebase/authStore.svelte";

    let selectedLevel = $state('all');
    let selectedMetric = $state<'bestStreak' | 'bestCorrectStreak' | 'totalCorrect' | 'accuracy'>('totalCorrect');
    let isLoading = $state(true);
    let leaderboardData = $state<any[]>([]);

    $effect(() => {
        loadLeaderboard();
    });

    async function loadLeaderboard() {
        isLoading = true;
        try {
            // Запускаємо оновлення профілю у фоні, тільки якщо користувач залогінений
            if (!authStore.isGuest && authStore.user?.uid) {
                FriendsService.updatePublicProfile().catch(console.error);
            }
            leaderboardData = await FriendsService.getLeaderboard(selectedMetric, selectedLevel);
        } finally {
            isLoading = false;
        }
    }

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

    function getIconComponent(photoURL: string | null) {
        if (photoURL?.startsWith("internal:")) {
            const iconId = photoURL.split(":")[1];
            return AVATAR_ICONS[iconId] || User;
        }
        return User;
    }

    function getAvatarColor(photoURL: string | null) {
        if (photoURL?.startsWith("internal:")) {
            return photoURL.split(":")[2] || "var(--accent)";
        }
        return "transparent";
    }

</script>

<div class="leaderboard-container" data-testid="leaderboard-container">
    <!-- Filters -->
    <div class="filters">
        <div class="level-tabs" data-testid="level-tabs">
            <button
                class="level-tab"
                class:active={selectedLevel === "all"}
                onclick={() => (selectedLevel = "all")}
                data-testid="level-tab-all"
            >
                {$_("common.all", { default: "Всі" })}
            </button>
            {#each ALL_LEVELS as level}
                <button
                    class="level-tab"
                    class:active={selectedLevel === level}
                    onclick={() => (selectedLevel = level)}
                    data-testid="level-tab-{level}"
                >
                    {level}
                </button>
            {/each}
        </div>

        <div class="metric-tabs" data-testid="metric-tabs">
            <button 
                class="metric-tab" 
                class:active={selectedMetric === 'bestStreak'}
                onclick={() => selectedMetric = 'bestStreak'}
                data-testid="metric-tab-streak-days"
                title={$_("profile.stats.bestStreak")}
            >
                <div class="tab-icon"><Flame size={18} /></div>
                <span class="tab-label">{$_("profile.stats.bestStreak")}</span>
            </button>
            <button 
                class="metric-tab" 
                class:active={selectedMetric === 'bestCorrectStreak'}
                onclick={() => selectedMetric = 'bestCorrectStreak'}
                data-testid="metric-tab-streak-correct"
                title={$_("profile.stats.bestCorrectStreak")}
            >
                <div class="tab-icon"><Medal size={18} /></div>
                <span class="tab-label">{$_("profile.stats.bestCorrectStreak")}</span>
            </button>
            <button 
                class="metric-tab" 
                class:active={selectedMetric === 'totalCorrect'}
                onclick={() => selectedMetric = 'totalCorrect'}
                data-testid="metric-tab-correct-total"
                title={$_("profile.stats.correct")}
            >
                <div class="tab-icon"><CheckCircle size={18} /></div>
                <span class="tab-label">{$_("profile.stats.correct")}</span>
            </button>
            <button 
                class="metric-tab" 
                class:active={selectedMetric === 'accuracy'}
                onclick={() => selectedMetric = 'accuracy'}
                data-testid="metric-tab-accuracy"
                title={$_("profile.stats.accuracy")}
            >
                <div class="tab-icon"><Target size={18} /></div>
                <span class="tab-label">{$_("profile.stats.accuracy")}</span>
            </button>
        </div>

    </div>

    <!-- List -->
    <div class="leaderboard-list" data-testid="leaderboard-list">

        {#if isLoading}
            <div class="loading-state">
                <Loader2 size={32} class="spinner" />
                <p>Завантаження топу...</p>
            </div>
        {:else if leaderboardData.length === 0}
            <div class="empty-state">
                <p>Поки що немає даних для відображення</p>
            </div>
        {:else}
            {#each leaderboardData as user (user.uid)}
                <!-- 
                   Якщо це ми (user.isMe), беремо дані прямо з authStore для миттєвого відображення змін.
                   Для інших — з даних лідерборду.
                -->
                {@const realName = user.isMe && authStore.displayName ? authStore.displayName : user.name}
                {@const realPhoto = user.isMe && authStore.photoURL ? authStore.photoURL : user.photoURL}
                
                {@const Icon = getIconComponent(realPhoto)}
                {@const avatarColor = getAvatarColor(realPhoto)}

                <!-- Додаємо рівень до testid, якщо ми на вкладці "Всі" і це метрика стріка -->
                {@const levelSuffix = (selectedLevel === 'all' && user.bestCorrectStreakLevel && selectedMetric === 'bestCorrectStreak') ? `-${user.bestCorrectStreakLevel}` : ''}
                
                <div class="leaderboard-item" class:me={user.isMe} data-testid="leaderboard-item-{user.rank}{levelSuffix}">
                    <div class="col-rank">
                        {#if user.rank === 1}
                            <Crown size={20} color="#FFD700" fill="#FFD700" />
                        {:else if user.rank === 2}
                            <Medal size={20} color="#C0C0C0" />
                        {:else if user.rank === 3}
                            <Medal size={20} color="#CD7F32" />
                        {:else}
                            <span class="rank-num">{user.rank}</span>
                        {/if}
                    </div>
                    
                    <div class="col-user">
                        {#if realPhoto?.startsWith('internal:')}
                            <div class="avatar-placeholder" style="background-color: {avatarColor}">
                                <Icon size={18} color="white" />
                            </div>
                        {:else if realPhoto}
                            <img src={realPhoto} alt="" class="avatar-img" />
                        {:else}
                            <div class="avatar-placeholder">
                                <Icon size={18} />
                            </div>
                        {/if}
                        <span class="username">{realName}</span>
                        {#if user.isMe}
                            <span class="me-badge">You</span>
                        {/if}
                    </div>

                    <div class="col-score">
                        <span class="score-val">
                            {user.score}{selectedMetric === 'accuracy' ? '%' : ''}
                        </span>
                    </div>
                </div>
            {/each}
        {/if}
    </div>

    {#if authStore.isGuest}
        <div class="guest-cta">
            <p>{$_("profile.leaderboard.guestHint", { default: "Увійдіть, щоб ваші рекорди з'явилися в топі та змагайтеся з іншими!" })}</p>
        </div>
    {/if}
</div>

<style>
    .leaderboard-container {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        height: 100%;
    }

    .guest-cta {
        margin-top: 1rem;
        padding: 1rem;
        background: rgba(var(--accent-rgb, 58, 143, 214), 0.1);
        border: 1px dashed var(--accent);
        border-radius: 12px;
        text-align: center;
        font-size: 0.9rem;
        color: var(--text-primary);
        line-height: 1.4;
    }

    /* Tabs Styles - Reused from ProfileStats but scoped */
    .level-tabs {
        display: flex;
        gap: 0.5rem;
        overflow-x: auto;
        padding-bottom: 0.75rem;
        scrollbar-width: none;
        justify-content: center;
    }

    .level-tab {
        background: transparent;
        border: 1px solid var(--border);
        color: var(--text-secondary);
        padding: 0.4rem 0.8rem;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        transition: all 0.2s;
        flex-shrink: 0;
    }

    .level-tab.active {
        background: var(--accent);
        color: white;
        border-color: var(--accent);
    }

    /* Shared Grid Layout */
    .leaderboard-grid {
        display: grid;
        grid-template-columns: 60px 1fr 100px;
        align-items: center;
        gap: 0.5rem;
    }

    .metric-tabs {
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

    .metric-tabs::-webkit-scrollbar {
        display: none;
    }

    .metric-tab {
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
        cursor: pointer;
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

    .metric-tab.active {
        background: rgba(255, 255, 255, 0.08);
        color: var(--text-primary);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    .metric-tab.active .tab-icon {
        background: var(--accent);
        color: white;
        transform: scale(1.1);
    }

    .tab-label {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 90px;
    }

    @media (max-width: 480px) {
        .metric-tab {
            padding: 0.5rem 0.4rem;
            font-size: 0.7rem;
            gap: 0.25rem;
            min-width: 60px;
        }
        .tab-icon {
            width: 28px;
            height: 28px;
        }
        .tab-label {
            max-width: 70px;
        }
    }

    /* List Styles */
    .list-header {
        display: flex;
        padding: 0 1rem;
        font-size: 0.75rem;
        color: var(--text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-weight: 700;
        margin-bottom: 0.75rem;
        opacity: 0.8;
    }

    .col-rank { width: 44px; display: flex; justify-content: center; align-items: center; }
    .col-user { flex: 1; display: flex; align-items: center; gap: 0.85rem; min-width: 0; }
    .col-score { width: 90px; text-align: right; font-variant-numeric: tabular-nums; }

    .leaderboard-list {
        display: flex;
        flex-direction: column;
        gap: 0.65rem;
    }

    .leaderboard-item {
        display: flex;
        align-items: center;
        background: rgba(255, 255, 255, 0.03);
        padding: 0.85rem 1rem;
        border-radius: 16px;
        border: 1px solid rgba(255, 255, 255, 0.05);
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .leaderboard-item:hover {
        transform: scale(1.01) translateX(2px);
        background: rgba(255, 255, 255, 0.06);
        border-color: rgba(255, 255, 255, 0.1);
    }

    .leaderboard-item.me {
        background: rgba(58, 143, 214, 0.12);
        border-color: var(--accent);
        box-shadow: 0 4px 15px rgba(58, 143, 214, 0.1);
    }

    .rank-num {
        font-weight: 800;
        color: var(--text-secondary);
        font-size: 0.95rem;
    }

    .avatar-placeholder {
        width: 38px;
        height: 38px;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.05);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--text-secondary);
        flex-shrink: 0;
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.05);
    }

    .avatar-img {
        width: 38px;
        height: 38px;
        border-radius: 12px;
        object-fit: cover;
        flex-shrink: 0;
    }

    .username {
        font-weight: 600;
        color: var(--text-primary);
        font-size: 0.95rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .me-badge {
        font-size: 0.65rem;
        background: var(--accent);
        color: white;
        padding: 0.15rem 0.45rem;
        border-radius: 6px;
        margin-left: 0.5rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.02em;
    }

    .score-val {
        font-weight: 800;
        color: var(--text-primary);
        font-size: 1rem;
    }

    .demo-notice {
        text-align: center;
        font-size: 0.85rem;
        color: var(--text-secondary);
        margin-top: 1.5rem;
        padding: 1rem;
        background: rgba(255, 255, 255, 0.02);
        border-radius: 12px;
        border: 1px dashed rgba(255, 255, 255, 0.1);
    }
</style>
