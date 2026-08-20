<script lang="ts">
	/**
	 * AboutModal — Про проєкт
	 */
	import { _ } from "svelte-i18n";
	import { versionStore } from "$lib/controllers/VersionStore.svelte";
	import { hardReset } from "$lib/services/resetService";
	import { pwaStore } from "$lib/controllers/PwaStore.svelte";
	import { settingsStore } from "$lib/controllers/SettingsStore.svelte";
	import { Download, Instagram, Facebook, Linkedin, Keyboard } from "lucide-svelte";
	import ThreadsIcon from "../ui/icons/ThreadsIcon.svelte";
	import FeedbackModal from "./FeedbackModal.svelte";
	import InstallGuide from "../pwa/InstallGuide.svelte";
	import BaseModal from "../ui/BaseModal.svelte";

	interface Props {
		onclose: () => void;
	}
	let { onclose }: Props = $props();

	let showFeedback = $state(false);
	let showInstallGuide = $state(false);

	async function handleHardReset() {
		await hardReset(true);
	}
</script>

<BaseModal {onclose} testid="about-modal">
	<div class="content">
		<p class="description" data-testid="about-description-text">{$_("about.description")}</p>

		<div class="social-links" data-testid="about-social-list">
			<a
				href="https://www.instagram.com/slovko.learn/"
				target="_blank"
				rel="noopener noreferrer"
				class="social-icon"
				title="Instagram"
				data-testid="about-social-link-instagram"
			>
				<Instagram size={22} />
			</a>
			<a
				href="https://www.facebook.com/slovko.learn"
				target="_blank"
				rel="noopener noreferrer"
				class="social-icon"
				title="Facebook"
				data-testid="about-social-link-facebook"
			>
				<Facebook size={22} />
			</a>
			<a
				href="https://www.linkedin.com/company/slovko/"
				target="_blank"
				rel="noopener noreferrer"
				class="social-icon"
				title="LinkedIn"
				data-testid="about-social-link-linkedin"
			>
				<Linkedin size={22} />
			</a>
			<a
				href="https://www.threads.com/@slovko.learn"
				target="_blank"
				rel="noopener noreferrer"
				class="social-icon"
				title="Threads"
				data-testid="about-social-link-threads"
			>
				<ThreadsIcon size={22} />
			</a>
		</div>

		<hr class="separator" />

		<!--
			Гарячі клавіші: перелік і перемикач в одному місці.

			Блок закриває дві різні вимоги канону одним екраном:
			• WCAG SC 2.1.4 (рівень A, HOTKEYS-v8 § 3) — одиночна літера мусить
			  мати спосіб вимкнути. Кому це потрібно: тим, хто вводить текст
			  голосом, — диктування розсипається на літери, і кожна виконує дію.
			• Виявність (§ 5) — скорочення, про яке ніде не написано, існує лише
			  для автора. Тут воно написане поруч із перемикачем.

			Службові жести (`V`, `R`) тут навмисно не згадані: вони не для
			відвідувача (§ 4, LOW), і критерій на них не поширюється — це серії
			натискань, а не одиночні клавіші.
		-->
		<div class="hotkeys" data-testid="about-hotkeys-container">
			<div class="hotkeys-head">
				<Keyboard size={18} />
				<span data-testid="about-hotkeys-title-text">{$_("settings.hotkeys.title")}</span>
			</div>

			<ul class="hotkeys-list" data-testid="about-hotkeys-list">
				<li><kbd>T</kbd> <span>{$_("settings.hotkeys.theme")}</span></li>
				<li><kbd>L</kbd> <span>{$_("settings.hotkeys.language")}</span></li>
			</ul>

			<p class="hotkeys-hint" data-testid="about-hotkeys-hint-text">
				{$_("settings.hotkeys.hint")}
			</p>

			<button
				class="link-btn hotkeys-toggle"
				class:off={!settingsStore.value.enableHotkeys}
				aria-pressed={settingsStore.value.enableHotkeys}
				onclick={() =>
					settingsStore.update({ enableHotkeys: !settingsStore.value.enableHotkeys })}
				data-testid="about-hotkeys-toggle-btn"
			>
				{settingsStore.value.enableHotkeys
					? $_("settings.hotkeys.enabled")
					: $_("settings.hotkeys.disabled")}
			</button>
		</div>

		<hr class="separator" />

		<div class="links" data-testid="about-links-container">
			{#if pwaStore.canInstall}
				<button
					class="link-btn install-btn"
					onclick={async () => {
						const result = await pwaStore.install();
						if (result === "ios" || result === "manual") {
							showInstallGuide = true;
						}
					}}
					data-testid="about-modal-install-btn"
				>
					<Download size={20} />
					{#if pwaStore.isIOS || pwaStore.isAndroid}
						{$_("pwa.install") || "Застосунок для телефону"}
					{:else}
						{$_("pwa.install_desktop") || "Застосунок для комп'ютера"}
					{/if}
				</button>
			{/if}

			<a
				href="https://send.monobank.ua/jar/7sCsydhJnR"
				target="_blank"
				rel="noopener noreferrer"
				class="link-btn donate"
				data-testid="about-modal-donate-link"
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

		<div class="version-wrapper" data-testid="about-version-container">
			<span class="version-text" data-testid="about-version-text">
				{$_("about.version")}: {versionStore.currentVersion || "0.1"}
			</span>
		</div>

		<button
			class="confirm-btn primary-action-btn"
			onclick={onclose}
			data-testid="about-back-btn"
		>
			{$_("common.backToLearning")}
		</button>
	</div>
</BaseModal>

{#if showFeedback}
	<FeedbackModal onclose={() => (showFeedback = false)} />
{/if}

{#if showInstallGuide}
	<InstallGuide onclose={() => (showInstallGuide = false)} />
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

	/* Іконки соцмереж у рядок із фіксованим `gap: 1.5rem` вилазили за модалку
	   на вузькому екрані: рядок не переносився, а проміжок не стискався.
	   Тепер проміжок ведений шириною вікна, а якщо й цього мало — рядок
	   переноситься замість того, щоб обрізатися. */
	.social-links {
		display: flex;
		justify-content: center;
		flex-wrap: wrap;
		gap: clamp(0.6rem, 4vw, 1.5rem);
		padding: 0.5rem 0;
	}

	.social-icon {
		color: var(--text-primary);
		transition: all var(--hover-transition);
		opacity: 0.85;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.75rem;
		border-radius: 16px;
		background: var(--glass-bg);
		border: 1px solid var(--glass-border);
		backdrop-filter: blur(var(--glass-blur));
	}

	.social-icon:hover {
		opacity: 1;
		transform: scale(var(--hover-scale));
		color: white;
		background: var(--accent);
		border-color: var(--accent);
		box-shadow: var(--shadow-md);
		z-index: 2;
	}

	/*
		Розміри в `rem` і `clamp` без жодного `vh`: блок живе всередині модалки,
		яка вже масштабується (FLUID-SIZING-v8 § 2). Своєї висоти від екрана він
		не має, тож і рахувати її нема з чого.
	*/
	.hotkeys {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
	}

	.hotkeys-head {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.hotkeys-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		width: 100%;
		max-width: 280px;
	}

	.hotkeys-list li {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		color: var(--text-secondary);
		font-size: 0.9rem;
	}

	.hotkeys-list kbd {
		flex: 0 0 auto;
		min-width: 1.75rem;
		padding: 0.15rem 0.4rem;
		border: 1px solid var(--border);
		border-radius: 6px;
		background: var(--bg-primary);
		color: var(--text-primary);
		font-family: inherit;
		font-size: 0.8rem;
		font-weight: 700;
		text-align: center;
	}

	.hotkeys-hint {
		margin: 0;
		max-width: 280px;
		color: var(--text-secondary);
		font-size: 0.8rem;
		text-align: center;
		opacity: 0.85;
	}

	.hotkeys-toggle {
		background: var(--bg-primary);
		color: var(--text-primary);
		border-color: var(--border);
	}

	/* Вимкнений стан читається не лише кольором: напис змінюється теж
	   (ACCESSIBILITY-v8 § 6 — колір не буває єдиним носієм змісту). */
	.hotkeys-toggle.off {
		opacity: 0.7;
	}

	.separator {
		border: none;
		height: 1px;
		background: linear-gradient(
			90deg,
			transparent,
			var(--border),
			transparent
		);
		margin: 0.5rem 0;
		opacity: 0.5;
	}

	.links {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		align-items: center;
	}

	.link-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.75rem 1.5rem;
		border-radius: 12px;
		text-decoration: none;
		font-weight: 600;
		transition: all var(--hover-transition);
		width: 100%;
		max-width: 280px;
		border: 2px solid transparent;
		cursor: pointer;
		font-size: 1rem;
		font-family: inherit;
		gap: 0.5rem;
	}

	.donate {
		background: var(--accent);
		color: white;
		box-shadow: var(--shadow-sm);
	}

	.donate:hover {
		transform: scale(var(--hover-scale));
		box-shadow: var(--shadow-md);
		z-index: 2;
	}

	.install-btn {
		background: var(--bg-secondary);
		color: var(--text-primary);
		border: 1px solid var(--accent);
	}

	.install-btn:hover {
		background: var(--selected-bg);
		transform: scale(var(--hover-scale));
		z-index: 2;
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
		max-width: 280px;
		align-self: center;
	}
</style>
