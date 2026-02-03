<script lang="ts">
    import { _ } from "svelte-i18n";
    import { AlertTriangle, Copy, RotateCcw } from "lucide-svelte";
    import { settingsStore } from "$lib/stores/settingsStore.svelte";
    import { versionStore } from "$lib/stores/versionStore.svelte";

    interface Props {
        children: any;
    }
    let { children }: Props = $props();

    function copyReport(error: any) {
        const report = {
            error: error?.message || "Unknown error",
            stack: error?.stack,
            version: versionStore.currentVersion,
            settings: {
                mode: settingsStore.value.mode,
                level: settingsStore.value.currentLevel,
                topic: settingsStore.value.currentTopic,
                source: settingsStore.value.sourceLanguage,
                target: settingsStore.value.targetLanguage
            },
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
        };

        navigator.clipboard.writeText(JSON.stringify(report, null, 2))
            .then(() => alert("Report copied to clipboard!"));
    }
</script>

<svelte:boundary>
    {@render children()}
    {#snippet failed(error, reset)}
        <div class="error-container" data-testid="error-boundary">
            <div class="error-card">
                <div class="icon-box">
                    <AlertTriangle size={48} />
                </div>
                
                <h2>{$_("common.error.oops", { default: "Упс! Щось пішло не так" })}</h2>
                <p class="error-msg">{(error as any)?.message || "An unexpected error occurred"}</p>
                
                <div class="actions">
                    <button class="action-btn retry" onclick={reset}>
                        <RotateCcw size={20} />
                        <span>{$_("common.retry", { default: "Спробувати знову" })}</span>
                    </button>
                    
                    <button class="action-btn report" onclick={() => copyReport(error)}>
                        <Copy size={20} />
                        <span>{$_("common.error.copyReport", { default: "Скопіювати звіт" })}</span>
                    </button>
                </div>
            </div>
        </div>
    {/snippet}
</svelte:boundary>

<style>
    .error-container {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 2rem;
        width: 100%;
        height: 100%;
        min-height: 300px;
    }

    .error-card {
        background: rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(10px);
        border: 1px solid var(--border);
        border-radius: 24px;
        padding: 2.5rem;
        max-width: 400px;
        width: 100%;
        text-align: center;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    }

    .icon-box {
        color: #f59e0b;
        margin-bottom: 1.5rem;
        display: flex;
        justify-content: center;
    }

    h2 {
        margin: 0 0 1rem;
        font-size: 1.5rem;
        color: var(--text-primary);
    }

    .error-msg {
        color: var(--text-secondary);
        font-size: 0.9rem;
        margin-bottom: 2rem;
        line-height: 1.5;
        word-break: break-word;
    }

    .actions {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .action-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        padding: 0.85rem;
        border-radius: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        border: none;
        width: 100%;
    }

    .retry {
        background: var(--accent);
        color: white;
    }

    .retry:hover {
        filter: brightness(1.1);
        transform: translateY(-1px);
    }

    .report {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid var(--border);
        color: var(--text-primary);
    }

    .report:hover {
        background: rgba(255, 255, 255, 0.1);
    }
</style>
