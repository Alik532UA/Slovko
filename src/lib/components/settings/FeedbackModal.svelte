<script lang="ts">
    import { _ } from "svelte-i18n";
    import { Send, CheckCircle2, MessageSquare, Bug, Lightbulb, UserRound, ArrowLeft } from "lucide-svelte";
    import { fade, slide } from "svelte/transition";
    import { FeedbackService, type FeedbackCategory } from "../../firebase/FeedbackService";
    import BaseModal from "../ui/BaseModal.svelte";

    interface Props {
        onclose: () => void;
    }
    let { onclose }: Props = $props();

    let selectedCategory = $state<FeedbackCategory | null>(null);
    let title = $state("");
    let message = $state("");
    
    let isSubmitting = $state(false);
    let isSuccess = $state(false);
    let error = $state("");

    async function handleSubmit(e: Event) {
        e.preventDefault();
        if (!selectedCategory || !message.trim()) return;

        isSubmitting = true;
        error = "";

        try {
            await FeedbackService.submitFeedback({
                category: selectedCategory,
                title: title.trim(),
                message: message.trim()
            });
            isSuccess = true;
            setTimeout(onclose, 2500);
        } catch (e: any) {
            error = e.message || "Помилка при відправці";
        } finally {
            isSubmitting = false;
        }
    }

    const categories = [
        { id: 'bug', icon: Bug, label: 'about.feedback.bug', color: '#ef4444' },
        { id: 'improvement', icon: Lightbulb, label: 'about.feedback.improvement', color: '#f59e0b' },
        { id: 'contact', icon: UserRound, label: 'about.feedback.contact', color: '#3b82f6' }
    ];

    function selectCategory(id: FeedbackCategory) {
        selectedCategory = id;
    }

    function goBack() {
        selectedCategory = null;
        error = "";
    }
</script>

