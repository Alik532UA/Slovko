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
 * приховування ключа (SECURITY-v8 § 4.1, § 12.2).
 */

const firebaseConfig = {
	apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
	authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
	databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
	projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
	storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
	appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let firestore: Firestore | null = null;
let authInstance: Auth | null = null;
let database: Database | null = null;
let provider: GoogleAuthProvider | null = null;

/** Чи налаштований Firebase узагалі. Без ключа немає сенсу навіть пробувати. */
export function isFirebaseConfigured(): boolean {
	return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
}

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
