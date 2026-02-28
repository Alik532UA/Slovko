<script lang="ts">
    import { SyncService } from "$lib/firebase/SyncService.svelte";
    import { fade } from "svelte/transition";
</script>

{#if SyncService.migrationInProgress}
    <div class="migration-overlay" in:fade out:fade>
        <div class="migration-card">
            <div class="migration-icon">⏳</div>
            <h2>Оновлення бази даних...</h2>
            <p>Будь ласка, зачекайте, поки ми оптимізуємо ваші дані. Не закривайте цю сторінку.</p>
            
            <div class="progress-container">
                <div class="progress-bar">
                    <div 
                        class="progress-fill" 
                        style="width: {SyncService.migrationTotal > 0 ? (SyncService.migrationCurrent / SyncService.migrationTotal) * 100 : 100}%"
                    ></div>
                </div>
                <div class="progress-text">
                    {SyncService.migrationCurrent} з {SyncService.migrationTotal} плейлистів
                </div>
            </div>
        </div>
    </div>
{/if}

<style>
    .migration-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(10, 10, 20, 0.95);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(5px);
        padding: 20px;
    }

    .migration-card {
        background: var(--bg-secondary, #252540);
        padding: 40px;
        border-radius: 16px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        max-width: 400px;
        width: 100%;
        text-align: center;
        border: 1px solid var(--border, #3a3a5a);
    }

    .migration-icon {
        font-size: 48px;
        margin-bottom: 20px;
        animation: pulse 2s infinite ease-in-out;
    }

    h2 {
        margin: 0 0 10px 0;
        color: var(--text-primary, #ffffff);
    }

    p {
        color: var(--text-secondary, #a0a0a0);
        font-size: 14px;
        line-height: 1.5;
        margin-bottom: 30px;
    }

    .progress-container {
        width: 100%;
    }

    .progress-bar {
        height: 8px;
        background: var(--bg-tertiary, #1a1a2e);
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: 10px;
    }

    .progress-fill {
        height: 100%;
        background: var(--accent, #3a8fd6);
        transition: width 0.3s ease;
    }

    .progress-text {
        font-size: 13px;
        color: var(--text-secondary, #a0a0a0);
        font-variant-numeric: tabular-nums;
    }

    @keyframes pulse {
        0% { transform: scale(0.9); opacity: 0.8; }
        50% { transform: scale(1.1); opacity: 1; }
        100% { transform: scale(0.9); opacity: 0.8; }
    }
</style>