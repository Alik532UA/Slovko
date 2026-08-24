/**
 * Перевірка правил доступу (Firestore + Realtime Database) над емулятором.
 *
 * Запускати: `npm run check:rules` (скрипт сам піднімає емулятори).
 *
 * ЧОМУ ЦЕ ОКРЕМИЙ СКРИПТ, А НЕ ТЕСТ. Правила — єдина частина проєкту, стан якої
 * не видно ні в `src/`, ні у `build/`: вони виконуються на боці Firebase. Файл
 * під vitest, який вимагає живого емулятора, у звичайному прогоні або падає, або
 * тихо пропускається — тобто стає перевіркою, якої не запускає ніхто
 * (AI-AGENT-PITFALLS-v8 § 1.3).
 *
 * ЧОМУ НЕ firebase-admin. Він ходить в ОБХІД правил, тобто перевіряв би не те.
 * Тут звичайний `fetch` із токеном звичайного користувача — він проходить крізь
 * правила так само, як клієнтський SDK.
 *
 * ЗВОРОТНИЙ ЕКСПЕРИМЕНТ УСЕРЕДИНІ: половина очікувань — «застосунок мусить це
 * вміти», половина — «сторонній не мусить цього могти».
 */

const FS_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8082';
const DB_HOST = process.env.FIREBASE_DATABASE_EMULATOR_HOST ?? '127.0.0.1:9002';
const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9098';
const PROJECT = process.env.GCLOUD_PROJECT ?? 'demo-slovko';
const FS = `http://${FS_HOST}/v1/projects/${PROJECT}/databases/(default)/documents`;
const NS = `${PROJECT}-default-rtdb`;

async function signIn(label) {
	const res = await fetch(
		`http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=emulator`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ returnSecureToken: true })
		}
	);
	if (!res.ok) throw new Error(`емулятор Auth не дав токен для ${label}: ${res.status}`);
	const body = await res.json();
	return { uid: body.localId, token: body.idToken };
}

const auth = (token) => (token ? { Authorization: `Bearer ${token}` } : {});

const value = (raw) => {
	if (typeof raw === 'string') return { stringValue: raw };
	if (typeof raw === 'number')
		return Number.isInteger(raw) ? { integerValue: String(raw) } : { doubleValue: raw };
	if (typeof raw === 'boolean') return { booleanValue: raw };
	if (raw && typeof raw === 'object') {
		return {
			mapValue: { fields: Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, value(v)])) }
		};
	}
	return { nullValue: null };
};
const fields = (data) => Object.fromEntries(Object.entries(data).map(([k, v]) => [k, value(v)]));

async function fsCreate(path, docId, data, token) {
	const res = await fetch(`${FS}/${path}?documentId=${docId}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', ...auth(token) },
		body: JSON.stringify({ fields: fields(data) })
	});
	return res.status;
}

async function fsUpdate(path, data, token) {
	const res = await fetch(`${FS}/${path}`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json', ...auth(token) },
		body: JSON.stringify({ fields: fields(data) })
	});
	return res.status;
}

async function fsDelete(path, token) {
	return (await fetch(`${FS}/${path}`, { method: 'DELETE', headers: auth(token) })).status;
}

async function fsRead(path, token) {
	return (await fetch(`${FS}/${path}`, { headers: auth(token) })).status;
}

async function dbWrite(path, data, token) {
	const suffix = token ? `&auth=${token}` : '';
	const res = await fetch(`http://${DB_HOST}/${path}.json?ns=${NS}${suffix}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(data)
	});
	return res.status;
}

async function dbRead(path, token) {
	const suffix = token ? `&auth=${token}` : '';
	return (await fetch(`http://${DB_HOST}/${path}.json?ns=${NS}${suffix}`)).status;
}

const me = await signIn('я');
const other = await signIn('інший');
const SERVER_TIME = { '.sv': 'timestamp' };

const profile = (uid) => ({
	displayName: 'Тест',
	displayNameLower: 'тест',
	photoURL: null,
	isAnonymous: false,
	// САМОЇ ПОШТИ ТУТ БУТИ НЕ МОЖЕ — лише її SHA-256.
	searchableEmailHash: `hash-${uid}`,
	privacy: { showInSearch: true }
});

