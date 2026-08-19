<script lang="ts">
	import { browser, building, dev } from "$app/environment";
	import { page } from "$app/state";
	import { onDestroy } from "svelte";
	import { debugMode } from "$lib/services/debugMode.svelte";
	import { createKeySequence } from "$lib/services/keySequence";
	import { logService } from "$lib/services/logService.svelte";
	import { hardReset } from "$lib/services/resetService";
	import { Check, ClipboardCopy } from "lucide-svelte";

	/**
	 * Службове табло: номер версії, лічильник помилок і збір звіту — ОДИН елемент.
	 *
	 * **Форма змінюється, місце — ні.** У спокої це капсула з номером версії; коли
	 * є помилки — червоний кружок із їхньою кількістю; після копіювання — галочка.
	 * Доти номера версії тут не було: його показувало лише вікно «Про застосунок»,
	 * тобто на скріншоті збою версії не було видно ніколи.
	 *
	 * **Видимість (DEBUGGING-v8 § 2.1, із відхиленням).** У dev табло видиме
	 * ЗАВЖДИ, а не лише за наявності помилок, як приписує канон: воно тепер несе
	 * номер версії, а його ховати нема сенсу. Доти в dev воно зʼявлялося лише при
	 * помилці — тобто найчастіше потрібна річ, «яка версія на екрані?», місця на
	 * екрані не мала.
	 *
	 * **Три входи, і вони навмисно різні за природою.** `?debug=1` в адресі
	 * працює на телефоні й пересилається посиланням; серія натискань `V` — для
	 * того, хто вже сидить за клавіатурою; збережений прапорець переживає
	 * перезавантаження. На дотику серія недосяжна, і саме тому адресний параметр
	 * лишається: інакше версію на телефоні не побачив би ніхто.
	 */
	let copied = $state(false);
	let copyTimer: ReturnType<typeof setTimeout> | undefined;

	const appVersion =
		typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "unknown";

	/**
	 * Підпис НЕ через i18n, і це те саме рішення, що й у тексті підтвердження
	 * `hardReset`.
	 *
	 * Причина не в лінощах перекладу, а в порядку запуску. Табло малюється вище за
	 * гейт готовності, тобто на кожній сторінці й ДО того, як `svelte-i18n`
	 * отримає початкову локаль. `$_(…)` у цій точці кидає «Cannot format a message
	 * without first setting the initial locale» — і кидає з кореневого layout,
	 * тобто валить застосунок цілком. Доти цього не було видно рівно тому, що в dev
	 * кнопка зʼявлялася лише ПІСЛЯ першої помилки, а на той час локаль уже стояла.
	 *
	 * Друга причина важливіша за першу: службовий елемент існує, щоб зняти звіт
	 * тоді, коли застосунок зламався. Підпис, який залежить від того, чи
	 * завантажилися переклади, не дозволив би повідомити саме про зламані переклади.
	 */
	const LABEL = "Копіювати звіт про роботу / Copy report";

	/*
	 * `building` обов'язковий: під час пререндеру рядок запиту невідомий, і
	 * SvelteKit кидає на `url.searchParams`, а не віддає порожнє значення.
	 * Кнопка малюється вище за гейт готовності, тобто на КОЖНІЙ сторінці — тож
	 * без цієї умови жодна сторінка з увімкненим SSR не збирається взагалі.
	 * Знайшлося це рівно так: сторінка чеклиста бета-тестування — перша, якій
	 * SSR потрібен (їй треба доставити `noindex` у зібраний HTML), — валила
	 * збірку з «500» і стеком у чужому файлі.
	 */
	const urlDebug = $derived(
		!building && browser && page.url.searchParams.get("debug") === "1",
	);
	/*
	 * `?debug=1` діє ПОВЕРХ збереженого стану: посилання з ним мусить показати
	 * табло навіть тому, хто раніше сховав його серією натискань. Інакше
	 * найнадійніший шлях (єдиний досяжний на телефоні) можна було б заблокувати
	 * назавжди.
	 */
	const isVisible = $derived(urlDebug || debugMode.enabled);

	/**
	 * Серія `V` ПЕРЕМИКАЄ табло, а поріг залежить від напрямку.
	 *
	 * Функція, а не число: після спрацювання потрібний поріг інший (щойно табло
	 * стало видимим, сховати його коштує 5, а не 55). Перестворювати
	 * послідовність на кожну зміну стану означало б губити половину набраної серії.
	 */
	const versionSequence = createKeySequence({
		code: "KeyV",
		threshold: () => debugMode.pressesToToggle,
		onComplete: () =>
			logService.log(
				"system",
				`Табло ${debugMode.toggle() ? "показано" : "сховано"}`,
			),
	});

	/**
	 * Серія `R` — аварійне скидання.
	 *
	 * Поріг у проді 55, а не 50: те саме число, що й у решти проєктів на цьому
	 * origin. Різні числа для того самого жесту — це не налаштування, а те, що
	 * доводиться згадувати на кожному сайті окремо.
	 *
	 * `hardReset(true)` у проді питає підтвердження: разом із порогом це два
	 * незалежні барʼєри перед знищенням місцевого прогресу, і жоден не
	 * покладається на уважність.
	 */
	const resetSequence = createKeySequence({
		code: "KeyR",
		threshold: dev ? 5 : 55,
		onComplete: () => void hardReset(!dev),
	});

	function handleGlobalKeydown(event: KeyboardEvent) {
		// Обидві серії отримують КОЖНУ подію, включно з тією, що завершила сусідню:
		// інакше `V` не скидала б набране в `R`, і серія перестала б бути серією.
		versionSequence.handle(event);
		resetSequence.handle(event);
	}

	onDestroy(() => {
		if (copyTimer) clearTimeout(copyTimer);
		versionSequence.reset();
		resetSequence.reset();
	});

	async function handleCopy() {
		const success = await logService.copyLogsToClipboard();
		if (success) {
			copied = true;
			copyTimer = setTimeout(() => (copied = false), 1500);
		}
	}
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

