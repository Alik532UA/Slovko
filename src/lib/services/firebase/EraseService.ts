import {
	collection,
	deleteDoc,
	doc,
	getDocs,
	limit,
	query,
	writeBatch,
	type Firestore
} from "firebase/firestore";
import { get, ref, remove } from "firebase/database";
import { getDb, getRtdb } from "./config";
import { allShardIds } from "./wordShards";
import { logService } from "../logService.svelte";

/**
 * ПОВНЕ ПРИБИРАННЯ ДАНИХ ГРАВЦЯ — перед видаленням самого користувача.
 *
 * ## Що було не так
 *
 * `AuthService.deleteAccount` прибирав ДВА документи: `users/{uid}` і
 * `profiles/{uid}`. Firestore при цьому НЕ видаляє підколекції разом із
 * документом — це записано в його документації й перевірено тут. Тобто після
 * «видалення акаунта» в базі лишалися:
 *
 *  * `users/{uid}/words/*` — прогрес по кожному вивченому слову, шістнадцять
 *    шардів;
 *  * `users/{uid}/history/*` — по документу на кожен активний день;
 *  * `users/{uid}/playlists_v2/*` — усі власні набори;
 *  * `users/{uid}/following/*` і `followers/*` — і, головне, ДЗЕРКАЛА цих
 *    записів у документах інших людей: у їхніх списках лишався рядок, що вказує
 *    в нікуди;
 *  * присутність і скринька сигналів у RTDB.
 *
 * Найгірше в цьому не обсяг, а те, що прибрати їх після `deleteUser()`
 * неможливо: правила вимагають `isOwner(uid)`, а власника вже немає. Тобто дані
 * лишалися назавжди, і жодна дія людини цього не міняла.
 *
 * ## Порядок не переставляється
 *
 * Спершу підколекції й дзеркала, потім головні документи, і лише потім (уже в
 * `AuthService`) сам користувач. Кожен крок спирається на право, яке в людини ще
 * є, — і зникає воно рівно на `deleteUser()`.
 *
 * ## Чого тут НЕМА, і це названо, а не забуто
 *
 * **Відгуки** (`feedback*`) прибрати з клієнта неможливо: правила дають на них
 * `create` і забороняють читання й видалення ВСІМ, включно з автором. Це
 * навмисно — відгук є матеріалом модерації, а не власністю профілю; прибрати
 * його можна лише з консолі. Так само `system_logs`: журнал лише дописується.
 *
 * **Сигнали, надіслані ІНШИМ**, лежать у їхніх скриньках (`signals/{них}/{я}`).
 * Перебрати адресатів звідси нічим — переліку надісланого не існує, — а
 * отримувач свій слот зносить сам (`presenceRtdb.dismissSignal`). Своя скринька
 * прибирається повністю.
 */

/**
 * Скільком документам читатися за раз.
 *
 * Межа тут — умова доступу, а не оптимізація: інваріант § 7.1 вимагає `limit()`
 * на кожному запиті колекції. Двісті — компроміс між кількістю проходів і межею
 * батча (500 операцій): один прохід завжди влазить в один батч.
 */
const PAGE = 200;

/**
 * Скільком проходам бути найбільше.
 *
 * Захист від нескінченного циклу, а не від обсягу: якби видалення тихо не
 * відбувалося (наприклад, правило змінили), `while` крутився б вічно. Двісті
 * проходів по двісті документів — сорок тисяч, тобто більше, ніж може накопичити
 * людина за роки гри.
 */
const MAX_PAGES = 200;

function db(): Firestore {
	return getDb();
}

/**
 * Прибрати підколекцію цілком, сторінка за сторінкою.
 *
 * Батчем, а не по одному: сто дрібних запитів на день історії — це сто
 * round-trip'ів, і на поганому зв'язку видалення виглядало б як зависання.
 */
async function erasePaged(path: string[], label: string): Promise<void> {
	for (let page = 0; page < MAX_PAGES; page++) {
		const found = await getDocs(
			query(collection(db(), path[0], ...path.slice(1)), limit(PAGE))
		);
		if (found.empty) return;

		const batch = writeBatch(db());
		for (const entry of found.docs) batch.delete(entry.ref);
		await batch.commit();

		// Сторінка неповна — далі нічого немає, і другий запит був би зайвим.
		if (found.size < PAGE) return;
	}
	logService.warn("sync", `Erase stopped at page limit: ${label}`);
}