const CASES = [
	// --- застосунок мусить це вміти ---
	{ name: 'свій документ користувача', allowed: true, run: () => fsCreate('users', me.uid, { lastSync: 1 }, me.token) },
	{ name: 'своя історія по днях', allowed: true, run: () => fsCreate(`users/${me.uid}/history`, '2026-08-18', { correct: 5 }, me.token) },
	{ name: 'свій плейліст', allowed: true, run: () => fsCreate(`users/${me.uid}/playlists_v2`, 'p1', { name: 'Мій' }, me.token) },
	{ name: 'свій шард прогресу по словах', allowed: true, run: () => fsCreate(`users/${me.uid}/words`, 'shard-00', { probe: 1 }, me.token) },
	{ name: 'свій публічний профіль', allowed: true, run: () => fsCreate('profiles', me.uid, profile(me.uid), me.token) },
	{ name: 'чужий профіль за ідентифікатором (get)', allowed: true, run: () => fsRead(`profiles/${me.uid}`, other.token) },
	{ name: 'пошук по профілях авторизованим (list)', allowed: true, run: () => fsRead('profiles?pageSize=20', other.token) },
	{ name: 'підписка: свій following', allowed: true, run: () => fsCreate(`users/${me.uid}/following`, other.uid, { uid: other.uid }, me.token) },
	{ name: 'підписка: свій рядок у ЧУЖИХ followers', allowed: true, run: () => fsCreate(`users/${other.uid}/followers`, me.uid, { uid: me.uid }, me.token) },
	{ name: 'запис у журнал подій', allowed: true, run: () => fsCreate('system_logs', 'log-1', { uid: me.uid, action: 'test', details: {}, userAgent: 'ua', timestamp: 1 }, me.token) },
	// `lastChanged`, а не `last_changed`: доти гейт писав snake_case-форму, якої
	// застосунок не створює, — тобто перевіряв правило, що ні на що не діяло.
	{ name: 'своя присутність (RTDB)', allowed: true, run: () => dbWrite(`status/${me.uid}`, { state: 'online', lastChanged: SERVER_TIME }, me.token) },
	{ name: 'свій запис у discovery', allowed: true, run: () => dbWrite(`discovery/${me.uid}`, { displayName: 'Я', timestamp: SERVER_TIME }, me.token) },
	/*
	 * СИГНАЛ у формі, яку СПРАВДІ пише застосунок: ключ = uid відправника, поле
	 * `fromUid`. Доти гейт писав `signals/{to}/sig1` з полем `from` — форму, якої
	 * `interface Signal` не має, — тож був зелений на правилі, під яким кожен
	 * реальний `sendWave` відкидався (CLOUD-DATABASE-v8 § 3.5, § 4.6).
	 */
	{ name: 'сигнал ІНШОМУ користувачеві', allowed: true, run: () => dbWrite(`signals/${other.uid}/${me.uid}`, { type: 'wave', fromUid: me.uid, fromName: 'Я', timestamp: SERVER_TIME }, me.token) },
	{ name: 'ПОВТОРНИЙ сигнал тому самому — той самий слот', allowed: true, run: () => dbWrite(`signals/${other.uid}/${me.uid}`, { type: 'wave', fromUid: me.uid, fromName: 'Я', timestamp: SERVER_TIME }, me.token) },
	{ name: 'адресат ЗНОСИТЬ сигнал зі своєї скриньки', allowed: true, run: () => dbWrite(`signals/${me.uid}/${other.uid}`, null, me.token) },
	{ name: 'відгук від гостя', allowed: true, run: () => fsCreate('feedback_anonymous/bug/messages', 'probe', { message: 'проба', status: 'new', isGuestReport: true }, null) },
	{ name: 'відгук від авторизованого', allowed: true, run: () => fsCreate('feedback/improvement/messages', 'probe', { title: 'Ідея', message: 'текст', status: 'new' }, me.token) },
	{ name: 'скарга на слово', allowed: true, run: () => fsCreate('feedback_anonymous/word_error/messages', 'probe', { wordKey: 'cat', errorType: 'translation', status: 'new' }, null) },
	{ name: 'своя скринька сигналів — читання', allowed: true, run: () => dbRead(`signals/${me.uid}`, me.token) },

	/*
	 * ВИДАЛЕННЯ АКАУНТА — прибирання ЗА СОБОЮ.
	 *
	 * Доти видалення прибирало два документи, а Firestore не видаляє підколекції
	 * разом із документом: прогрес по словах, історія, плейлісти й підписки
	 * лишалися назавжди — після `deleteUser()` їх не може прибрати вже ніхто, бо
	 * правила вимагають власника. Ці випадки й стережуть, що права на прибирання
	 * в людини є ДО того (`EraseService`).
	 */
	{ name: 'прибрати свою історію по днях', allowed: true, run: () => fsDelete(`users/${me.uid}/history/2026-08-18`, me.token) },
	{ name: 'прибрати свій плейліст', allowed: true, run: () => fsDelete(`users/${me.uid}/playlists_v2/p1`, me.token) },
	{ name: 'прибрати свій шард прогресу', allowed: true, run: () => fsDelete(`users/${me.uid}/words/shard-00`, me.token) },
	{ name: 'прибрати свою підписку', allowed: true, run: () => fsDelete(`users/${me.uid}/following/${other.uid}`, me.token) },
	// ДЗЕРКАЛО В ЧУЖОМУ ДОКУМЕНТІ: без цього права в списках інших людей лишався
	// б рядок, що вказує в нікуди.
	{ name: 'прибрати СВІЙ рядок у чужих followers', allowed: true, run: () => fsDelete(`users/${other.uid}/followers/${me.uid}`, me.token) },
	{ name: 'прибрати свій публічний профіль', allowed: true, run: () => fsDelete(`profiles/${me.uid}`, me.token) },
	{ name: 'прибрати свій слот у скриньці сигналів', allowed: true, run: () => dbWrite(`signals/${me.uid}/${other.uid}`, null, me.token) },
	{ name: 'прибрати свою присутність', allowed: true, run: () => dbWrite(`status/${me.uid}`, null, me.token) },

	// --- сторонній не мусить цього могти ---
	{ name: 'ЧУЖИЙ документ користувача — читання', allowed: false, run: () => fsRead(`users/${me.uid}`, other.token) },
	{ name: 'ЧУЖИЙ документ користувача — запис', allowed: false, run: () => fsUpdate(`users/${me.uid}`, { lastSync: 2 }, other.token) },
	{ name: 'чужа історія', allowed: false, run: () => fsRead(`users/${me.uid}/history/2026-08-18`, other.token) },
	{ name: 'чужі плейлісти', allowed: false, run: () => fsRead(`users/${me.uid}/playlists_v2/p1`, other.token) },
	{ name: 'чужий прогрес по словах', allowed: false, run: () => fsRead(`users/${me.uid}/words/shard-00`, other.token) },
	{ name: 'неавторизований читає документ користувача', allowed: false, run: () => fsRead(`users/${me.uid}`, null) },
	{ name: 'чужий публічний профіль — запис', allowed: false, run: () => fsUpdate(`profiles/${me.uid}`, { displayName: 'вкрадено' }, other.token) },
	// Живий зонд 2026-08-18 показав, що `GET /documents/profiles` без токена
	// повертав документи: REST перелічує колекцію поштучними читаннями, тож
	// «нешкідливий» `allow get: if true` відкривав усю колекцію стороннім.
	{ name: 'НЕАВТОРИЗОВАНИЙ перелічує профілі', allowed: false, run: () => fsRead('profiles?pageSize=5', null) },
	{ name: 'НЕАВТОРИЗОВАНИЙ читає один профіль', allowed: false, run: () => fsRead(`profiles/${me.uid}`, null) },
	{ name: 'підписати ІНШОГО на когось (чужий following)', allowed: false, run: () => fsCreate(`users/${me.uid}/following`, 'хтось', { uid: 'хтось' }, other.token) },
	{ name: 'підробити ЧУЖИЙ рядок у followers', allowed: false, run: () => fsCreate(`users/${me.uid}/followers`, other.uid, { uid: 'підробка' }, me.token) },
	{ name: 'читати журнал подій', allowed: false, run: () => fsRead('system_logs', me.token) },
	{ name: 'журнал від чужого імені', allowed: false, run: () => fsCreate('system_logs', 'log-2', { uid: other.uid, action: 'x', details: {}, userAgent: 'ua', timestamp: 1 }, me.token) },
	{ name: 'довільне поле в журналі', allowed: false, run: () => fsCreate('system_logs', 'log-3', { uid: me.uid, pwned: 'так' }, me.token) },
	{ name: 'довільна нова колекція', allowed: false, run: () => fsCreate('hackers', 'pwn', { any: 1 }, me.token) },
	{ name: 'довільна підколекція користувача', allowed: false, run: () => fsCreate(`users/${me.uid}/backdoor`, 'x', { any: 1 }, me.token) },
	{ name: 'чужа присутність (RTDB)', allowed: false, run: () => dbWrite(`status/${me.uid}`, { state: 'offline' }, other.token) },
	{ name: 'присутність без авторизації', allowed: false, run: () => dbWrite(`status/${me.uid}`, { state: 'offline' }, null) },
	{ name: 'чужий запис у discovery', allowed: false, run: () => dbWrite(`discovery/${me.uid}`, { displayName: 'х', timestamp: SERVER_TIME }, other.token) },
	{ name: 'ЧУЖА скринька сигналів — читання', allowed: false, run: () => dbRead(`signals/${other.uid}`, me.token) },
	{ name: 'сигнал із підробленим відправником', allowed: false, run: () => dbWrite(`signals/${other.uid}/${me.uid}`, { type: 'wave', fromUid: other.uid, timestamp: SERVER_TIME }, me.token) },
	{ name: 'сигнал у ЧУЖИЙ слот скриньки', allowed: false, run: () => dbWrite(`signals/${other.uid}/${'stranger'}`, { type: 'wave', fromUid: me.uid, timestamp: SERVER_TIME }, me.token) },
	{ name: 'сигнал із невідомим полем', allowed: false, run: () => dbWrite(`signals/${other.uid}/${me.uid}`, { type: 'wave', fromUid: me.uid, payload: 'х', timestamp: SERVER_TIME }, me.token) },
	{ name: 'сигнал із типом поза переліком', allowed: false, run: () => dbWrite(`signals/${other.uid}/${me.uid}`, { type: 'pwn', fromUid: me.uid, timestamp: SERVER_TIME }, me.token) },
	{ name: 'присутність із НЕВІДОМИМ полем', allowed: false, run: () => dbWrite(`status/${me.uid}`, { state: 'online', last_changed: SERVER_TIME }, me.token) },
	{ name: 'присутність із ПІДРОБЛЕНИМ часом', allowed: false, run: () => dbWrite(`status/${me.uid}`, { state: 'online', lastChanged: 1 }, me.token) },
	{ name: 'присутність зі станом поза переліком', allowed: false, run: () => dbWrite(`status/${me.uid}`, { state: 'invisible', lastChanged: SERVER_TIME }, me.token) },
	{ name: 'запис у discovery із невідомим полем', allowed: false, run: () => dbWrite(`discovery/${me.uid}`, { displayName: 'Я', secret: 'х', timestamp: SERVER_TIME }, me.token) },
	{ name: 'прибрати ЧУЖУ історію', allowed: false, run: () => fsDelete(`users/${other.uid}/history/2026-08-18`, me.token) },
	{ name: 'прибрати ЧУЖИЙ шард прогресу', allowed: false, run: () => fsDelete(`users/${other.uid}/words/shard-00`, me.token) },
	{ name: 'прибрати ЧУЖИЙ публічний профіль', allowed: false, run: () => fsDelete(`profiles/${other.uid}`, me.token) },
	{ name: 'прибрати ЧУЖУ скриньку сигналів', allowed: false, run: () => dbWrite(`signals/${other.uid}`, null, me.token) },
	{ name: 'ЧИТАННЯ відгуків', allowed: false, run: () => fsRead('feedback/bug/messages', me.token) },
	{ name: 'ПРАВКА надісланого відгуку', allowed: false, run: () => fsUpdate('feedback/improvement/messages/probe', { message: 'підміна' }, me.token) },
	{ name: 'відгук у категорію поза переліком', allowed: false, run: () => fsCreate('feedback/pwned/messages', 'probe', { message: 'х', status: 'new' }, null) },
	{ name: 'відгук із довільним полем', allowed: false, run: () => fsCreate('feedback/bug/messages', 'extra', { message: 'х', pwned: 'так' }, null) },
	{ name: 'відгук із текстом на межі мегабайта', allowed: false, run: () => fsCreate('feedback/bug/messages', 'long', { message: 'я'.repeat(4001) }, null) },
	{ name: 'читання кореня RTDB', allowed: false, run: () => dbRead('', me.token) },
	{ name: 'довільна нова гілка RTDB', allowed: false, run: () => dbWrite('hackers/pwn', { any: 1 }, me.token) },

	// --- прибирання останнє ---
	{ name: 'власник зносить свій профіль', allowed: true, run: () => fsDelete(`profiles/${me.uid}`, me.token) }
];

const problems = [];
let positives = 0;

for (const { name, allowed, run } of CASES) {
	if (allowed) positives++;
	const status = await run();
	const ok = status >= 200 && status < 300;
	const verdict = ok ? 'ДОЗВОЛЕНО' : `ЗАБОРОНЕНО(${status})`;
	console.log(`  ${ok === allowed ? '✓' : '✗'} ${verdict.padEnd(18)} ${name}`);
	if (ok !== allowed) {
		problems.push(`${name}: очікувалося ${allowed ? 'дозволено' : 'заборонено'}, отримано ${verdict}`);
	}
}

const negatives = CASES.length - positives;
if (positives === 0 || negatives === 0) {
	console.error('\nПеревірка вироджена: потрібні і позитивні, і негативні випадки.');
	process.exit(1);
}

if (problems.length) {
	console.error(`\nПравила доступу не відповідають очікуванням (${problems.length}):`);
	for (const problem of problems) console.error(`  - ${problem}`);
	process.exit(1);
}

console.log(
	`\nПравила доступу: ${CASES.length} перевірок (${positives} дозволено, ${negatives} заборонено), розбіжностей немає.`
);