{#if isVisible}
	<button
		type="button"
		class="log-fab"
		class:has-errors={logService.errorCount > 0}
		class:copied
		onclick={handleCopy}
		aria-label={`${LABEL} — ${appVersion}`}
		data-testid="app-version-value"
	>
		<!-- Номер версії — поза гілками: лічильник ДОДАЄТЬСЯ до нього, а не заміняє
		     його. Інакше на dev, де помилка буває майже завжди, версії не видно. -->
		{#if copied}
			<Check size={14} class="hint-icon" />
		{:else if logService.errorCount > 0}
			<span class="error-count"
				>{logService.errorCount > 99 ? "99+" : logService.errorCount}</span
			>
		{:else}
			<!-- У debug-режимі помилок може не бути зовсім: червоний нуль читався б
			     як «одна помилка», а не як «звіт доступний». -->
			<ClipboardCopy size={12} class="hint-icon" />
		{/if}
		<span class="version">{appVersion}</span>
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
		gap: 4px;

		/* Капсула: номер версії в коло 32px не влазить. */
		min-height: 32px;
		padding: 0 8px;
		border-radius: 16px;

		background: var(--card-bg);
		color: var(--text-primary);
		border: 2px solid var(--card-border);
		cursor: pointer;

		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
		transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.log-fab:hover {
		transform: scale(1.05);
	}

	.version {
		font-size: 10px;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
			monospace;
		line-height: 1;
		/* Номер читає той, хто дивиться на скріншот, тож він не має «розсипатися». */
		white-space: nowrap;
	}

	/*
	 * Іконка копіювання — підказка, що капсула клікабельна, а не окрема дія. Тому
	 * вона дрібніша за номер і тане: головне тут число версії.
	 */
	.log-fab :global(.hint-icon) {
		opacity: 0.6;
		flex: none;
	}

	/*
	 * Форма НЕ змінюється між станами: капсула лишається капсулою, бо номер версії
	 * лишається на місці. Доти помилки перетворювали табло на кружок 32px — зникала не
	 * лише версія, а й упізнаваність елемента.
	 */

	/*
	 * Червоний темніший за #f44336 — за WCAG AA, не за смаком: білий текст на
	 * попередньому давав 3.7:1 при потрібних 4.5. Тепер 5.46:1. Лічильник помилок
	 * — це та плашка, яку читають саме тоді, коли щось пішло не так, тобто
	 * найгірший кандидат на «майже читно». Літерали, а не токени теми: сигнал «є
	 * помилки» мусить виглядати однаково в усіх чотирьох темах.
	 */
	.log-fab.has-errors {
		background: #c92a2a;
		color: white;
		border-color: #7f1d1d;
		box-shadow: 0 4px 12px rgba(201, 42, 42, 0.4);
	}

	/* Зелений — за тим самим правилом: #2f9e44 давав під білим 3.45:1, #237a35 дає 5.38:1. */
	.log-fab.copied {
		background: #237a35;
		color: white;
		border-color: #1b5e20;
		box-shadow: 0 4px 12px rgba(47, 158, 68, 0.4);
	}

	/*
	 * Лічильник — плашка ПЕРЕД номером, а не текст замість нього. Темніший червоний за
	 * тло капсули (#7f1d1d на #c92a2a): білий текст дає на ньому 10:1.
	 */
	.error-count {
		font-size: 0.75rem;
		font-weight: 800;
		line-height: 1;
		padding: 2px 5px;
		border-radius: 8px;
		background: #7f1d1d;
		color: white;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
			monospace;
	}

	/*
	 * Розмір залежить від СПОСОБУ ВВЕДЕННЯ, а не від ширини вікна: на десктопі
	 * 600px кнопка лишалася б маленькою для миші, а на планшеті 1024px —
	 * маленькою для дотику (ACCESSIBILITY-v8 § 8, DEBUGGING-v8 § 2.2). Доти тут
	 * стояв `max-width: 640px`, який ЗМЕНШУВАВ кнопку до 24px саме там, де
	 * потрібні 44.
	 */
	@media (hover: none) {
		.log-fab {
			min-height: 44px;
			padding: 0 12px;
			border-radius: 22px;
		}

		.version {
			font-size: 12px;
		}

		.error-count {
			font-size: 0.9rem;
		}
	}
</style>
