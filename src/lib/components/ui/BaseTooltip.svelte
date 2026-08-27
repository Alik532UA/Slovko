<script lang="ts">
	import { fade } from "svelte/transition";
	import { browser } from "$app/environment";
	import { portal } from "$lib/utils/actions/portal";
	import type { Snippet } from "svelte";

	interface Props {
		text: string;
		children: Snippet;
	}

	let { text, children }: Props = $props();

	let isVisible = $state(false);
	let triggerEl = $state<HTMLElement | null>(null);
	let tooltipEl = $state<HTMLElement | null>(null);

	const tooltipId = $props.id();

	/**
	 * ЧИ ПОТРІБНА ОБГОРТЦІ ВЛАСНА ЗУПИНКА ФОКУСУ — і чому це питання взагалі є.
	 *
	 * Доти обгортка ЗАВЖДИ несла `role="button"`, `tabindex="0"` і
	 * `aria-label={text}`. Кнопкою вона при цьому не була ніколи: обробника
	 * натискання в неї немає, тож Enter і Пробіл на ній не роблять нічого.
	 *
	 * Коли всередині справжня кнопка (а це більшість ужитків — «Меню»,
	 * «Підказка», «Наступний рівень»), виходило три різні дефекти з одного
	 * рядка:
	 *
	 *   1. `nested-interactive` — WCAG 4.1.2: фокусований елемент усередині
	 *      фокусованого. Axe називав п'ять вузлів на кожному з трьох станів;
	 *   2. МЕРТВА ЗУПИНКА ФОКУСУ. Клавіатурний користувач потрапляв на
	 *      обгортку, чув «Меню, кнопка», тиснув Enter — нічого. Далі Tab, і
	 *      лише тоді справжня кнопка, яка теж називається «Меню». Тобто кожна
	 *      підказка коштувала зайвого Tab і одного натискання в порожнечу;
	 *   3. `aria-label` обгортки дублював `aria-label` кнопки СЛОВО В СЛОВО —
	 *      підказка й підпис кнопки в цьому проєкті беруть той самий ключ.
	 *
	 * Але прибрати `tabindex` беззастережно не можна: дві підказки обгортають
	 * `<div>` зі статистикою (серія, точність), і для них обгортка — ЄДИНИЙ
	 * спосіб дістатися підказки з клавіатури (WCAG 1.4.13).
	 *
	 * Тому питання вирішується не на око, а вимірюванням: якщо всередині вже є
	 * що фокусувати — обгортка суто оформлювальна, підказка лишається візуальною
	 * (її текст читалка й так почує з підпису кнопки). Якщо ні — обгортка стає
	 * зупинкою фокусу з `aria-describedby` на сам тултіп, тобто описом до
	 * значення, а не підробленою кнопкою.
	 */
	const FOCUSABLE =
		'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';
	let needsOwnFocus = $state(false);

	$effect(() => {
		// Читаємо `children` навмисно: інакше ефект не перерахується, коли вміст
		// підказки змінюється з кнопки на заглушку (`BottomBar`, крайній рівень).
		void children;
		needsOwnFocus = triggerEl ? !triggerEl.querySelector(FOCUSABLE) : false;
	});
	
	let coords = $state({ top: 0, left: 0, arrowLeft: 50, maxWidth: 300, placement: 'top' });

	function updatePosition() {
		if (!triggerEl || !tooltipEl || !browser) return;

		const triggerRect = triggerEl.getBoundingClientRect();
		const screenWidth = window.innerWidth;
		const screenHeight = window.innerHeight;
		const padding = 12;

		// 1. Встановлюємо maxWidth заздалегідь
		const availableWidth = screenWidth - (padding * 2);
		coords.maxWidth = Math.min(availableWidth, 280);

		// 2. Вимірюємо розміри тултіпа
		const tooltipRect = tooltipEl.getBoundingClientRect();

		// 3. Визначаємо вертикальну позицію (Flip logic)
		const spaceAbove = triggerRect.top;
		const spaceBelow = screenHeight - triggerRect.bottom;
		
		let placement = 'top';
		if (spaceAbove < tooltipRect.height + 20 && spaceBelow > spaceAbove) {
			placement = 'bottom';
		}
		coords.placement = placement;

		// 4. Розраховуємо X та Y
		let left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
		let top = placement === 'top' 
			? triggerRect.top - tooltipRect.height - 10
			: triggerRect.bottom + 10;

		// 5. Clamping X (горизонтальні межі)
		if (left < padding) left = padding;
		if (left + tooltipRect.width > screenWidth - padding) {
			left = screenWidth - tooltipRect.width - padding;
		}

		// 6. Розраховуємо позицію стрілки
		const triggerCenter = triggerRect.left + triggerRect.width / 2;
		const arrowLeftRelative = triggerCenter - left;
		const arrowLeftPercent = Math.max(15, Math.min(85, (arrowLeftRelative / tooltipRect.width) * 100));

		coords = {
			top: top + window.scrollY,
			left: left + window.scrollX,
			arrowLeft: arrowLeftPercent,
			maxWidth: coords.maxWidth,
			placement
		};
	}

	import { throttle } from "$lib/utils/throttle";

	const throttledUpdatePosition = throttle(updatePosition, 100);

	function show() {
		isVisible = true;
		// Подвійний прохід для ідеального позиціонування
		setTimeout(() => {
			updatePosition();
			requestAnimationFrame(updatePosition);
		}, 0);
	}

	function hide() {
		isVisible = false;
	}

	$effect(() => {
		if (isVisible) {
			window.addEventListener('resize', throttledUpdatePosition);
			window.addEventListener('scroll', throttledUpdatePosition, { passive: true });
			return () => {
				window.removeEventListener('resize', throttledUpdatePosition);
				window.removeEventListener('scroll', throttledUpdatePosition);
			};
		}
	});