/**
 * Прибрати підписки — і обидві половини кожної.
 *
 * Дзеркало обовʼязкове: `following/{target}` знає лише мій документ, а
 * `followers/{я}` лежить у ЧУЖОМУ. Права рівно на це вже є — правило дозволяє
 * видалити запис і тому, на кого підписані («прибери мене зі своїх підписок»).
 *
 * Кожне дзеркало під `catch`: чужий документ міг зникнути сам (людина видалила
 * акаунт раніше), і зупиняти через це видалення безглуздо.
 */
async function eraseFollows(uid: string): Promise<void> {
	const forgive = (promise: Promise<void>) =>
		promise.catch((error: unknown) => {
			logService.warn("sync", "Mirror not erased", error);
		});

	for (const [mine, theirs] of [
		["following", "followers"],
		["followers", "following"]
	] as const) {
		const found = await getDocs(query(collection(db(), "users", uid, mine), limit(PAGE)));
		await Promise.all(
			found.docs.flatMap((entry) => [
				forgive(deleteDoc(entry.ref)),
				forgive(deleteDoc(doc(db(), "users", entry.id, theirs, uid)))
			])
		);
	}
}

/**
 * Присутність, видимість і скринька сигналів у RTDB.
 *
 * ## Скринька сигналів — ПО СЛОТАХ, а не однією гілкою
 *
 * `/signals/{я}` цілком знести не можна, і це не недогляд правил: `.write` там
 * стоїть лише на `$to/$from`, тобто на окремому слоті. Ціна такого правила
 * названа в самих правилах — ключем слота є uid відправника, і саме це ставить
 * стелю на обсяг гілки, у яку пише сторонній. Читати свою скриньку я маю право,
 * тож перелік слотів беремо звідти й зносимо кожен окремо.
 *
 * НЕ КИДАЄ: це ефемерні дані (присутність зникає й сама, коли вкладка
 * закривається), і зупиняти через них видалення акаунта не варто.
 */
async function eraseRealtime(uid: string): Promise<void> {
	const forgive = (path: string, promise: Promise<unknown>) =>
		promise.catch((error: unknown) => {
			logService.warn("sync", `RTDB path not erased: ${path}`, error);
		});

	for (const path of [`/status/${uid}`, `/discovery/${uid}`]) {
		await forgive(path, remove(ref(getRtdb(), path)));
	}

	const box = await get(ref(getRtdb(), `/signals/${uid}`)).catch(() => null);
	const slots = box?.exists() ? Object.keys(box.val() as Record<string, unknown>) : [];
	await Promise.all(
		slots.map((from) =>
			forgive(`/signals/${uid}/${from}`, remove(ref(getRtdb(), `/signals/${uid}/${from}`)))
		)
	);
}

/**
 * Прибрати ВСЕ своє, крім самого користувача Auth.
 *
 * КИДАЄ на головних документах: людина натиснула «видалити акаунт», і половина
 * результату — найгірший можливий стан. Дрібниці (дзеркала, RTDB) при цьому
 * прощаються: вони не лишають доступних даних, лише сміття.
 */
export async function eraseUserData(uid: string): Promise<void> {
	// Шарди прогресу — за ВІДОМИМИ іменами: перелік той самий, що в синхронізації,
	// тож зайвий запит на перелічування колекції тут не потрібен.
	await Promise.all(
		allShardIds().map((shard) =>
			deleteDoc(doc(db(), "users", uid, "words", shard)).catch((error: unknown) => {
				logService.warn("sync", `Word shard not erased: ${shard}`, error);
			})
		)
	);

	await erasePaged(["users", uid, "history"], "history");
	await erasePaged(["users", uid, "playlists_v2"], "playlists_v2");
	await eraseFollows(uid);
	await eraseRealtime(uid);

	// Головні документи — останніми: доти вони ще потрібні (наприклад, публічний
	// профіль читає той, кому саме зараз показують список підписок).
	await deleteDoc(doc(db(), "profiles", uid));
	await deleteDoc(doc(db(), "users", uid));
}
