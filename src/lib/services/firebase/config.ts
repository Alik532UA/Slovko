import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getDatabase, type Database } from "firebase/database";

/**
 * Під'єднання до Firebase — ЛІНИВЕ.
 *
 * **Нічого не виконується на імпорті.** Доти цей файл викликав `initializeApp`,
 * `getAuth`, `getFirestore` і `getDatabase` у тілі модуля, тобто підключався до
 * бази від самого факту імпорту. Наслідок не косметичний: будь-який тест, який
 * транзитивно тягне цей файл — а його тягнуть сім сервісів і два стори, —
 * вимагав би бойових ключів, щоб узагалі зібратися. У сусідньому `MindStep` цей
 * самий патерн валив CI з `FirebaseError: auth/invalid-api-key` ще до першого
 * тесту: 77 перевірок проходили, а одинадцятий файл не збирався
 * (CODE-QUALITY-v8 § 4, CLOUD-DATABASE-v8 § 10.1).
 *
 * **Конфіг публічний за побудовою.** `apiKey` для веб-застосунку — не секрет:
 * він приїжджає в кожну сторінку. Захист дають правила доступу
 * (`firestore.rules`, `database.rules.json`) і список дозволених доменів, а не
 * приховування ключа (SECURITY-v9 § 4.1, § 12.2).
 *
 * **Значення стоять ТУТ, а не приїжджають зі змінних CI**, і це свідомий вибір
 * (SECURITY-v9 § 4.2.1, `SEC-CONFIG-IN-SOURCE`). Змінні дають рівно одне:
 * можливість зібрати той самий код під іншу базу. Такого сценарію тут немає —
 * проєкт Firebase один, `deploy-dev.yml` збирає під нього ж, а емулятор
 * чіпляється за адресою, а не іншим `projectId`.
 *
 * Натомість змінні коштували трьох речей, і всі три тут уже спрацювали:
 *
 * 1. одне значення жило в трьох місцях — локальний `.env`, Variables, Secrets;
 *    саме на такому розходженні цей репозиторій ледь не поїхав правилами в
 *    проєкт `slovko`, якого не існує (справжній — `slovko-alik532`);
 * 2. `git clone && npm run dev` не працював: без `.env` виходив
 *    `projectId: undefined` і незрозуміла помилка Firebase;
 * 3. значення не було ні в рев'ю, ні в історії, ні в резервній копії.
 *
 * Межа: щойно з'явиться ДРУГА база (тестова, демо, окремий стенд) — значення
 * повертаються у змінні, бо вшите в бандл перецілити неможливо.
 */

const firebaseConfig = {
	apiKey: "AIzaSyBnVP4mFgY94QLBe9_2eZ1ie4MJ9z32fC4",
	authDomain: "slovko-alik532.firebaseapp.com",
	databaseURL: "https://slovko-alik532-default-rtdb.europe-west1.firebasedatabase.app",
	projectId: "slovko-alik532",
	storageBucket: "slovko-alik532.firebasestorage.app",
	messagingSenderId: "611915779855",
	appId: "1:611915779855:web:5a9bc348b5c8c15cb6f87a",
} as const;

let app: FirebaseApp | null = null;
let firestore: Firestore | null = null;
let authInstance: Auth | null = null;
let database: Database | null = null;
let provider: GoogleAuthProvider | null = null;

export function getFirebaseApp(): FirebaseApp {
	if (app) return app;
	// `getApps()` — на випадок гарячого перезавантаження в dev: другий
	// `initializeApp` із тим самим іменем кидає.
	app = getApps()[0] ?? initializeApp(firebaseConfig);
	return app;
}

export function getDb(): Firestore {
	firestore ??= getFirestore(getFirebaseApp());
	return firestore;
}

export function getAuthInstance(): Auth {
	authInstance ??= getAuth(getFirebaseApp());
	return authInstance;
}

export function getRtdb(): Database {
	database ??= getDatabase(getFirebaseApp());
	return database;
}

export function getGoogleProvider(): GoogleAuthProvider {
	provider ??= new GoogleAuthProvider();
	return provider;
}
