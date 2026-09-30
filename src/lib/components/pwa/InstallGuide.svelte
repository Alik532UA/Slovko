<script lang="ts">
	import { _ } from "svelte-i18n";
	import {
		AppWindow,
		CircleAlert,
		Dock,
		EllipsisVertical,
		ExternalLink,
		Grid2x2Plus,
		Menu,
		MonitorDown,
		Share,
		Smartphone,
		SquarePlus,
	} from "lucide-svelte";
	import BaseModal from "../ui/BaseModal.svelte";
	import { pwaStore } from "../../controllers/PwaStore.svelte";
	import { GUIDES, type StepIcon } from "../../services/pwa/installGuide";

	interface Props {
		onclose: () => void;
	}
	let { onclose }: Props = $props();

	/**
	 * Значок кроку — той, що людина шукатиме в браузері. Edge — сітка з плюсом, повернута
	 * на −90° (плюс угорі праворуч, як в адресному рядку Edge), Chrome — монітор зі стрілкою.
	 */
	const STEP_ICONS: Record<StepIcon, typeof Share> = {
		share: Share,
		add: SquarePlus,
		dots: EllipsisVertical,
		menu: Menu,
		install: MonitorDown,
		installEdge: Grid2x2Plus,
		dock: Dock,
		browser: ExternalLink,
		phone: Smartphone,
		app: AppWindow,
	};

	const guide = GUIDES[pwaStore.guide];

	/**
	 * Підпис кнопки, до якої людина повернеться у звичайному браузері (останній крок
	 * інструкції для месенджера), — зі словника, а не копією в тексті кроку.
	 */
	const button = $derived(pwaStore.isMobile ? $_("pwa.install") : $_("pwa.install_desktop"));
</script>

<BaseModal {onclose} testid="install-guide-modal">
	<div class="content" data-testid="install-guide-panel">
		<div class="header">
			<h3 data-testid="install-guide-title">{$_(guide.title)}</h3>
			<p class="subtitle" data-testid="install-guide-subtitle-text">{$_(guide.note)}</p>
		</div>

		<!--
			`role="list"` не зайвий: `list-style: none` у Safari знімає зі списку семантику, і
			VoiceOver перестає казати «список, 3 пункти». Номер видно, але читалка його не
			повторює — номер пункту вона називає сама.
		-->
		<ol class="steps" role="list" data-testid="install-guide-steps-container">
			{#each guide.steps as step, i (step.text)}
				{@const Icon = STEP_ICONS[step.icon]}
				<li class="step" data-testid={`install-guide-item-${i + 1}`}>
					<span class="step-num" aria-hidden="true" data-testid={`install-guide-num-badge-${i + 1}`}
						>{i + 1}</span
					>
					<span
						class="step-icon"
						class:edge-icon={step.icon === "installEdge"}
						data-testid={`install-guide-step-icon-${i + 1}`}><Icon size={24} /></span
					>
					<p class="step-text" data-testid={`install-guide-step-text-${i + 1}`}>
						{$_(step.text, { values: { button } })}
					</p>
				</li>
			{/each}
		</ol>

		{#if guide.warning}
			<div class="warning-note" data-testid="install-guide-warning">
				<CircleAlert size={16} />
				<p>{$_(guide.warning)}</p>
			</div>
		{/if}

		<button class="confirm-btn primary-action-btn" onclick={onclose} data-testid="install-guide-ok-btn">
			{$_("common.ok")}
		</button>
	</div>
</BaseModal>

<style>
	.content {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		padding: 0.5rem;
		text-align: center;
	}

	.header h3 {
		margin: 0 0 0.5rem 0;
		font-size: 1.25rem;
		color: var(--text-primary);
	}

	.subtitle {
		margin: 0;
		font-size: 0.9rem;
		color: var(--text-secondary);
		line-height: 1.4;
	}

	.steps {
		display: flex;
		flex-direction: column;
		gap: 20px;
		margin: 0;
		padding: 1rem;
		list-style: none;
		background: var(--bg-hover);
		border-radius: 16px;
		border: 1px solid var(--border);
	}

	.step {
		position: relative;
		display: flex;
		align-items: center;
		gap: 1rem;
		text-align: left;
	}

	/* Лінія між кроками — під центром значка: номер (24px) + проміжок + пів значка. */
	.step:not(:last-child)::after {
		content: "";
		position: absolute;
		top: 100%;
		left: calc(24px + 1rem + 24px - 1px);
		width: 2px;
		height: 20px;
		background: var(--border);
		opacity: 0.3;
	}

	.step-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 48px;
		height: 48px;
		background: rgba(var(--accent-rgb), 0.1);
		border-radius: 12px;
		color: var(--accent);
		flex-shrink: 0;
	}

	.edge-icon {
		transform: rotate(-90deg);
	}

	/*
	 * Без `opacity`: доти номер був `--text-secondary` на 50 %, тобто нижче AA в кожній
	 * темі, а номер тут — порядок дій, а не прикраса.
	 */
	.step-num {
		font-size: 1.1rem;
		font-weight: 800;
		color: var(--text-secondary);
		width: 24px;
		display: flex;
		justify-content: center;
		flex-shrink: 0;
	}

	.step-text {
		margin: 0;
		font-size: 0.95rem;
		color: var(--text-primary);
		line-height: 1.3;
	}

	/*
	 * Текст — основним кольором, бурштиновий лише значок і рамка. Доти текст був
	 * `#f59e0b` на півпрозорому бурштиновому, і на світлій темі це нижче AA.
	 */
	.warning-note {
		display: flex;
		gap: 0.75rem;
		padding: 1rem;
		background: var(--status-warning-bg);
		border-radius: 12px;
		border: 1px solid var(--status-warning);
		color: var(--text-primary);
		text-align: left;
		align-items: flex-start;
	}

	.warning-note :global(svg) {
		flex-shrink: 0;
		color: var(--status-warning);
	}

	.warning-note p {
		margin: 0;
		font-size: 0.85rem;
		line-height: 1.4;
		font-style: italic;
	}

	.confirm-btn {
		width: 100%;
	}
</style>