<BaseModal {onclose} testid="feedback-modal" maxWidth="500px">
    <div class="content">
        {#if isSuccess}
            <div class="success-state" transition:fade>
                <CheckCircle2 size={64} class="success-icon" />
                <h2>{$_("about.feedback.successTitle")}</h2>
                <p>{$_("about.feedback.successMsg")}</p>
            </div>
        {:else}
            <div class="header">
                {#if selectedCategory}
                    <button class="back-btn" onclick={goBack} transition:fade data-testid="feedback-back-btn">
                        <ArrowLeft size={20} />
                    </button>
                {/if}
                <MessageSquare size={32} class="header-icon" />
                <h2>{$_("about.feedback.title")}</h2>
            </div>

            {#if !selectedCategory}
                <div class="category-selection" in:slide>
                    <p class="instruction">{$_("about.feedback.instruction", {default: "Оберіть тип повідомлення:"})}</p>
                                            <div class="category-stack">
                                                {#each categories as cat (cat.id)}
                                                    <button
                                                        type="button"                                class="category-large-btn"
                                onclick={() => selectCategory(cat.id as FeedbackCategory)}
                                data-testid="feedback-cat-{cat.id}"
                            >
                                <div class="icon-box" style="color: {cat.color}">
                                    <cat.icon size={24} />
                                </div>
                                <span>{$_(cat.label)}</span>
                            </button>
                        {/each}
                    </div>
                </div>
            {:else}
                <form onsubmit={handleSubmit} in:slide>
                                            <div class="form-group">
                                                <label for="fb-title">{$_("about.feedback.subjectLabel")}</label>
                                                <input
                                                    id="fb-title"
                                                    type="text"
                                                    bind:value={title}
                                                    placeholder={$_("about.feedback.subjectPlaceholder")}
                                                    data-testid="feedback-title-input"
                                                />
                                            </div>
                    
                                            <div class="form-group">
                                                <label for="fb-message">{$_("about.feedback.messageLabel")}</label>
                                                <textarea
                                                    id="fb-message"
                                                    bind:value={message}
                                                    placeholder={$_("about.feedback.messagePlaceholder")}
                                                    required
                                                    rows="5"
                                                    data-testid="feedback-message-input"
                                                ></textarea>
                                            </div>
                    
                                            {#if error}
                                                <p class="error-msg">{error}</p>
                                            {/if}
                    
                                            <button 
                                                type="submit" 
                                                class="submit-btn" 
                                                disabled={isSubmitting || !message.trim()}
                                                data-testid="feedback-submit-btn"
                                            >                        {#if isSubmitting}
                            <div class="spinner"></div>
                        {:else}
                            <Send size={20} />
                            <span>{$_("about.feedback.send")}</span>
                        {/if}
                    </button>
                </form>
            {/if}
        {/if}
    </div>
</BaseModal>

<style>
    .content {
        padding: 0.5rem;
    }

    .header {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1.5rem;
    }

    .back-btn {
        background: transparent;
        border: none;
        color: var(--text-secondary);
        cursor: pointer;
        padding: 0.5rem;
        border-radius: 50%;
        margin-left: -0.5rem;
    }

    .back-btn:hover {
        background: rgba(255, 255, 255, 0.05);
        color: var(--text-primary);
    }

    .header-icon {
        color: var(--accent);
    }

    .header h2 {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 800;
    }

    .instruction {
        color: var(--text-secondary);
        font-size: 0.95rem;
        margin-bottom: 1.5rem;
    }

    .category-stack {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .category-large-btn {
        display: flex;
        align-items: center;
        gap: 1.25rem;
        padding: 1.25rem;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid var(--border);
        border-radius: 18px;
        color: var(--text-primary);
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        text-align: left;
        font-size: 1.05rem;
        font-weight: 600;
    }

    .icon-box {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 48px;
        height: 48px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 14px;
        transition: all 0.3s;
    }

    .category-large-btn:hover {
        background: rgba(255, 255, 255, 0.07);
        border-color: var(--accent);
        transform: translateX(4px);
    }

    .category-large-btn:hover .icon-box {
        background: white;
        transform: scale(1.1);
    }

    .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-bottom: 1.25rem;
    }

    .form-group label {
        font-size: 0.85rem;
        font-weight: 700;
        color: var(--text-secondary);
        margin-left: 0.25rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    textarea, input {
        width: 100%;
        padding: 1rem;
        background: rgba(0, 0, 0, 0.2);
        border: 1px solid var(--border);
        border-radius: 16px;
        color: var(--text-primary);
        font-size: 1rem;
        font-family: inherit;
        transition: all 0.2s;
    }

    textarea:focus, input:focus {
        outline: none;
        border-color: var(--accent);
        background: rgba(0, 0, 0, 0.3);
        box-shadow: 0 0 0 4px rgba(58, 143, 214, 0.1);
    }

    textarea {
        resize: none;
    }

    .submit-btn {
        width: 100%;
        padding: 1.1rem;
        background: var(--accent);
        color: white;
        border: none;
        border-radius: 18px;
        font-size: 1.1rem;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        transition: all 0.2s;
        margin-top: 1rem;
        box-shadow: 0 4px 15px rgba(58, 143, 214, 0.3);
    }

    .submit-btn:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(58, 143, 214, 0.4);
        filter: brightness(1.1);
    }

    .submit-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
    }

    .success-state {
        text-align: center;
        padding: 2rem 0;
    }

    .success-icon {
        color: #4caf50;
        margin-bottom: 1.5rem;
    }

    .success-state h2 {
        font-size: 1.75rem;
        margin-bottom: 0.5rem;
    }

    .success-state p {
        color: var(--text-secondary);
    }

    .error-msg {
        color: #ff4444;
        font-size: 0.85rem;
        text-align: center;
        margin-bottom: 1rem;
    }

    .spinner {
        width: 24px;
        height: 24px;
        border: 3px solid rgba(255, 255, 255, 0.3);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }
</style>
