<script lang="ts">
	import { fade, scale } from "svelte/transition";
	import { X } from "lucide-svelte";

	interface Props {
		onclose: () => void;
		testid: string;
		children: any;
		maxWidth?: string;
		showCloseButton?: boolean;
	}

	let {
		onclose,
		testid,
		children,
		maxWidth = "480px",
		showCloseButton = true,
	}: Props = $props();

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) onclose();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === "Escape") onclose();
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
	class="modal-backdrop"
	transition:fade={{ duration: 200 }}
	onclick={handleBackdropClick}
	onkeydown={handleKeydown}
	role="presentation"
>
	<div
		class="modal"
		style="max-width: {maxWidth}"
		data-testid={testid}
		transition:scale={{ duration: 300, start: 0.9 }}
		onclick={(e) => e.stopPropagation()}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
	>
		{#if showCloseButton}
			<button
				class="close-btn"
				data-testid="{testid}-close-btn"
				onclick={onclose}
				aria-label="Close"
			>
				<X size={24} />
			</button>
		{/if}

		<div class="modal-content">
			{@render children()}
		</div>
	</div>
</div>

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		z-index: 10100;
		background: rgba(0, 0, 0, 0.8);
		backdrop-filter: blur(12px);
		display: flex;
		flex-direction: column;
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
		position: relative;
		color: var(--text-primary);
		margin: auto;
		padding: 3.5rem 1.5rem 1.5rem;
	}

	.close-btn {
		position: absolute;
		top: 0.75rem;
		right: 0.75rem;
		background: transparent;
		color: var(--text-secondary);
		padding: 0.5rem;
		border-radius: 50%;
		transition: all 0.2s;
		z-index: 10;
	}

	.close-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		color: var(--text-primary);
		transform: rotate(90deg);
	}

	.modal-content {
		width: 100%;
	}

	@media (max-width: 480px) {
		.modal {
			padding: 3rem 1rem 1.5rem;
		}
	}
</style>
