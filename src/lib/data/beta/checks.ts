import type { BetaTab } from "./types";

/**
 * Пункти чеклиста бета-тестування.
 *
 * Кожен пункт написаний ПІСЛЯ читання коду, що малює екран, а не замість нього
 * (BETA-CHECKLIST-v8 § 7.2). Вигаданий пункт коштує двічі: тестувальник
 * перевіряє неіснуючу поведінку, а потім хтось розбирає звіт про «дефект»
 * справного коду.
 *
 * Три пункти нижче описують саме ті зломи, які 2026-08-18 знайшов аудит правил
 * доступу й які гейт бачить лише з боку бази: відгук гостя, помах і присутність.
 * Гейт доводить, що правило пускає запит; що застосунок під цим правилом
 * працює, доводить лише людина.
 */
export const BETA_TABS: readonly BetaTab[] = [
	{
		id: "game",
		title: { uk: "Гра", en: "Game" },
		states: ["game"],
		checks: [
			{
				id: "game_1",
				category: { uk: "Розміри", en: "Sizing" },
				text: {
					uk: "Відкрийте сайт на телефоні. Обидва стовпці карток мусять поміститися на екрані повністю: нижній ряд не ховається під панеллю браузера.",
					en: "Open the site on a phone. Both card columns must fit the screen: the bottom row is not hidden behind the browser bar.",
				},
				coverage: "manual",
			},
			{
				id: "game_2",
				category: { uk: "Вибір картки", en: "Picking a card" },
				text: {
					uk: "Натисніть слово в лівому стовпці, потім його переклад у правому. Обидві картки мусять зникнути, а рахунок правильних відповідей — збільшитися на одиницю.",
					en: "Tap a word in the left column, then its translation on the right. Both cards must disappear and the correct answer count must go up by one.",
				},
				coverage: "manual",
				testid: "word-left-item-*",
			},
			{
				id: "game_3",
				category: { uk: "Вибір картки", en: "Picking a card" },
				text: {
					uk: "Натисніть уже вибрану картку ще раз. Виділення мусить зникнути, і слово НЕ мусить озвучитися вдруге.",
					en: "Tap an already selected card again. The highlight must go away and the word must NOT be spoken a second time.",
				},
				coverage: "manual",
				testid: "word-left-item-*",
				negative: true,
			},
			{
				id: "game_4",
				category: { uk: "Перше враження", en: "First load" },
				text: {
					uk: "Відкрийте сайт у новій вкладці. У заголовку вкладки мусить бути назва зі словом Slovko, а не сама адреса.",
					en: "Open the site in a new tab. The tab title must carry the name with the word Slovko, not the bare address.",
				},
				coverage: "covered",
				test: "tests/e2e/smoke.spec.ts",
			},
			{
				id: "game_5",
				category: { uk: "Перше враження", en: "First load" },
				text: {
					uk: "Дочекайтеся появи поля з картками. Жодне повідомлення про збій не мусить перекрити екран.",
					en: "Wait for the card board to appear. No failure message must cover the screen.",
				},
				coverage: "covered",
				test: "tests/e2e/smoke.spec.ts",
				negative: true,
			},
			{
				id: "game_6",
				category: { uk: "Режим карток", en: "Swipe mode" },
				text: {
					uk: "Натисніть кнопку режиму навчання й проведіть карткою вгору. Картка мусить полетіти вгору, а на її місці з'явитися наступна.",
					en: "Tap the learning mode button and swipe a card up. The card must fly up and the next one must take its place.",
				},
				coverage: "manual",
				testid: "learning-mode-btn",
			},
			{
				id: "game_7",
				category: { uk: "Озвучення", en: "Speech" },
				text: {
					uk: "Натисніть картку зі словом і послухайте вимову. Якщо пристрій не вміє озвучувати цю мову, мусить з'явитися пояснення, а не тиша.",
					en: "Tap a word card and listen. If the device cannot speak that language, an explanation must appear instead of silence.",
				},
				coverage: "manual",
				testid: "context-menu-listen",
			},
		],
	},

	{
		id: "levels",
		title: { uk: "Рівні й теми", en: "Levels and topics" },
		states: ["levels"],
		checks: [
			{
				id: "levels_1",
				category: { uk: "Вибір", en: "Choosing" },
				text: {
					uk: "Натисніть кнопку вибору рівня в нижній панелі. Мусить відкритися вікно зі списком рівнів від A1 до C2.",
					en: "Tap the level selector in the bottom bar. A window with levels from A1 to C2 must open.",
				},
				coverage: "manual",
				testid: "level-topic-selector-btn",
			},
			{
				id: "levels_2",
				category: { uk: "Вибір", en: "Choosing" },
				text: {
					uk: "Позначте два рівні одночасно й почніть навчання. У грі мусять траплятися слова з обох рівнів.",
					en: "Select two levels at once and start learning. Words from both levels must show up in the game.",
				},
				coverage: "manual",
				testid: "level-topic-learn-btn",
			},
			{
				id: "levels_3",
				category: { uk: "Межа вибору", en: "Selection limit" },
				text: {
					uk: "Зніміть позначки з усіх рівнів і тем, тоді натисніть кнопку початку навчання. Порожня гра НЕ мусить початися.",
					en: "Clear every level and topic, then tap the start button. An empty game must NOT start.",
				},
				coverage: "manual",
				testid: "level-topic-learn-btn",
				negative: true,
			},
			{
				id: "levels_4",
				category: { uk: "Збереження вибору", en: "Persistence" },
				text: {
					uk: "Оберіть тему, закрийте вікно й перезавантажте сторінку. Обрана тема мусить лишитися обраною.",
					en: "Pick a topic, close the window and reload the page. The chosen topic must stay chosen.",
				},
				coverage: "testable",
			},
			{
				id: "levels_5",
				category: { uk: "Граматичні часи", en: "Tenses" },
				text: {
					uk: "Увімкніть режим фраз і залиште позначеною лише одну форму — питання. У грі мусять траплятися лише питальні речення.",
					en: "Switch to phrases and leave only the question form selected. Only questions must appear in the game.",
				},
				coverage: "manual",
				testid: "tense-forms-list",
			},
		],
	},

	{
		id: "languages",
		title: { uk: "Мови", en: "Languages" },
		states: ["languages"],
		checks: [
			{
				id: "languages_1",
				category: { uk: "Мова інтерфейсу", en: "Interface language" },
				text: {
					uk: "Натисніть прапор у рядку мови інтерфейсу. Написи на сторінці мусять змінитися одразу, без перезавантаження.",
					en: "Tap a flag in the interface language row. The labels must change at once, without a reload.",
				},
				coverage: "manual",
				testid: "interface-flags-row",
			},
			{
				id: "languages_2",
				category: { uk: "Повнота перекладу", en: "Translation gaps" },
				text: {
					uk: "Перемкніть мову інтерфейсу на кожну з семи й відкрийте меню, статистику та профіль. Написів із крапками всередині замість слів бути НЕ мусить.",
					en: "Switch the interface to each of the seven languages and open the menu, the stats and the profile. Labels with dots inside instead of words must NOT appear.",
				},
				coverage: "testable",
				negative: true,
			},
			{
				id: "languages_3",
				category: { uk: "Мови карток", en: "Card languages" },
				text: {
					uk: "Виберіть різні мови для лівого й правого стовпців. Ліворуч і праворуч мусять з'явитися слова саме цих мов.",
					en: "Pick different languages for the left and the right column. Words in exactly those languages must appear on each side.",
				},
				coverage: "manual",
				testid: "card-langs-container",
			},
			{
				id: "languages_4",
				category: { uk: "Вимова", en: "Pronunciation" },
				text: {
					uk: "Натисніть кнопку транскрипції для правого стовпця. Під кожним словом праворуч мусить з'явитися запис вимови у квадратних дужках.",
					en: "Tap the transcription button for the right column. A bracketed pronunciation must appear under every word on the right.",
				},
				coverage: "manual",
				testid: "transcription-right-btn",
			},
		],
	},

	{
		id: "themes",
		title: { uk: "Оформлення", en: "Themes" },
		states: ["themes"],
		checks: [
			{
				id: "themes_1",
				category: { uk: "Вибір теми", en: "Choosing a theme" },
				text: {
					uk: "Натисніть картку теми й підтвердіть вибір. Кольори сторінки мусять змінитися одразу, без перезавантаження.",
					en: "Tap a theme card and confirm. The page colours must change at once, without a reload.",
				},
				coverage: "manual",
				testid: "theme-card-*",
			},
			{
				id: "themes_2",
				category: { uk: "Читабельність", en: "Readability" },
				text: {
					uk: "Перемкніть усі чотири теми по черзі й огляньте меню, картки та нижню панель. Жоден напис НЕ мусить зливатися зі своїм тлом.",
					en: "Switch through all four themes and look at the menu, the cards and the bottom bar. No label must blend into its background.",
				},
				coverage: "testable",
				negative: true,
			},
			{
				id: "themes_3",
				category: { uk: "Збереження вибору", en: "Persistence" },
				text: {
					uk: "Оберіть тему, закрийте вікно й перезавантажте сторінку. Тема мусить лишитися обраною, а перший кадр — не блимнути іншими кольорами.",
					en: "Pick a theme, close the window and reload. The theme must stay, and the first frame must not flash other colours.",
				},
				coverage: "manual",
			},
		],
	},

	{
		id: "about",
		title: { uk: "Про проєкт і відгуки", en: "About and feedback" },
		states: ["about"],
		checks: [
			{
				id: "about_1",
				category: { uk: "Посилання", en: "Links" },
				text: {
					uk: "Натисніть посилання підтримки проєкту. Мусить відкритися сторінка оплати в новій вкладці, а сайт лишитися відкритим у своїй.",
					en: "Tap the support link. A payment page must open in a new tab and the site must stay open in its own.",
				},
				coverage: "manual",
				testid: "about-modal-donate-link",
			},
			{
				id: "about_2",
				category: { uk: "Версія", en: "Version" },
				text: {
					uk: "Знайдіть номер версії у вікні «Про проєкт». Він мусить збігатися з тим, що показує сторінка після оновлення.",
					en: "Find the version number in the About window. It must match what the page shows after an update.",
				},
				coverage: "testable",
			},
			{
				id: "about_3",
				category: { uk: "Закриття вікон", en: "Closing windows" },
				text: {
					uk: "Відкрийте будь-яке вікно застосунку. У правому верхньому куті мусить бути кнопка закриття, і вікно мусить нею закриватися.",
					en: "Open any window in the app. There must be a close button in the top right corner, and it must close the window.",
				},
				coverage: "covered",
				test: "src/close-button-conventions.test.ts",
			},
			{
				id: "about_4",
				category: { uk: "Скидання", en: "Reset" },
				text: {
					uk: "Скиньте кеш посиланням у вікні «Про проєкт». Після перезавантаження ваш прогрес і налаштування НЕ мусять зникнути.",
					en: "Reset the cache with the link in the About window. Your progress and settings must NOT disappear after the reload.",
				},
				coverage: "manual",
				testid: "about-hard-reset-link",
				negative: true,
			},
			{
				id: "about_5",
				category: { uk: "Відгук", en: "Feedback" },
				text: {
					uk: "Не входячи в акаунт, напишіть відгук і натисніть кнопку надсилання. Мусить з'явитися подяка, а не прохання увійти.",
					en: "Without signing in, write feedback and tap send. A thank-you must appear, not a request to sign in.",
				},
				coverage: "manual",
				testid: "feedback-submit-btn",
			},
			{
				id: "about_6",
				category: { uk: "Відгук", en: "Feedback" },
				text: {
					uk: "Відкрийте меню картки слова й поскаржтеся на переклад. Скарга мусить надсилатися і від гостя, і з акаунта.",
					en: "Open the word card menu and report a wrong translation. The report must go through both as a guest and signed in.",
				},
				coverage: "manual",
				testid: "context-menu-report",
			},
		],
	},

	{
		id: "stats",
		title: { uk: "Статистика й лідери", en: "Stats and leaderboard" },
		states: ["stats", "leaderboard"],
		checks: [
			{
				id: "stats_1",
				category: { uk: "Показники", en: "Numbers" },
				text: {
					uk: "Натисніть пункт статистики в меню. Мусять з'явитися картки з кількістю правильних відповідей за сьогодні й за весь час.",
					en: "Tap the stats item in the menu. Cards with today's and all-time correct answers must appear.",
				},
				coverage: "manual",
				testid: "menu-stats-btn",
			},
			{
				id: "stats_2",
				category: { uk: "Показники", en: "Numbers" },
				text: {
					uk: "Дайте кілька правильних відповідей і поверніться до статистики. Число за сьогодні НЕ мусить зменшитися.",
					en: "Answer correctly a few times and come back to the stats. Today's number must NOT go down.",
				},
				coverage: "manual",
				negative: true,
			},
			{
				id: "stats_3",
				category: { uk: "Вхід після гри гостем", en: "Signing in after guest play" },
				text: {
					uk: "Пограйте гостем, потім увійдіть в акаунт, у якому вже є результат. Ваш хмарний результат НЕ мусить обнулитися.",
					en: "Play as a guest, then sign into an account that already has a score. Your cloud score must NOT reset to zero.",
				},
				coverage: "manual",
				negative: true,
			},
			{
				id: "stats_4",
				category: { uk: "Таблиця лідерів", en: "Leaderboard" },
				text: {
					uk: "Відкрийте таблицю лідерів. Мусить з'явитися список гравців із результатами, а ваш рядок — виділений серед них.",
					en: "Open the leaderboard. A list of players with scores must appear, and your own row must stand out.",
				},
				coverage: "manual",
				testid: "leaderboard-list",
			},
			{
				id: "stats_5",
				category: { uk: "Перша синхронізація", en: "First sync" },
				text: {
					uk: "Увійдіть в акаунт, дайте кілька відповідей і перезавантажте сторінку. Прогрес мусить лишитися на місці.",
					en: "Sign in, answer a few times and reload the page. The progress must stay where it was.",
				},
				coverage: "manual",
			},
		],
	},

	{
		id: "account",
		title: { uk: "Акаунт", en: "Account" },
		states: ["account"],
		checks: [
			{
				id: "account_1",
				category: { uk: "Зміна пароля", en: "Changing the password" },
				text: {
					uk: "Натисніть пункт зміни пароля в профілі. Мусить відкритися форма з трьома полями: поточний пароль, новий і його підтвердження.",
					en: "Tap the change password item in the profile. A form with three fields must open: current password, new one and its confirmation.",
				},
				coverage: "manual",
				testid: "profile-change-password-btn",
			},
			{
				id: "account_2",
				category: { uk: "Зміна пароля", en: "Changing the password" },
				text: {
					uk: "У формі зміни пароля введіть різні значення в поле нового пароля й у поле підтвердження. Пароль НЕ мусить змінитися, а під формою мусить з'явитися пояснення.",
					en: "In the change password form, type different values into the new password and the confirmation field. The password must NOT change, and an explanation must appear under the form.",
				},
				coverage: "manual",
				testid: "change-password-submit-btn",
				negative: true,
			},
			{
				id: "account_3",
				category: { uk: "Повідомлення про помилку", en: "Error messages" },
				text: {
					uk: "Спробуйте увійти з неправильним паролем. Повідомлення мусить бути мовою інтерфейсу і зрозумілим людині, а не англійським рядком із дужками.",
					en: "Try signing in with a wrong password. The message must be in the interface language and readable, not an English string with brackets.",
				},
				coverage: "testable",
			},
			{
				id: "account_4",
				category: { uk: "Видалення акаунта", en: "Deleting the account" },
				text: {
					uk: "Натисніть пункт видалення акаунта. Мусить з'явитися попередження й поле пароля, а не порожній екран із написом «Назад».",
					en: "Tap the delete account item. A warning and a password field must appear, not an empty screen with a Back link.",
				},
				coverage: "manual",
				testid: "profile-delete-account-btn",
			},
			{
				id: "account_5",
				category: { uk: "Поле пароля", en: "Password field" },
				text: {
					uk: "Наберіть пароль з увімкненим Caps Lock, тоді кириличною розкладкою. Обидва рази під полем мусить з'явитися попередження.",
					en: "Type a password with Caps Lock on, then with a Cyrillic keyboard layout. A warning must appear under the field both times.",
				},
				coverage: "manual",
				testid: "auth-password-capslock-warning",
			},
			{
				id: "account_6",
				category: { uk: "Аватар", en: "Avatar" },
				text: {
					uk: "Змініть значок і колір аватара, збережіть і перезавантажте сторінку. Аватар мусить лишитися новим.",
					en: "Change the avatar icon and colour, save and reload. The avatar must stay the new one.",
				},
				coverage: "manual",
				testid: "avatar-editor-save-btn",
			},
		],
	},

	{
		id: "friends",
		title: { uk: "Люди", en: "People" },
		states: ["friends"],
		checks: [
			{
				id: "friends_1",
				category: { uk: "Пошук", en: "Search" },
				text: {
					uk: "Знайдіть людину за поштою в полі пошуку й натисніть кнопку підписки. Лічильник підписок мусить збільшитися одразу.",
					en: "Find a person by email in the search field and tap follow. The following counter must go up at once.",
				},
				coverage: "manual",
				testid: "search-users-input",
			},
			{
				id: "friends_2",
				category: { uk: "Підписка", en: "Following" },
				text: {
					uk: "Підпишіться на людину й одразу відпишіться, тоді перезавантажте сторінку. Лічильник НЕ мусить лишитися збільшеним.",
					en: "Follow a person, unfollow right away and reload. The counter must NOT stay increased.",
				},
				coverage: "manual",
				negative: true,
			},
			{
				id: "friends_3",
				category: { uk: "Помахати", en: "Waving" },
				text: {
					uk: "Помахайте людині зі списку, тоді помахайте їй ще раз. Обидва рази мусить з'явитися підтвердження, що сигнал пішов.",
					en: "Wave at a person from the list, then wave at the same person again. Both times a confirmation that the signal was sent must appear.",
				},
				coverage: "manual",
				testid: "avatar-menu-wave",
			},
			{
				id: "friends_4",
				category: { uk: "Присутність", en: "Presence" },
				text: {
					uk: "Відкрийте застосунок із двох пристроїв різними акаунтами. Кожен мусить бачити іншого в мережі, а після закриття вкладки — офлайн протягом хвилини.",
					en: "Open the app on two devices with different accounts. Each must see the other online, and offline within a minute after the tab closes.",
				},
				coverage: "manual",
			},
			{
				id: "friends_5",
				category: { uk: "Пошук за поштою", en: "Email search" },
				text: {
					uk: "Пошукайте людину за адресою, якої в застосунку немає. Мусить з'явитися напис, що нікого не знайдено, а не порожнє місце.",
					en: "Search for an address nobody uses. A not-found message must appear, not blank space.",
				},
				coverage: "manual",
				testid: "user-search-empty-message",
				negative: true,
			},
		],
	},
] as const;

/** Усі пункти одним переліком — для інваріантів і для звіту. */
export const ALL_CHECKS = BETA_TABS.flatMap((tab) => tab.checks);
