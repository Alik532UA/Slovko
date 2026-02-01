<script lang="ts">
    /**
     * LevelTopicModal — Вибір рівня або теми
     * Scalable architecture: Tabs defined as config
     */
    import { _ } from "svelte-i18n";
    import {
        X,
        Leaf,
        PawPrint,
        Plane,
        Utensils,
        Home,
        Car,
        Laptop,
        HelpCircle,
        Hash,
        Palette,
        Clock,
        Users,
        Heart,
        Shirt,
        User,
        Footprints,
        Sparkles,
        GraduationCap,
        Brain,
        Scale,
        Puzzle,
        ArrowLeftRight,
    } from "lucide-svelte";
    import { settingsStore } from "$lib/stores/settingsStore.svelte";
    import {
        ALL_LEVELS,
        ALL_TOPICS,
        type CEFRLevel,
        type GameMode,
    } from "$lib/types";

    // Map string names to components
    const ICON_MAP: Record<string, any> = {
        Leaf,
        PawPrint,
        Plane,
        Utensils,
        Home,
        Car,
        Laptop,
        HelpCircle,
        Hash,
        Palette,
        Clock,
        Users,
        Heart,
        Shirt,
        User,
        Footprints,
        Sparkles,
        GraduationCap,
        Brain,
        Scale,
        Puzzle,
        ArrowLeftRight,
    };

    interface Props {
        onclose: () => void;
    }
    let { onclose }: Props = $props();

    // Configuration for Tabs
    const TABS: { id: GameMode; label: string; testId: string }[] = [
        { id: "levels", label: "levels.title", testId: "tab-levels" },
        { id: "topics", label: "topics.title", testId: "tab-topics" },
    ];

    // Initialize directly from store (SSoT)
    let activeTab = $state<GameMode>(settingsStore.value.mode);

    function selectLevel(level: CEFRLevel) {
        settingsStore.setLevel(level);
        onclose();
    }

    function selectTopic(topicId: string) {
        settingsStore.setTopic(topicId);
        onclose();
    }

    function handleBackdropClick(e: MouseEvent) {
        if (e.target === e.currentTarget) {
            onclose();
        }
    }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
    class="modal-backdrop"
    onclick={handleBackdropClick}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    onkeydown={(e) => {
        if (e.key === "Escape") onclose();
    }}
>
    <div
        class="modal"
        data-testid="level-topic-modal"
        role="dialog"
        aria-modal="true"
        onclick={(e) => e.stopPropagation()}
    >
        <button
            class="close-btn"
            onclick={onclose}
            aria-label="Close"
            data-testid="close-level-topic-modal-btn"
        >
            <X size={28} />
        </button>

        <!-- Tabs -->
        <div class="tabs">
            {#each TABS as tab}
                <button
                    class="tab"
                    class:active={activeTab === tab.id}
                    onclick={() => (activeTab = tab.id)}
                    data-testid={tab.testId}
                >
                    {$_(tab.label)}
                </button>
            {/each}
        </div>

        <!-- Content -->
        <div class="content">
            {#if activeTab === "levels"}
                <div class="grid">
                    {#each ALL_LEVELS as level}
                        <button
                            class="item"
                            class:selected={settingsStore.value.currentLevel ===
                                level}
                            onclick={() => selectLevel(level)}
                            data-testid="level-item-{level}"
                        >
                            <span class="item-title">{level}</span>
                            <span class="item-desc"
                                >{$_(`levels.${level}`)}</span
                            >
                        </button>
                    {/each}
                </div>
            {:else}
                <div class="grid topics-grid">
                    {#each ALL_TOPICS as topic}
                        {@const Icon = ICON_MAP[topic.icon]}
                        <button
                            class="item topic-item"
                            class:selected={settingsStore.value.currentTopic ===
                                topic.id}
                            onclick={() => selectTopic(topic.id)}
                            data-testid="topic-item-{topic.id}"
                        >
                            <span class="item-icon">
                                {#if Icon}
                                    <Icon size={24} />
                                {:else}
                                    ?
                                {/if}
                            </span>
                            <span class="item-title"
                                >{$_(`topics.${topic.id}`)}</span
                            >
                        </button>
                    {/each}
                </div>
            {/if}
        </div>
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
        justify-content: center;
        align-items: center;
        padding: 1rem;
        transition: background 0.3s;
    }

    /* Light/Green theme override for backdrop */
    :global([data-theme="light-gray"]) .modal-backdrop,
    :global([data-theme="green"]) .modal-backdrop {
        background: rgba(255, 255, 255, 0.85);
    }

    .modal {
        background: transparent;
        max-width: 500px;
        width: 100%;
        position: relative;
        display: flex;
        flex-direction: column;
        max-height: 85vh;
        /* Ensure text color inherits correctly */
        color: var(--text-primary);
    }

    .close-btn {
        position: absolute;
        top: -40px;
        right: 0;
        background: transparent;
        border: none;
        color: var(--text-primary);
        cursor: pointer;
        padding: 0.5rem;
        border-radius: 8px;
        display: flex;
        transition: all 0.2s;
    }

    .close-btn:hover {
        transform: scale(1.1);
        color: var(--accent);
    }

    .tabs {
        display: flex;
        /* border-bottom: 1px solid var(--border); - Remove rigid border */
        margin-bottom: 1rem;
        gap: 1rem;
        justify-content: center;
    }

    .tab {
        padding: 0.5rem 1rem;
        background: transparent;
        border: none;
        color: var(--text-secondary);
        font-size: 1.1rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        border-radius: 8px;
    }

    .tab:hover {
        color: var(--text-primary);
        background: var(--bg-secondary); /* Soft hover bg */
    }

    .tab.active {
        color: var(--text-primary);
        font-weight: 700;
        background: var(--bg-secondary);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .content {
        padding: 0.5rem; /* Add some padding for scrollbar space */
        overflow-y: auto;
        /* Custom scrollbar for webkit */
        scrollbar-width: thin;
        scrollbar-color: var(--border) transparent;
    }

    .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
        gap: 0.75rem;
    }

    .topics-grid {
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    }

    .item {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 1rem 0.5rem;
        background: var(--card-bg); /* Cards keep their background */
        border: 2px solid var(--card-border);
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.2s;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); /* Slight shadow for depth */
    }

    .topic-item {
        flex-direction: row;
        justify-content: flex-start;
        padding: 0.75rem 1rem;
        gap: 0.75rem;
    }

    .item:hover {
        border-color: var(--card-hover-border);
        transform: translateY(-2px);
        box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
    }

    .item.selected {
        background: var(--selected-bg);
        border-color: var(--selected-border);
        box-shadow: 0 0 0 2px var(--selected-border); /* Highlight selected */
    }

    .item-title {
        font-size: 1.25rem;
        font-weight: 600;
        color: var(--text-primary);
    }

    .item-desc {
        font-size: 0.75rem;
        color: var(--text-secondary);
        margin-top: 0.25rem;
    }

    .item-icon {
        font-size: 2rem;
        margin-bottom: 0.5rem;
    }

    .topic-item .item-icon {
        font-size: 1.25rem;
        margin-bottom: 0;
    }

    .topic-item .item-title {
        font-size: 0.95rem;
        text-align: left;
    }
</style>