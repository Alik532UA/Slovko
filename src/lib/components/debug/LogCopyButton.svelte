<script lang="ts">
	import { browser, building, dev } from "$app/environment";
	import { page } from "$app/state";
	import { onDestroy } from "svelte";
	import { debugMode } from "$lib/services/debugMode.svelte";
	import { createKeySequence } from "$lib/services/keySequence";
	import { logService } from "$lib/services/logService.svelte";
	import { hardReset } from "$lib/services/resetService";
	import { Check, Copy, Bug, Eye, RotateCcw, EyeOff } from "lucide-svelte";
	import { _, isLoading, locale } from "svelte-i18n";
	import { dictionaryReady } from "$lib/i18n/dictionaryReady";
	import ErrorLogModal from "./ErrorLogModal.svelte";

	let copied = $state(false);
	let copyTimer: ReturnType<typeof setTimeout> | undefined;
	let showMenu = $state(false);
	let isModalOpen = $state(false);
	let userDismissed = $state(false);
	let menuX = $state(16);
	let menuY = $state(60);

	const appVersion =
		typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "unknown";

	const LABEL = "Копіювати звіт про роботу / Copy report";
	const RESET_CONFIRM_FALLBACK =
		"Це видалить УСІ локальні дані, кукі та кеш цього застосунку. Продовжити? / " +
		"This will delete ALL local data, cookies and cache of this app. Continue?";

	const resetConfirm = $derived(
		dictionaryReady($locale, $isLoading)
			? $_("settings.dangerZone.confirmHardReset")
			: RESET_CONFIRM_FALLBACK,
	);

	const urlDebug = $derived(
		!building && browser && page.url.searchParams.get("debug") === "1",
	);
	const isVisible = $derived((urlDebug || debugMode.enabled) && !userDismissed);

	const versionSequence = createKeySequence({
		code: "KeyV",
		threshold: () => debugMode.pressesToToggle,
		onComplete: () => {
			userDismissed = false;
			logService.log(
				"system",
				`Табло ${debugMode.toggle() ? "показано" : "сховано"}`,
			);
		},
	});

	const resetSequence = createKeySequence({
		code: "KeyR",
		threshold: dev ? 5 : 55,
		onComplete: () => void hardReset(dev ? null : resetConfirm),
	});

	function handleGlobalKeydown(event: KeyboardEvent) {
		versionSequence.handle(event);
		resetSequence.handle(event);
		if (event.key === "Escape" && showMenu) {
			showMenu = false;
		}
	}

	onDestroy(() => {
		if (copyTimer) clearTimeout(copyTimer);
		versionSequence.reset();
		resetSequence.reset();
	});

	let fallbackReport = $state<string | null>(null);

	async function handleCopy() {
		const success = await logService.copyLogsToClipboard();
		if (success) {
			fallbackReport = null;
			copied = true;
			copyTimer = setTimeout(() => (copied = false), 1500);
		} else {
			fallbackReport = logService.getFormattedReport();
		}
	}

	function openMenu(e: MouseEvent) {
		e.stopPropagation();
		const target = e.currentTarget as HTMLElement | null;
		const rect = target?.getBoundingClientRect();
		if (rect) {
			menuX = rect.left;
			menuY = Math.max(8, rect.top - 180);
		}
		showMenu = !showMenu;
	}

	function handleCopyReport() {
		showMenu = false;
		void handleCopy();
	}

	function handleViewErrors() {
		showMenu = false;
		isModalOpen = true;
	}

	function handleClearLogs() {
		showMenu = false;
		logService.clear();
	}

	function handleHideBadge() {
		showMenu = false;
		userDismissed = true;
		if (debugMode.enabled) {
			debugMode.toggle();
		}
	}
</script>

<svelte:window onkeydown={handleGlobalKeydown} onclick={() => { if (showMenu) showMenu = false; }} />

