<script lang="ts">
	import { _ } from "svelte-i18n";
	import { Send, AlertTriangle } from "lucide-svelte";
	import { FeedbackService } from "$lib/firebase/FeedbackService";
	import { notificationStore } from "$lib/stores/notificationStore.svelte";
	import BaseModal from "../ui/BaseModal.svelte";

	interface Props {
		wordKey: string;
		sourceTranslation: string;
		targetTranslation: string;
		onclose: () => void;
	}

	let { wordKey, sourceTranslation, targetTranslation, onclose }: Props = $props();

	let selectedType = $state("");
	let comment = $state("");
	let isSubmitting = $state(false);

	const ERROR_TYPES = [
		"wrongTranslation",
		"wrongTranscription",
		"audioIssue",
		"other",
	];

	async function handleSubmit() {
		if (!selectedType) return;

		isSubmitting = true;
		try {
			await FeedbackService.reportWordError({
				wordKey,
				errorType: selectedType,
				comment,
				sourceTranslation,
				targetTranslation,
			});
			notificationStore.success($_("wordReport.success"));
			onclose();
		} catch (e: any) {
			if (e.message === "AUTH_REQUIRED") {
				notificationStore.error($_("wordReport.authRequired"));
			} else {
				notificationStore.error($_("wordReport.error"));
			}
		} finally {
			isSubmitting = false;
		}
	}
</script>

<BaseModal {onclose} testid="word-report-modal">
	<div class="content">
		<header>
			<AlertTriangle size={32} class="title-icon" />
			<h2>{$_("wordReport.title")}</h2>
		</header>

		<div class="word-info">
			<div class="mini-card source-card">
				<span class="lang-label">{$_("settings.sourceLanguage")}</span>
				<span class="word-val">{sourceTranslation}</span>
			</div>
			<div class="mini-card target-card">
				<span class="lang-label">{$_("settings.targetLanguage")}</span>
				<span class="word-val">{targetTranslation}</span>
			</div>
		</div>

		<div class="form-group">
			<span class="section-label">{$_("wordReport.selectType")}</span>
			<div class="options-grid">
				{#each ERROR_TYPES as type}
					<button
						class="option-btn"
						class:active={selectedType === type}
						onclick={() => (selectedType = type)}
						data-testid="report-option-{type}"
					>
						{$_(`wordReport.type.${type}`)}
					</button>
				{/each}
			</div>
		</div>

		<div class="form-group">
			<label for="report-comment">{$_("wordReport.commentLabel")}</label>
			<textarea
				id="report-comment"
				bind:value={comment}
				placeholder={$_("wordReport.commentPlaceholder")}
				rows="3"
				data-testid="report-comment-input"
			></textarea>
		</div>

		<div class="actions">
			<button
				class="submit-btn primary-action-btn"
				disabled={!selectedType || isSubmitting}
				onclick={handleSubmit}
				data-testid="report-submit-btn"
			>
				{#if isSubmitting}
					<div class="spinner"></div>
				{:else}
					<Send size={20} />
					{$_("common.send")}
				{/if}
			</button>

			<button 
				class="cancel-btn" 
				onclick={onclose}
				data-testid="report-cancel-btn"
			>
				{$_("common.cancel")}
			</button>
		</div>
	</div>
</BaseModal>

<style>
	.content {
		display: flex;
		flex-direction: column;
		gap: 2rem;
		text-align: center;
		padding: 0.5rem;
	}

	header {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
	}

	.title-icon {
		color: var(--accent);
		filter: drop-shadow(0 0 8px rgba(58, 143, 214, 0.4));
	}

	h2 {
		margin: 0;
		font-size: 1.75rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	.word-info {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		width: 100%;
	}

	.mini-card {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid var(--border);
		border-radius: 16px;
		padding: 1rem 0.5rem;
		min-width: 0; /* Allow shrinking */
	}

	.lang-label {
		font-size: 0.65rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-secondary);
		opacity: 0.6;
	}

	.word-val {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--text-primary);
		text-align: center;
		word-break: break-word;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		text-align: left;
	}

	label,
	.section-label {
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding-left: 0.5rem;
	}

	.options-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
	}

	.option-btn {
		padding: 0.85rem;
		background: transparent;
		border: 2px solid var(--border);
		border-radius: 14px;
		color: var(--text-primary);
		font-size: 0.95rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}

	.option-btn:hover {
		background: rgba(255, 255, 255, 0.05);
		border-color: var(--text-secondary);
	}

	.option-btn.active {
		background: var(--selected-bg);
		border-color: var(--selected-border);
		box-shadow: 0 4px 12px rgba(58, 143, 214, 0.2);
	}

	textarea {
		background: rgba(255, 255, 255, 0.05);
		border: 2px solid var(--border);
		border-radius: 14px;
		padding: 1rem;
		color: var(--text-primary);
		font-family: inherit;
		font-size: 1.1rem;
		resize: none;
		transition: all 0.2s;
	}

	textarea:focus {
		outline: none;
		border-color: var(--accent);
		background: rgba(255, 255, 255, 0.08);
	}

	.actions {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-top: 0.5rem;
	}

	.submit-btn {
		width: 100%;
	}

	.cancel-btn {
		background: transparent;
		border: none;
		color: var(--text-secondary);
		font-size: 1rem;
		font-weight: 500;
		cursor: pointer;
		padding: 0.5rem;
		transition: color 0.2s;
	}

	.cancel-btn:hover {
		color: var(--text-primary);
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
		to {
			transform: rotate(360deg);
		}
	}

	@media (max-width: 400px) {
		.options-grid {
			grid-template-columns: 1fr;
		}
	}
</style>