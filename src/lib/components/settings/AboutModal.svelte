<script lang="ts">
	/**
	 * AboutModal — Про проєкт
	 */
	import { _ } from "svelte-i18n";
	import { versionStore } from "$lib/stores/versionStore.svelte";
	import { hardReset } from "$lib/services/resetService";
	import FeedbackModal from "./FeedbackModal.svelte";
	import BaseModal from "../ui/BaseModal.svelte";

	interface Props {
		onclose: () => void;
	}
	let { onclose }: Props = $props();

	let showFeedback = $state(false);

	async function handleHardReset() {
		await hardReset(true);
	}
</script>

<BaseModal {onclose} testid="about-modal">
	<div class="content">
		<p class="description">{$_("about.description")}</p>

		<div class="links">
			<a
				href="https://send.monobank.ua/jar/7sCsydhJnR"
				target="_blank"
				rel="noopener noreferrer"
				class="link-btn donate"
				data-testid="about-donate-link"
			>
				{$_("about.support")}
			</a>

			<button
				class="link-btn feedback"
				data-testid="about-feedback-link"
				onclick={() => (showFeedback = true)}
			>
				{$_("about.feedback.title")}
			</button>

			<a
				href="https://alik532ua.github.io/CV/"
				target="_blank"
				rel="noopener noreferrer"
				class="link-btn cv"
				data-testid="about-cv-link"
			>
				{$_("about.developer")}
			</a>

			<button
				class="link-btn danger-btn"
				onclick={handleHardReset}
				data-testid="about-hard-reset-link"
			>
				{$_("settings.dangerZone.hardReset") || "Reset All Data"}
			</button>
		</div>

		<div class="version-wrapper">
			<span class="version-text">
				{$_("about.version")}: {versionStore.currentVersion || "0.1"}
			</span>
		</div>

		<button
			class="confirm-btn primary-action-btn"
			onclick={onclose}
			data-testid="close-about-btn"
		>
			{$_("common.backToLearning")}
		</button>
	</div>
</BaseModal>

{#if showFeedback}
	<FeedbackModal onclose={() => (showFeedback = false)} />
{/if}

<style>
	.content {
		text-align: center;
		display: flex;
		flex-direction: column;
		gap: 2rem;
		padding: 0.5rem;
	}

	.description {
		font-size: 1.15rem;
		line-height: 1.6;
		margin: 0;
		font-weight: 400;
		color: var(--text-primary);
		text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
	}

	.links {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		align-items: center;
	}

	.link-btn {
		display: inline-block;
		padding: 0.75rem 1.5rem;
		border-radius: 12px;
		text-decoration: none;
		font-weight: 600;
		transition: all 0.2s;
		width: 100%;
		max-width: 280px;
		border: 2px solid transparent;
		cursor: pointer;
		font-size: 1rem;
		font-family: inherit;
	}

	.donate {
		background: var(--accent);
		color: white;
		box-shadow: 0 4px 12px rgba(58, 143, 214, 0.3);
	}

	.donate:hover {
		transform: translateY(-2px);
		box-shadow: 0 6px 16px rgba(58, 143, 214, 0.4);
	}

	.cv,
	.feedback {
		background: transparent;
		color: var(--text-primary);
		border-color: var(--border);
	}

	.cv:hover,
	.feedback:hover {
		background: var(--bg-secondary);
		border-color: var(--text-secondary);
	}

	.danger-btn {
		background: rgba(239, 68, 68, 0.1);
		color: #ef4444;
		border-color: rgba(239, 68, 68, 0.2);
	}

	.danger-btn:hover {
		background: rgba(239, 68, 68, 0.2);
		border-color: #ef4444;
	}

	.version-wrapper {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.version-text {
		color: var(--text-secondary);
		font-size: 0.85rem;
		opacity: 0.8;
	}

	.confirm-btn {
		width: 100%;
		max-width: 320px;
		align-self: center;
	}
</style>
