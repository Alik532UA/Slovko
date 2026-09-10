<script lang="ts">
	import { _ } from "svelte-i18n";
	import { fade, scale } from "svelte/transition";
	import { X } from "lucide-svelte";
	import { onMount, onDestroy, type Snippet } from "svelte";

	interface Props {
		onclose: () => void;
		testid: string;
		children: Snippet;
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

	let modalEl = $state<HTMLElement | null>(null);

	/**
	 * Куди повернути фокус, коли вікно закриється.
	 *
	 * Без цього фокус після закриття падає на `<body>`, і наступний Tab
	 * починає обхід сторінки з початку — тобто той, хто відкрив вікно з
	 * клавіатури, після виходу опиняється не там, звідки прийшов. Це не
	 * теорія: у застосунку вікна відкриваються з нижньої панелі, тобто з
	 * кінця обходу, і повернення «на початок» коштує десятків натискань.
	 */
	let returnFocusTo: HTMLElement | null = null;

	onMount(() => {
		document.body.style.overflow = "hidden";
		returnFocusTo =
			document.activeElement instanceof HTMLElement ? document.activeElement : null;
		// Фокусуємо модалку при відкритті
		modalEl?.focus();
	});

	onDestroy(() => {
		document.body.style.overflow = "";
		// `isConnected`: елемент, який відкрив вікно, міг зникнути разом зі
		// зміною екрана — тоді повертати нікуди, і типова поведінка краща за
		// виняток.
		if (returnFocusTo?.isConnected) returnFocusTo.focus();
	});

	/** Клік МИМО вікна. Клік по самому вікну сюди не доходить — його спиняє `.modal`. */
	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) onclose();
	}

	/**
	 * Що вважається зупинкою табуляції всередині вікна.
	 *
	 * `getClientRects().length`, а не `offsetParent`: друге дає `null` для
	 * `position: fixed`, тобто мовчки викинуло б із пастки саме ті контроли,
	 * що лежать над вмістом.
	 */
	const FOCUSABLE =
		'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

	function focusableItems(): HTMLElement[] {
		if (!modalEl) return [];
		return [...modalEl.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
			(el) => el.getClientRects().length > 0,
		);
	}

	/**
	 * Escape закриває, Tab не випускає (ACCESSIBILITY-v8 § 10.2, WCAG 2.4.3).
	 *
	 * `aria-modal="true"` каже читалці, що поза вікном нічого немає, — але
	 * ТАБУЛЯЦІЮ він не тримає: браузер продовжує обхід по сторінці позаду.
	 * Тобто вікно було модальним для читалки й не було для клавіатури, і
	 * кілька натискань Tab виводили фокус на невидимі контроли гри під
	 * накладкою.
	 *
	 * Обробник ОДИН і стоїть на тлі: подія спливає туди від будь-якого
	 * елемента вікна. Доти такий самий висів ще й на `.modal`, і Escape
	 * викликав `onclose()` ДВІЧІ — на одних вікнах це нічого не міняло, на
	 * тих, що закриваються навігацією, додавало зайвий запис в історію.
	 *
	 * Якщо фокусованих елементів немає взагалі, пастка не вмикається:
	 * `preventDefault()` без `focus()` замкнув би Tab у порожнечу.
	 */
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === "Escape") {
			onclose();
			return;
		}
		if (e.key !== "Tab") return;

		const items = focusableItems();
		if (items.length === 0) return;

		const first = items[0];
		const last = items[items.length - 1];
		const active = document.activeElement;

		// `active === modalEl` — стан одразу після відкриття: фокус на самому
		// вікні, і Shift+Tab пішов би з нього назад на сторінку.
		if (e.shiftKey && (active === first || active === modalEl)) {
			e.preventDefault();
			last.focus();
		} else if (!e.shiftKey && active === last) {
			e.preventDefault();
			first.focus();
		}
	}
</script>

<!--
	Тло — НЕ кнопка (ACCESSIBILITY-v8 § 10.1, axe `nested-interactive`).

	Тут стояли `role="button"`, `tabindex="0"` і `aria-label="Закрити"` — на
	елементі, ВСЕРЕДИНІ якого лежить усе вікно з власними кнопками. Наслідків
	було два, і обидва невидимі в коді: axe рахував порушення «фокусовані
	нащадки в елементі з роллю віджета» на КОЖНОМУ з чотирнадцяти вікон, а
	читалка оголошувала ціле вікно як «Закрити, кнопка» й давала перед ним
	мертву зупинку табуляції. Той самий дефект, що 2026-08-28 знайшовся в
	`BaseTooltip`, тільки на два порядки помітніший.

	Клік мимо лишається — це вказівникова зручність, а не єдиний спосіб вийти:
	з клавіатури працюють Escape і справжня кнопка «×» усередині. Саме тому
	клавіатурного еквівалента цьому `onclick` не потрібно — він нічого не додає
	до того, що вже є, і зразок стоїть поруч, у `GameStats.svelte`.

	`onkeydown` тут ОДИН на все вікно: подія спливає на тло від будь-якого
	елемента всередині, і саме тут живуть і Escape, і пастка табуляції.
-->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="modal-backdrop"
	transition:fade={{ duration: 200 }}
	onclick={handleBackdropClick}
	onkeydown={handleKeydown}
	data-testid="{testid}-backdrop"
>
	<!--
		Обґрунтування: єдине призначення цього `onclick` — `stopPropagation`,
		щоб клік ВНУТРІШНЬОЮ частиною вікна не дійшов до тла й не закрив його.
		Це не дія, а щит; клавіатурного еквівалента в нього немає й бути не
		може, бо клавіатурі нема чим «промахнутися». Escape і пастка табуляції
		живуть на тлі, куди події з вікна спливають самі. Той самий блок
		стоїть над тим самим щитом у `UpdateNotification.svelte`.
	-->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		bind:this={modalEl}
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
				aria-label={$_("common.close")}
			>
				<X size={24} />
			</button>
		{/if}

		<div class="modal-content" data-testid="{testid}-panel">
			{@render children()}
		</div>
	</div>
</div>

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		z-index: 10100;
		background: var(--backdrop-bg);
		backdrop-filter: blur(var(--glass-blur));
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-start;
		padding: 5dvh 1.5rem;
		overflow-y: auto;
		transition: background-color 0.3s ease;
	}

	.modal {
		background: transparent;
		width: 100%;
		position: relative;
		color: var(--text-primary);
		padding: 3.5rem 1.5rem 1.5rem;
		margin: 0 auto;
		box-sizing: border-box;
	}

	.close-btn {
		position: absolute;
		top: 0.75rem;
		right: 0.75rem;
		background: transparent;
		color: var(--text-secondary);
		padding: 0.5rem;
		border-radius: 50%;
		z-index: 10;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.close-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		color: var(--text-primary);
	}

	.modal-content {
		width: 100%;
	}

	@media (max-width: 480px) {
		.modal {
			padding: 3rem 1rem 1.5rem;
		}
		.close-btn {
			top: 0.5rem;
			right: 0.5rem;
		}
	}
</style>
