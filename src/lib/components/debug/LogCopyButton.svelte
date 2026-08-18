<script lang="ts">
	import { browser, dev } from "$app/environment";
	import { page } from "$app/state";
	import { logService } from "$lib/services/logService.svelte";
	import { localStorageProvider } from "$lib/services/storage/storageProvider";
	import { hardReset } from "$lib/services/resetService";
	import { Check, ClipboardCopy } from "lucide-svelte";
	import { _ } from "svelte-i18n";

	let copied = $state(false);

	/**
	 * Видимість кнопки (DEBUGGING-v8 § 2.1).
	 *
	 * Логер пише кільцевий буфер і в продакшні теж — саме заради звітів із
	 * чужих пристроїв. Але кнопка була прив'язана до `dev`, тобто зняти звіт із
	 * пристрою користувача було НЕМОЖЛИВО: буфер збирався й нікуди не дівався.
	 * Функція існувала лише на папері.
	 *
	 * Тепер у продакшні вона вмикається debug-режимом — `?debug=1` в адресі або
	 * ключ `slovko_debug_mode` = `'1'`. За замовчуванням кнопки, як і раніше,
	 * немає. У dev усе як було: видима, коли є зареєстровані помилки.
	 *
	 * Значення зі сховища читається один раз: без перезавантаження воно не
	 * змінюється, а `$derived` над ним створював би враження реактивності,
	 * якої немає.
	 */
	const debugFlag = browser && localStorageProvider.getItem("debug_mode") === "1";
	const debugMode = $derived(page.url.searchParams.get("debug") === "1" || debugFlag);
	const isVisible = $derived(dev ? logService.errorCount > 0 : debugMode);

	/**
	 * Аварійний Hard Reset: серія натискань «R».
	 *
	 * Три обмеження, і кожне закриває реальний спосіб втратити ВСІ локальні дані
	 * без жодного натискання на кнопку:
	 *
	 *   1. `e.repeat` — автоповтор клавіші дає ~30 подій за секунду, тобто
	 *      затиснута «R» набирає навіть прод-поріг у 50 менш ніж за дві секунди.
	 *   2. Поля вводу — обробник висить на `svelte:window`, тож він працює й тоді,
	 *      коли користувач друкує в пошуку, у назві плейлиста чи у формі відгуку.
	 *   3. Підтвердження в проді. `hardReset(false)` пропускає діалог, а стирає
	 *      сховище, кеші й реєстрацію service worker — це не «скидання
	 *      налаштувань», це втрата прогресу без запитання.
	 *
	 * У dev усе лишається як було: п'ять натискань і без діалогу.
	 */
	let kKeyPressCount = 0;
	let kKeyPressTimer: ReturnType<typeof setTimeout>;

	function isTypingTarget(target: EventTarget | null): boolean {
		const el = target as HTMLElement | null;
		if (!el || typeof el.closest !== "function") return false;
		return !!el.closest("input, textarea, select, [contenteditable]:not([contenteditable='false'])");
	}

	function handleGlobalKeydown(e: KeyboardEvent) {
		if (e.code === "KeyR" && !e.repeat && !isTypingTarget(e.target)) {
			kKeyPressCount++;
			clearTimeout(kKeyPressTimer);
			const threshold = dev ? 5 : 50;

			if (kKeyPressCount >= threshold) {
				hardReset(!dev);
				kKeyPressCount = 0;
			} else {
				kKeyPressTimer = setTimeout(() => {
					kKeyPressCount = 0;
				}, 2000);
			}
		} else {
			kKeyPressCount = 0;
		}
	}

	async function handleCopy() {
		const success = await logService.copyLogsToClipboard();
		if (success) {
			copied = true;
			setTimeout(() => (copied = false), 1500);
		}
	}
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

{#if isVisible}
	<button 
		class="log-fab" 
		class:copied={copied}
		onclick={handleCopy} 
		title="Копіювати звіт про помилки"
		aria-label={$_("common.copyReport")}
	>
		{#if copied}
			<Check size={18} />
		{:else if logService.errorCount > 0}
			<span class="error-count">{logService.errorCount > 99 ? '!' : logService.errorCount}</span>
		{:else}
			<!-- У debug-режимі помилок може не бути зовсім: червоний нуль читався б
			     як «одна помилка», а не як «звіт доступний». -->
			<ClipboardCopy size={16} />
		{/if}
	</button>
{/if}

<style>
	.log-fab {
		position: fixed;
		bottom: 16px;
		left: 16px;
		z-index: 9999;
		
		display: flex;
		align-items: center;
		justify-content: center;
		
		/* Стандарт V5: 32px desktop, 24px mobile (реалізовано через clamp/media) */
		width: 32px;
		height: 32px;
		
		background: #f44336;
		color: white;
		border: none;
		border-radius: 50%;
		cursor: pointer;
		
		box-shadow: 0 4px 12px rgba(244, 67, 54, 0.4);
		transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
		padding: 0;
	}

	@media (max-width: 640px) {
		.log-fab {
			width: 24px;
			height: 24px;
			bottom: 12px;
			left: 12px;
		}
	}

	.log-fab:hover {
		transform: scale(1.1);
		background: #d32f2f;
	}

	.log-fab.copied {
		background: #4caf50;
		box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
	}

	.error-count {
		font-size: 0.75rem;
		font-weight: 800;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
	}

	@media (max-width: 640px) {
		.error-count {
			font-size: 0.65rem;
		}
	}
</style>
