<script lang="ts">
	import { _ } from "svelte-i18n";
	import { X, Send, AlertCircle } from "lucide-svelte";
	import { FeedbackService } from "$lib/firebase/FeedbackService";
	import { fade, scale } from "svelte/transition";
	import { notificationStore } from "$lib/stores/notificationStore.svelte";

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
			notificationStore.show($_("wordReport.success"), "success");
			onclose();
		} catch (e) {
			notificationStore.show($_("wordReport.error"), "error");
		} finally {
			isSubmitting = false;
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) onclose();
	}
</script>

<div
	class="modal-backdrop"
	onclick={handleBackdropClick}
	role="dialog"
	aria-modal="true"
	tabindex="-1"
	onkeydown={(e) => e.key === "Escape" && onclose()}
	in:fade={{ duration: 200 }}
>
	<div
		class="modal"
		in:scale={{ duration: 200, start: 0.95 }}
		onclick={(e) => e.stopPropagation()}
		role="document"
	>
		<header>
			<div class="title-group">
				<AlertCircle size={24} class="title-icon" />
				<h2>{$_("wordReport.title")}</h2>
			</div>
			<button class="close-btn" onclick={onclose} aria-label="Close">
				<X size={24} />
			</button>
		</header>

		<div class="word-info">
			<div class="word-pair">
				<span class="source">{sourceTranslation}</span>
				<span class="arrow">→</span>
				<span class="target">{targetTranslation}</span>
			</div>
		</div>

		<div class="form-group">
			<label for="error-type">{$_("wordReport.selectType")}</label>
			<div class="options-grid">
				{#each ERROR_TYPES as type}
					<button
						class="option-card"
						class:active={selectedType === type}
						onclick={() => (selectedType = type)}
					>
						{$_(`wordReport.type.${type}`)}
					</button>
				{/each}
			</div>
		</div>

		<div class="form-group">
			<label for="comment">{$_("wordReport.commentLabel")}</label>
			<textarea
				id="comment"
				bind:value={comment}
				placeholder={$_("wordReport.commentPlaceholder")}
				rows="3"
			></textarea>
		</div>

		<footer>
			<button class="cancel-btn" onclick={onclose}>
				{$_("common.cancel")}
			</button>
			<button
				class="submit-btn"
				disabled={!selectedType || isSubmitting}
				onclick={handleSubmit}
			>
				{#if isSubmitting}
					<div class="spinner"></div>
				{:else}
					<Send size={18} />
					{$_("common.send")}
				{/if}
			</button>
		</footer>
	</div>
</div>

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		z-index: 30000;
		background: rgba(0, 0, 0, 0.85);
		backdrop-filter: blur(10px);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
	}

	.modal {
		background: var(--card-bg);
		border: 1px solid var(--border);
		border-radius: 20px;
		width: 100%;
		max-width: 450px;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		padding: 1.5rem;
		box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
	}

	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.title-group {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.title-icon {
		color: var(--accent);
	}

	h2 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	.close-btn {
		background: transparent;
		border: none;
		color: var(--text-secondary);
		cursor: pointer;
		padding: 0.25rem;
		border-radius: 50%;
		display: flex;
		transition: all 0.2s;
	}

	.close-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		color: var(--text-primary);
	}

	.word-info {
		background: var(--bg-secondary);
		padding: 1rem;
		border-radius: 12px;
		border: 1px dashed var(--border);
	}

	.word-pair {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		font-size: 1.1rem;
		font-weight: 500;
	}

	.arrow {
		color: var(--text-secondary);
		opacity: 0.5;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	label {
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.options-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem;
	}

	.option-card {
		padding: 0.75rem;
		background: var(--bg-secondary);
		border: 2px solid var(--border);
		border-radius: 10px;
		color: var(--text-primary);
		font-size: 0.9rem;
		cursor: pointer;
		transition: all 0.2s;
		text-align: center;
	}

	.option-card:hover {
		border-color: var(--text-secondary);
	}

	.option-card.active {
		background: var(--selected-bg);
		border-color: var(--selected-border);
		color: var(--text-primary);
	}

	textarea {
		background: var(--bg-secondary);
		border: 2px solid var(--border);
		border-radius: 10px;
		padding: 0.75rem;
		color: var(--text-primary);
		font-family: inherit;
		font-size: 1rem;
		resize: none;
		transition: border-color 0.2s;
	}

	textarea:focus {
		outline: none;
		border-color: var(--accent);
	}

	footer {
		display: flex;
		gap: 1rem;
		margin-top: 0.5rem;
	}

	footer button {
		flex: 1;
		padding: 0.875rem;
		border-radius: 12px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	.cancel-btn {
		background: transparent;
		border: 2px solid var(--border);
		color: var(--text-secondary);
	}

	.cancel-btn:hover {
		background: rgba(255, 255, 255, 0.05);
		color: var(--text-primary);
	}

	.submit-btn {
		background: var(--accent);
		border: none;
		color: white;
	}

	.submit-btn:hover:not(:disabled) {
		filter: brightness(1.1);
		transform: translateY(-2px);
	}

	.submit-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.spinner {
		width: 20px;
		height: 20px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top-color: white;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
