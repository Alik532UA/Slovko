import {
	collection,
	doc,
	getDoc,
	getDocs,
	limit,
	onSnapshot,
	orderBy,
	query,
	setDoc,
	where,
	type DocumentData,
	type Unsubscribe,
} from "firebase/firestore";
import { getDb } from "./config";

/**
 * Читання й запис особистих даних користувача.
 *
 * **Чому окремий файл.** `FriendsStore` і `StatisticsState` — це `.svelte.ts`,
 * тобто модулі з рунами. SDK бази в такому модулі означає, що мережевий шар
 * приходить разом із реактивністю: його не підмінити в тесті, не винести й не
 * перевірити окремо (SVELTE-CORE-v8 § 8.1, CLOUD-DATABASE-v8 § 10.4).
 *
 * Тут — чисті async-функції без рун. Стор тримає стан і кличе їх.
 *
 * **Усі шляхи ведуть у власні документи.** Правило доступу звужене до `isOwner`,
 * тож чужу історію чи чужі підписки звідси не прочитати — і це не обмеження
 * реалізації, а межа, яку тримає база.
 */

/** Скільки днів історії читати за раз. Без межі запит росте з віком акаунта. */
const HISTORY_PAGE = 400;

const usersCollection = () => collection(getDb(), "users");

/**
 * Скільком підпискам і підписникам приїжджати в застосунок.
 *
 * Межа тут обовʼязкова, і не тому, що список великий, а тому що його розмір
 * задає НЕ власник: у `followers` пише кожен, хто на нього підписався. Без
 * `limit()` це підписка на набір, що росте від чужих дій, і платить за нього
 * кожен приїзд будь-якої зміни (CLOUD-DATABASE-v8 § 7.1, § 12.1).
 *
 * Число обране за екраном: список друзів показує десятки, а не тисячі. Коли
 * доведеться більше — це пагінація, а не підняте число.
 */
const FOLLOWS_WINDOW = 200;

/** Підписка на списки підписок і підписників. Повертає ОДНУ відписку на обидві. */
export function watchFollows(
	uid: string,
	onChange: (kind: "following" | "followers", docs: DocumentData[]) => void,
): Unsubscribe {
	const db = getDb();
	const unsubFollowing = onSnapshot(
		query(collection(db, "users", uid, "following"), limit(FOLLOWS_WINDOW)),
		(snapshot) =>
			onChange(
				"following",
				snapshot.docs.map((entry) => entry.data()),
			),
	);
	const unsubFollowers = onSnapshot(
		query(collection(db, "users", uid, "followers"), limit(FOLLOWS_WINDOW)),
		(snapshot) =>
			onChange(
				"followers",
				snapshot.docs.map((entry) => entry.data()),
			),
	);
	return () => {
		unsubFollowing();
		unsubFollowers();
	};
}

/**
 * Історія за діапазон дат.
 *
 * Ідентифікатор документа — сама дата (`YYYY-MM-DD`), тож діапазон береться
 * порівнянням `__name__` і не потребує ні поля, ні індексу. `limit()` стоїть
 * попри те, що діапазон і так скінченний: запит без межі росте разом із віком
 * акаунта, і одного дня це помітять не тут, а в рахунку (CLOUD-DATABASE-v8 § 7.1).
 */
export async function fetchHistoryRange(
	uid: string,
	startDate: string,
	endDate: string,
): Promise<Array<{ id: string; data: DocumentData }>> {
	const snapshot = await getDocs(
		query(
			collection(usersCollection(), uid, "history"),
			where("__name__", ">=", startDate),
			where("__name__", "<=", endDate),
			orderBy("__name__", "asc"),
			limit(HISTORY_PAGE),
		),
	);
	return snapshot.docs.map((entry) => ({ id: entry.id, data: entry.data() }));
}

/** Уся історія користувача — сторінкою. Використовується для підсумків. */
export async function fetchHistoryPage(
	uid: string,
): Promise<Array<{ id: string; data: DocumentData }>> {
	const snapshot = await getDocs(
		query(collection(usersCollection(), uid, "history"), orderBy("__name__", "desc"), limit(HISTORY_PAGE)),
	);
	return snapshot.docs.map((entry) => ({ id: entry.id, data: entry.data() }));
}

/** Активність за один день. */
export async function fetchHistoryDay(uid: string, date: string): Promise<DocumentData | null> {
	const snapshot = await getDoc(doc(usersCollection(), uid, "history", date));
	return snapshot.exists() ? snapshot.data() : null;
}

/** Записати активність за день. Пише лише власник — так вимагає правило. */
export async function saveHistoryDay(
	uid: string,
	date: string,
	data: DocumentData,
): Promise<void> {
	await setDoc(doc(usersCollection(), uid, "history", date), data, { merge: true });
}
