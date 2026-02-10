<script lang="ts">
	import { _ } from "svelte-i18n";
	import { Share, PlusSquare, MoreVertical, MonitorDown, Download, Grid2X2Plus } from "lucide-svelte";
	import BaseModal from "../ui/BaseModal.svelte";
	import { pwaStore } from "../../stores/pwaStore.svelte";
	import { browser } from "$app/environment";

	interface Props {
		onclose: () => void;
	}
	let { onclose }: Props = $props();

	const mode = $derived.by(() => {
		if (pwaStore.isIOS) return "ios";
		if (pwaStore.isAndroid) return "android";
		return "desktop";
	});

	const isIosChrome = $derived(pwaStore.isIosChrome);

	const isEdge = $derived.by(() => {
		if (!browser) return false;
		return window.navigator.userAgent.indexOf("Edg/") > -1;
	});
</script>

<BaseModal {onclose} testid="install-guide">
	<div class="content">
		<div class="header">
			<h3>
				{#if mode === 'ios'}{$_("pwa.ios.title") || "Встановити на iPhone"}
				{:else if mode === 'android'}{$_("pwa.android.title") || "Встановити на Android"}
				{:else}{$_("pwa.desktop.title") || "Встановити на комп'ютер"}
				{/if}
			</h3>
			<p class="subtitle">
				{#if mode === 'ios'}
					{#if isIosChrome}
						{$_("pwa.ios.subtitle_chrome") || "Браузер Chrome на iPhone має особливості встановлення:"}
					{:else}
						{$_("pwa.ios.subtitle") || "iPhone блокує автоматичне встановлення. Будь ласка, виконайте ці кроки:"}
					{/if}
				{:else}
					{$_("pwa.manual.subtitle") || "Ваш браузер не підтримує встановлення в один клік. Ви можете додати додаток вручну:"}
				{/if}
			</p>
		</div>

		<div class="steps">
			{#if mode === 'ios'}
				{#if isIosChrome}
					<!-- iOS Chrome (3 steps) -->
					<div class="step">
						<span class="step-num">1</span>
						<div class="step-icon"><MoreVertical size={24} /></div>
						<div class="step-text">
							<p>{$_("pwa.ios_chrome.step1") || "Натисніть на три крапки в кутку браузера"}</p>
						</div>
					</div>
					<div class="line"></div>
					<div class="step">
						<span class="step-num">2</span>
						<div class="step-icon"><Share size={24} /></div>
						<div class="step-text">
							<p>{$_("pwa.ios_chrome.step2") || "Натисніть на кнопку «Поділитися» в налаштуваннях"}</p>
						</div>
					</div>
					<div class="line"></div>
					<div class="step">
						<span class="step-num">3</span>
						<div class="step-icon"><PlusSquare size={24} /></div>
						<div class="step-text">
							<p>{$_("pwa.ios_chrome.step3") || "Виберіть «Додати на початковий екран»"}</p>
						</div>
					</div>
				{:else}
					<!-- iOS Safari (2 steps) -->
					<div class="step">
						<span class="step-num">1</span>
						<div class="step-icon"><Share size={24} /></div>
						<div class="step-text">
							<p>{$_("pwa.ios.step1") || "Натисніть кнопку «Поділитися» внизу екрана"}</p>
						</div>
					</div>
					<div class="line"></div>
					<div class="step">
						<span class="step-num">2</span>
						<div class="step-icon"><PlusSquare size={24} /></div>
						<div class="step-text">
							<p>{$_("pwa.ios.step2") || "Виберіть «На початковий екран» у меню"}</p>
						</div>
					</div>
				{/if}
			{:else if mode === 'android'}
				<div class="step">
					<span class="step-num">1</span>
					<div class="step-icon"><MoreVertical size={24} /></div>
					<div class="step-text">
						<p>{$_("pwa.android.step1") || "Натисніть на три крапки в кутку браузера"}</p>
					</div>
				</div>
				<div class="line"></div>
				<div class="step">
					<span class="step-num">2</span>
					<div class="step-icon"><MonitorDown size={24} /></div>
					<div class="step-text">
						<p>{$_("pwa.android.step2") || "Виберіть «Додати на головний екран»"}</p>
					</div>
				</div>
			{:else}
				<div class="step">
					<div class="step-icon" class:edge-icon={isEdge}>
						{#if isEdge}
							<Grid2X2Plus size={24} />
						{:else}
							<MonitorDown size={24} />
						{/if}
					</div>
					<div class="step-text">
						<p>{$_("pwa.desktop.step1") || "Натисніть на іконку встановлення в адресному рядку, праворуч від адреси url"}</p>
					</div>
				</div>
			{/if}
		</div>

		<button class="confirm-btn primary-action-btn" onclick={onclose}>
			{$_("common.ok") || "Зрозуміло"}
		</button>
	</div>
</BaseModal>

<style>
	.edge-icon {
		transform: rotate(-90deg);
		color: #0078d4;
	}

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
		gap: 0;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 16px;
		padding: 1rem;
		border: 1px solid var(--border);
	}

	.step {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.5rem 0;
		text-align: left;
	}

	.step-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 48px;
		height: 48px;
		background: rgba(58, 143, 214, 0.1);
		border-radius: 12px;
		color: #3a8fd6;
		flex-shrink: 0;
		transition: transform 0.3s;
	}

	.step-text {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.step-num {
		font-size: 1.1rem;
		font-weight: 800;
		color: var(--text-secondary);
		width: 24px;
		display: flex;
		justify-content: center;
		flex-shrink: 0;
		opacity: 0.5;
	}

	.step p {
		margin: 0;
		font-size: 0.95rem;
		color: var(--text-primary);
		line-height: 1.3;
	}

	.line {
		width: 2px;
		height: 20px;
		background: var(--border);
		margin-left: 63px; 
		opacity: 0.3;
	}

	.confirm-btn {
		width: 100%;
	}
</style>
