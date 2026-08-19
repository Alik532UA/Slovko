/**
 * Захисти обробника гарячих клавіш (HOTKEYS-v8 § 2).
 *
 * **КАРТА КЛАВІШ ЦЬОГО ПРОЄКТУ** — щоб наступний агент не аналізував заново:
 *
 * | Клавіша | Стан | Де / чому |
 * |---|---|---|
 * | `T` | ✅ тема | `+layout.svelte`; по колу чотири теми через `settingsStore.setTheme` |
 * | `L` | ✅ панель мов | `+layout.svelte`; відкриває `?modal=languages`, бо мов у списку багато, і «наступна» по колу нічого не пояснює |
 * | `V` | ✅ службове табло | `components/debug/LogCopyButton.svelte` |
 * | `R` | ✅ аварійне скидання | там же; `services/resetService.ts` |
 * | `Esc` | ✅ закрити модальне | у самих модальних вікнах (`BaseModal`) |
 * | `←` `→` | ✅ попередня/наступна картка | `components/navigation/BottomBar.svelte` |
 * | `M` | ⏭️ ПРОПУЩЕНО | глушника звуку немає: озвучення — це вибір голосу й швидкості в налаштуваннях, а не перемикач |
 * | `B` | ⏭️ ПРОПУЩЕНО | тло вибирається в темі (`setBgType`), окремого перемикача «наступне тло» немає |
 * | `F` | ⏭️ ПРОПУЩЕНО | на весь екран немає — ані кнопки, ані `requestFullscreen` у коді |
 * | `C` | ⏭️ ПРОПУЩЕНО | годинника на екрані немає |
 * | `H` | ⏭️ ПРОПУЩЕНО | «на початок» — це нижня панель, а не клавіша |
 * | `PgUp`/`PgDn`, `1`–`9` | ⏭️ ПРОПУЩЕНО | сторінка не крокує секціями; картки гортаються стрілками |
 *
 * Пропущене — це відсутня функція, а не забута клавіша. Щойно функція
 * зʼявиться, клавіша береться з канонічної карти (HOTKEYS-v8 § 1.1), а не
 * вигадується.
 */

/**
 * Чи друкує людина зараз у полі.
 *
 * `closest`, а не порівняння `tagName`: у `contenteditable` фокус стоїть на
 * вкладеному вузлі, і його `tagName` — це `SPAN`, тож перевірка за тегом такий
 * випадок пропускає. Саме цю дірку мала нижня панель: вона звіряла `tagName` з
 * `INPUT`/`TEXTAREA`, тобто стрілка всередині редагованого блоку чи відкритого
 * `select` гортала картку замість того, щоб рухати курсор.
 */
export function isTypingTarget(target: EventTarget | null | undefined): boolean {
	const element = target as HTMLElement | null | undefined;
	if (!element || typeof element.closest !== "function") return false;
	return (
		element.closest(
			"input, textarea, select, [contenteditable]:not([contenteditable='false'])",
		) !== null
	);
}

/**
 * Чи це одиночна клавіша без модифікаторів.
 *
 * `Ctrl+T` відкриває вкладку, `Ctrl+R` перезавантажує, `Ctrl+V` вставляє — і всі
 * три дають той самий `event.code`, що й одиночна клавіша. `Shift` навмисно не
 * перевіряється: він не змінює `code`, а комбінації з ним браузер зазвичай не
 * займає.
 */
export function isPlainKey(event: {
	ctrlKey?: boolean;
	metaKey?: boolean;
	altKey?: boolean;
}): boolean {
	return !event.ctrlKey && !event.metaKey && !event.altKey;
}

/**
 * Обидва захисти разом — те, що потрібно обробникові на вікні.
 *
 * `Escape` — єдиний виняток із захисту полів: панель, яку відкрили клавішею,
 * може забрати фокус у своє поле, і тоді літера, якою її відкрили, законно
 * зʼїдається полем. Закрити панель зсередини більше нічим (HOTKEYS-v8 § 2.2).
 */
export function acceptsShortcut(event: KeyboardEvent): boolean {
	if (!isPlainKey(event)) return false;
	if (event.code === "Escape") return true;
	return !isTypingTarget(event.target);
}

/**
 * Активація елемента з `role="button"` з клавіатури (ACCESSIBILITY-v8 § 2).
 *
 * Навіщо окрема функція, а не `e.key === "Enter" && дія()` на місці. `<div
 * role="button" tabindex="0">` виглядає кнопкою й отримує фокус, але браузер
 * НЕ дає йому нічого з поведінки справжньої `<button>`: ні Enter, ні Space.
 * Обидві клавіші треба обробити самому, і ARIA APG вимагає саме обидві —
 * частина людей натискає Space, бо так поводиться кожна нативна кнопка.
 *
 * У цьому проєкті так і сталося: три контроли імпорту плейліста
 * (`playlist-import-btn`, `playlist-import-clipboard-btn`,
 * `playlist-import-cancel-btn`) мали `tabindex="0"`, `role="button"` і жодного
 * обробника клавіатури. Тобто фокус на них ставився, а натискання не робило
 * НІЧОГО — глухий кут для того, хто не користується мишкою (WCAG 2.1.1,
 * рівень A). `svelte-ignore` над кожним із них це й приховував.
 *
 * `preventDefault` саме для Space: інакше сторінка прокрутиться на екран нижче
 * разом із дією. Для Enter він не потрібен — типової дії в нього тут немає.
 *
 * `event.code`, а не `event.key`: на нелатинській розкладці `key` віддає інший
 * символ (HOTKEYS-v8 § 2.3). Для Enter і Space це не змінює нічого сьогодні,
 * але правило одне на весь проєкт — інакше наступний обробник спишуть із цього.
 */
export function activateOnKey(action: () => void) {
	return (event: KeyboardEvent) => {
		if (!isPlainKey(event)) return;
		if (event.code !== "Enter" && event.code !== "Space") return;
		if (event.code === "Space") event.preventDefault();
		action();
	};
}
