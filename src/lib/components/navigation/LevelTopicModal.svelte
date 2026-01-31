<script lang="ts">
    /**
     * LevelTopicModal — Вибір рівня або теми
     * Дві вкладки: Рівні / Теми
     */
    import { _ } from "svelte-i18n";
    import { settingsStore } from "$lib/stores/settingsStore.svelte";
    import { ALL_LEVELS, ALL_TOPICS, type CEFRLevel } from "$lib/types";

    interface Props {
        onclose: () => void;
    }
    let { onclose }: Props = $props();

    let activeTab = $state<"levels" | "topics">("levels");

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

<div
    class="modal-backdrop"
    onclick={handleBackdropClick}
    role="dialog"
    aria-modal="true"
>
    <div class="modal">
        <!-- Tabs -->
        <div class="tabs">
            <button
                class="tab"
                class:active={activeTab === "levels"}
                onclick={() => (activeTab = "levels")}
            >
                {$_("levels.title")}
            </button>
            <button
                class="tab"
                class:active={activeTab === "topics"}
                onclick={() => (activeTab = "topics")}
            >
                {$_("topics.title")}
            </button>
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
                        <button
                            class="item topic-item"
                            class:selected={settingsStore.value.currentTopic ===
                                topic.id}
                            onclick={() => selectTopic(topic.id)}
                        >
                            <span class="item-icon">{topic.icon}</span>
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
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 1rem;
    }

    .modal {
        background: var(--bg-secondary);
        border-radius: 16px;
        max-width: 500px;
        width: 100%;
        max-height: 80vh;
        overflow: hidden;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    }

    .tabs {
        display: flex;
        border-bottom: 1px solid var(--border);
    }

    .tab {
        flex: 1;
        padding: 1rem;
        background: transparent;
        border: none;
        color: var(--text-secondary);
        font-size: 1rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
    }

    .tab:hover {
        color: var(--text-primary);
    }

    .tab.active {
        color: var(--text-primary);
        border-bottom: 2px solid var(--accent);
    }

    .content {
        padding: 1rem;
        overflow-y: auto;
        max-height: calc(80vh - 60px);
    }

    .grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0.75rem;
    }

    .topics-grid {
        grid-template-columns: repeat(2, 1fr);
    }

    .item {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 1rem 0.5rem;
        background: var(--card-bg);
        border: 2px solid var(--card-border);
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.2s;
    }

    .item:hover {
        border-color: var(--card-hover-border);
        transform: translateY(-2px);
    }

    .item.selected {
        background: var(--selected-bg);
        border-color: var(--selected-border);
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

    .topic-item .item-title {
        font-size: 0.9rem;
    }
</style>