</script>

<!--
	`focusin`/`focusout`, а не `focus`/`blur`: перші СПЛИВАЮТЬ, тож підказка
	з'являється й тоді, коли фокус отримала кнопка всередині, а обгортка вже
	нічого не ловить сама.

	`role="group"` — те, чим обгортка є насправді: вона об'єднує контрол із його
	описом. Доти тут стояло `role="button"` при повній відсутності обробника
	натискання, тобто роль описувала не поведінку, а зовнішній вигляд.

	Придушення нижче: правило вважає фокус на нечитабельному елементі помилкою,
	і майже завжди так і є. Виняток тут точковий і вирішується в рантаймі —
	`tabindex` з'являється ЛИШЕ тоді, коли всередині немає нічого фокусованого
	(дві плитки статистики). Для них це єдиний спосіб дістатися підказки з
	клавіатури: WCAG 1.4.13 вимагає саме цього, а `aria-describedby` робить її
	описом до значення, а не підробленою кнопкою. Коли всередині кнопка,
	атрибута немає взагалі — і зайвої зупинки фокусу теж.
-->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
	bind:this={triggerEl}
	class="tooltip-trigger"
	role="group"
	onmouseenter={show}
	onmouseleave={hide}
	onfocusin={show}
	onfocusout={hide}
	tabindex={needsOwnFocus ? 0 : undefined}
	aria-describedby={needsOwnFocus ? tooltipId : undefined}
>
	{@render children()}
</div>

{#if isVisible && text}
	<div
		use:portal
		bind:this={tooltipEl}
		id={tooltipId}
		class="tooltip-content {coords.placement}"
		style:top="{coords.top}px"
		style:left="{coords.left}px"
		style:max-width="{coords.maxWidth}px"
		style:--arrow-left="{coords.arrowLeft}%"
		transition:fade={{ duration: 150 }}
		role="tooltip"
	>
		{text}
	</div>
{/if}

<style>
	.tooltip-trigger {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
	}

	.tooltip-content {
		position: absolute;
		background: var(--tooltip-bg);
		color: var(--tooltip-text);
		padding: 0.6rem 1rem;
		border-radius: 12px;
		font-size: 0.85rem;
		line-height: 1.4;
		z-index: 200000;
		pointer-events: none;
		backdrop-filter: blur(var(--glass-blur));
		border: 1px solid var(--glass-border);
		box-shadow: var(--shadow-lg);
		font-weight: 600;
		text-align: center;
		white-space: normal; 
		word-wrap: break-word;
	}

	.tooltip-content::after {
		content: '';
		position: absolute;
		border: 6px solid transparent;
		left: var(--arrow-left);
		transform: translateX(-50%);
	}

	.tooltip-content.top::after {
		top: 100%;
		border-top-color: var(--tooltip-bg);
	}

	.tooltip-content.bottom::after {
		bottom: 100%;
		border-bottom-color: var(--tooltip-bg);
	}

	@media (max-width: 768px) {
		:global(.tooltip-content) {
			display: none !important;
		}
	}
</style>