{#if fallbackReport}
	<textarea
		class="log-fallback"
		readonly
		value={fallbackReport}
		aria-label={LABEL}
		data-testid="debug-log-fallback-input"
	></textarea>
{/if}

{#if isVisible}
	<button
		type="button"
		class="log-fab"
		class:has-errors={logService.errorCount > 0}
		class:copied
		onclick={openMenu}
		oncontextmenu={(e) => { e.preventDefault(); openMenu(e); }}
		aria-label={`${LABEL} — ${appVersion}`}
		aria-haspopup="menu"
		aria-expanded={showMenu}
		data-testid="app-version-value"
	>
		{#if copied}
			<Check size={14} class="hint-icon" />
		{:else if logService.errorCount > 0}
			<span class="error-count"
				>{logService.errorCount > 99 ? "99+" : logService.errorCount}</span
			>
		{:else}
			<Copy size={12} class="hint-icon" />
		{/if}
		<span class="version">{appVersion}</span>
	</button>

	{#if showMenu}
		<div
			class="context-menu"
			role="menu"
			tabindex="-1"
			style="left: {menuX}px; top: {menuY}px;"
			data-testid="service-badge-context-menu"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => { if (e.key === 'Escape') showMenu = false; }}
		>
			<button
				type="button"
				role="menuitem"
				class="menu-item"
				onclick={handleCopyReport}
				data-testid="service-badge-copy-report-btn"
			>
				<Copy size={14} />
				<span>Скопіювати повний звіт</span>
			</button>
			<button
				type="button"
				role="menuitem"
				class="menu-item"
				onclick={handleViewErrors}
				data-testid="service-badge-view-errors-btn"
			>
				<Eye size={14} />
				<span>Переглянути помилки ({logService.errorCount})</span>
			</button>
			<button
				type="button"
				role="menuitem"
				class="menu-item"
				onclick={handleClearLogs}
				data-testid="service-badge-clear-btn"
			>
				<RotateCcw size={14} />
				<span>Скинути лічильник</span>
			</button>
			<button
				type="button"
				role="menuitem"
				class="menu-item menu-item--hide"
				onclick={handleHideBadge}
				data-testid="service-badge-hide-btn"
			>
				<EyeOff size={14} />
				<span>Приховати табло</span>
			</button>
		</div>
	{/if}

	<ErrorLogModal isOpen={isModalOpen} onclose={() => (isModalOpen = false)} />
{/if}

<style>
	.log-fab { position: fixed; bottom: 16px; left: 16px; z-index: 9999; display: flex; align-items: center; justify-content: center; gap: 4px; min-height: 32px; padding: 0 8px; border-radius: 16px; background: var(--card-bg); color: var(--text-primary); border: 2px solid var(--card-border); cursor: pointer; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3); transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
	.log-fab:hover { transform: scale(1.05); }
	.version { font-size: 10px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; line-height: 1; white-space: nowrap; }
	.log-fab :global(.hint-icon) { opacity: 0.6; flex: none; }
	.log-fab.has-errors { background: #c92a2a; color: white; border-color: #7f1d1d; box-shadow: 0 4px 12px rgba(201, 42, 42, 0.4); }
	.log-fab.copied { background: #237a35; color: white; border-color: #1b5e20; box-shadow: 0 4px 12px rgba(47, 158, 68, 0.4); }
	.error-count { font-size: 0.75rem; font-weight: 800; line-height: 1; padding: 2px 5px; border-radius: 8px; background: #7f1d1d; color: white; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
	@media (hover: none) {
		.log-fab { min-height: 44px; padding: 0 12px; border-radius: 22px; }
		.version { font-size: 12px; }
		.error-count { font-size: 0.9rem; }
	}
	.log-fallback { position: fixed; bottom: 76px; left: 16px; width: min(38rem, calc(100vw - 32px)); height: min(40dvh, 20rem); z-index: 9999; padding: 8px; font-family: monospace; font-size: 0.75rem; background: #1e1e1e; color: #ffffff; border: 2px solid #ef4444; border-radius: 8px; resize: none; }
	.context-menu { position: fixed; z-index: 10000; background: #1e1e24; border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 10px; padding: 6px; display: flex; flex-direction: column; gap: 2px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4); min-width: 210px; }
	.menu-item { display: flex; align-items: center; gap: 8px; padding: 8px 12px; font-size: 0.8125rem; color: #f1f5f9; background: transparent; border: none; border-radius: 6px; cursor: pointer; text-align: left; transition: background 0.15s ease; }
	.menu-item:hover { background: rgba(255, 255, 255, 0.08); }
	.menu-item--hide { color: #94a3b8; border-top: 1px solid rgba(255, 255, 255, 0.08); margin-top: 4px; padding-top: 8px; }
	@media (prefers-reduced-motion: reduce) { .log-fab, .menu-item { transition: none; } }
</style>
