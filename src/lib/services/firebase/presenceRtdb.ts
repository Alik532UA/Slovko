import {
	limitToLast,
	onChildAdded,
	onDisconnect,
	onValue,
	orderByChild,
	query,
	ref,
	remove,
	serverTimestamp,
	set,
	startAt,
	type Unsubscribe
} from "firebase/database";
import { getRtdb } from "./config";

/**
 * Realtime Database для присутності — увесь SDK цього напрямку зібраний тут.
 *
 * **Чому окремий чистий `.ts`, а не частина `PresenceService.svelte.ts`.** Той
 * файл на 534 рядки містив 28 викликів SDK і РІВНО ДВІ руни: мережа була зрощена
 * з реактивністю, і наслідок не косметичний — такий шар неможливо ні
 * протестувати, ні підмінити, бо він приїжджає разом зі станом
 * (CLOUD-DATABASE-v8 § 10.4, SVELTE-CORE-v8 § 8.1). Тепер реактивне сховище
 * говорить функціями звідси, а SDK не бачить узагалі.
 *
 * **Тут немає жодного рішення про поведінку.** Кому показати сповіщення, коли
 * вважати сигнал обробленим, скільком друзям тримати підписку — усе це лишається
 * в сховищі. Цей файл знає лише форму даних і шляхи.
 *
 * **Три імені полів тут — контракт із правилами.** `lastChanged`, `fromUid` і
 * `timestamp` названі в `database.rules.json`, і саме на цих трьох іменах уже
 * ламалося двічі: правило валідувало `last_changed`, код писав `lastChanged`;
 * правило вимагало `from`, код писав `fromUid` — і «помахати» відкидалося
 * завжди. Тепер розсинхрон неможливо не помітити: на кожному вузлі стоїть
 * `$other: false`, тож незнайоме поле відкидає САМА БАЗА (§ 4.6).
 */

/** Скільком сигналам приїжджати за раз. Скриньку наповнює будь-хто авторизований. */
const SIGNAL_WINDOW = 20;

/** Скільком людям показуватися в режимі знайомств. */
const DISCOVERY_WINDOW = 30;

/** Наскільки старі сигнали ще цікаві: буфер на розбіжність годинників. */
const SIGNAL_LOOKBACK_MS = 10_000;

export interface StatusRecord {
	state: "online" | "offline";
	lastChanged?: number;
}

export interface SignalRecord {
	type: "wave" | "wave_back";
	fromUid: string;
	fromName: string;
	fromPhoto?: string | null;
	timestamp?: number;
}

export interface DiscoveryRecord {
	uid: string;
	displayName: string;
	photoURL: string | null;
	timestamp: number;
}

/**
 * Заявити себе онлайн — і домовитися, що буде, коли зникнемо.
 *
 * Порядок саме такий: спершу `onDisconnect`, і лише тоді сам запис. У
 * зворотному порядку існує вікно, у якому запис уже є, а домовленості про його
 * прибирання ще немає, — і зникнення клієнта в цю мить лишає привида назавжди
 * (§ 9.1).
 */
export async function announceOnline(uid: string): Promise<void> {
	const status = ref(getRtdb(), `/status/${uid}`);
	await onDisconnect(status).set({ state: "offline", lastChanged: serverTimestamp() });
	await set(status, { state: "online", lastChanged: serverTimestamp() });
}

/** Підписка на статус однієї людини. Повертає відписку. */
export function watchStatus(
	uid: string,
	onStatus: (status: StatusRecord) => void
): Unsubscribe {
	return onValue(ref(getRtdb(), `/status/${uid}`), (snapshot) => {
		const data = snapshot.val() as StatusRecord | null;
		if (data) onStatus(data);
	});
}

/**
 * Підписка на свою скриньку сигналів.
 *
 * `limitToLast` обовʼязковий навіть при фільтрі за часом: скриньку наповнює
 * будь-хто авторизований, тож без межі один настирливий відправник змусив би
 * клієнт прочитати все, що він надіслав (§ 7.1). Сортування за `timestamp`
 * вимагає `.indexOn` на гілці — без нього RTDB не відмовляє, а віддає скриньку
 * ЦІЛКОМ і сортує на клієнті (§ 7.4).
 */
export function watchInbox(
	uid: string,
	onSignal: (key: string, signal: SignalRecord) => void
): Unsubscribe {
	const inbox = query(
		ref(getRtdb(), `/signals/${uid}`),
		orderByChild("timestamp"),
		startAt(Date.now() - SIGNAL_LOOKBACK_MS),
		limitToLast(SIGNAL_WINDOW)
	);
	return onChildAdded(inbox, (snapshot) => {
		const signal = snapshot.val() as SignalRecord | null;
		if (signal && snapshot.key) onSignal(snapshot.key, signal);
	});
}

/** Прибрати оброблений сигнал зі своєї скриньки. */
export function dropSignal(myUid: string, slot: string): Promise<void> {
	return remove(ref(getRtdb(), `/signals/${myUid}/${slot}`));
}

/**
 * Надіслати сигнал — у СЛОТ, названий власним uid.
 *
 * Ключ = uid відправника, і це єдиний спосіб поставити тут стелю: примітива «не
 * більше N дітей» у RTDB не існує, тож обсяг гілки, у яку пише сторонній,
 * обмежується формою ключа — кожен займає рівно один слот (§ 12.1). Ціна:
 * другий сигнал від тієї самої людини перезаписує перший, і для «помахати» це
 * правильна поведінка.
 */
export function sendSignal(
	targetUid: string,
	fromUid: string,
	payload: { type: SignalRecord["type"]; fromName: string; fromPhoto: string | null }
): Promise<void> {
	return set(ref(getRtdb(), `/signals/${targetUid}/${fromUid}`), {
		type: payload.type,
		fromUid,
		fromName: payload.fromName,
		fromPhoto: payload.fromPhoto,
		timestamp: serverTimestamp()
	});
}

/** Показатися в режимі знайомств. Запис гасне сам разом із вкладкою. */
export async function enterDiscovery(
	uid: string,
	profile: { displayName: string; photoURL: string | null }
): Promise<void> {
	const entry = ref(getRtdb(), `/discovery/${uid}`);
	await onDisconnect(entry).remove();
	await set(entry, { ...profile, timestamp: serverTimestamp() });
}

/** Піти з режиму знайомств — і скасувати домовленість про прибирання. */
export async function leaveDiscovery(uid: string): Promise<void> {
	const entry = ref(getRtdb(), `/discovery/${uid}`);
	await onDisconnect(entry).cancel();
	await remove(entry);
}

/**
 * Підписка на список тих, хто зараз відкритий до знайомства.
 *
 * Свій запис відкидається тут, а не в сховищі: «не показувати себе» — властивість
 * списку, а не екрана.
 */
export function watchDiscovery(
	myUid: string | null,
	onList: (users: DiscoveryRecord[]) => void
): Unsubscribe {
	const list = query(
		ref(getRtdb(), "discovery"),
		orderByChild("timestamp"),
		limitToLast(DISCOVERY_WINDOW)
	);
	return onValue(list, (snapshot) => {
		const users: DiscoveryRecord[] = [];
		snapshot.forEach((child) => {
			if (child.key === myUid) return;
			const value = child.val() as Omit<DiscoveryRecord, "uid">;
			users.push({
				uid: child.key as string,
				displayName: value.displayName,
				photoURL: value.photoURL,
				timestamp: value.timestamp
			});
		});
		// Найновіші першими: `limitToLast` віддає хвіст у прямому порядку.
		onList(users.reverse());
	});
}
