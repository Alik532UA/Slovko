/**
 * Стани застосунку — єдиний перелік на весь проєкт.
 *
 * Маршрут тут ОДИН: `+page.svelte` плюс модалки, що відкриваються параметром
 * `?modal=`. Тому «сторінка» в цьому проєкті — це стан, а не адреса, і саме
 * стани перелічує все, що має покривати застосунок цілком:
 *
 * - `tests/e2e/invariants.spec.ts` — шукає дублікати `data-testid` у кожному;
 * - `src/beta-checklist.test.ts` — вимагає, щоб кожен стан заявила рівно одна
 *   вкладка чеклиста (BETA-CHECKLIST-v8 § 5.1).
 *
 * Два переліки, які тримають узгодженими руками, розходяться на першому ж
 * доданому екрані — саме тому канон просить брати вже наявний перелік, а не
 * заводити другий. Тут наявного не було: список станів жив усередині
 * e2e-спека. Тепер він тут, і обидва гейти читають ОДИН файл.
 *
 * `marker` — локатор, який мусить бути на екрані в цьому стані. Без нього
 * перевірка лише вдавала б, що дивиться в модалку: базова сторінка завжди має
 * якісь `data-testid`, тож канарка «їх більше нуля» пройшла б і на закритій.
 */

export interface AppState {
	/** Стабільний ідентифікатор; на нього посилається вкладка чеклиста. */
	id: string;
	/** Шлях БЕЗ провідного слеша: `base` проєкту вже входить у `baseURL`. */
	path: string;
	/** Локатор, наявність якого доводить, що стан справді відкрився. */
	marker: string;
	/**
	 * Назва екрана для людини. Двома мовами й тут, а не у словнику інтерфейсу:
	 * її показує лише сторінка чеклиста, а паритет семи мов зробив би кожну
	 * правку семикратною (BETA-CHECKLIST-v8 § 2.4).
	 */
	label: { uk: string; en: string };
}

export const APP_STATES: readonly AppState[] = [
	{ id: "game", path: "", marker: "app-root-container", label: { uk: "Гра", en: "Game" } },
	{ id: "levels", path: "?modal=levels", marker: "level-topic-modal-panel", label: { uk: "Вибір рівня", en: "Level picker" } },
	{ id: "languages", path: "?modal=languages", marker: "language-settings-modal", label: { uk: "Мови", en: "Languages" } },
	{ id: "about", path: "?modal=about", marker: "about-modal-panel", label: { uk: "Про проєкт", en: "About" } },
	{ id: "themes", path: "?modal=themes", marker: "confirm-theme-btn", label: { uk: "Оформлення", en: "Themes" } },
	{ id: "stats", path: "?modal=stats&tab=stats", marker: "stats-panel", label: { uk: "Статистика", en: "Stats" } },
	{ id: "leaderboard", path: "?modal=stats&tab=leaderboard", marker: "stats-panel", label: { uk: "Таблиця лідерів", en: "Leaderboard" } },
	{ id: "account", path: "?modal=profile&tab=account", marker: "profile-panel", label: { uk: "Акаунт", en: "Account" } },
	{ id: "friends", path: "?modal=profile&tab=friends", marker: "profile-panel", label: { uk: "Люди", en: "People" } },
	/*
	 * Сторінка чеклиста — теж стан, який має відкриватися й не мати дублікатів
	 * локаторів: вона рендерить десятки пунктів циклом, і збіг локаторів
	 * зламав би саме ті перевірки, якими користується тестувальник. Канон
	 * окремо застерігає, щоб найслабше покритою не стала сторінка, якою
	 * користуються тестувальники (BETA-CHECKLIST-v8 § 5.5).
	 */
	{
		id: "beta",
		path: "beta-test-checklists/",
		marker: "beta-page-container",
		label: { uk: "Чеклист", en: "Checklist" },
	},
] as const;

/**
 * Стани, які свідомо лишаються без вкладки чеклиста.
 *
 * Виняток оформлюється ЯВНИМ переліком, а не відсутністю рядка: інакше
 * забутий екран і навмисно пропущений виглядають однаково
 * (BETA-CHECKLIST-v8 § 5.1). Один запис — сама сторінка чеклиста.
 */
export const STATES_WITHOUT_CHECKLIST: readonly string[] = [
	// Чеклист не перевіряє сам себе: пункти про нього писала б та сама рука, що
	// написала сторінку, і збіглася б та сама сліпа пляма. Його тримають
	// інваріанти (`src/beta-checklist.test.ts`) і перевірка над `build/`.
	"beta",
];
