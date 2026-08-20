import { browser, dev } from "$app/environment";
import { sessionStorageProvider } from "./storage/storageProvider";

const MAX_RECENT_LOGS = 1000;

/**
 * Редакція персональних даних (SECURITY-v8 § 10, DEBUGGING-v8 § 1.4).
 *
 * Раніше `sanitizeDetails` викликався в одному місці — у `logToRemote`. Тобто
 * захищений був канал, яким користуються сім разів, а буфер, sessionStorage і
 * звіт, який користувач копіює й надсилає ТРЕТІЙ ОСОБІ, не чистилися взагалі.
 * Канон вимагає протилежного порядку: редакцію робить логер, а не місця
 * виклику, бо достатньо одного забутого місця, щоб правило не працювало.
 */
const REDACT_KEY = /^(password|passwd|token|accessToken|refreshToken|idToken|authorization|cookie|credential|secret|apiKey|email|phone)$/i;

/** Адреса в довільному рядку: `john.doe@site.com` → `j***@site.com`. */
const EMAIL_IN_TEXT = /([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*(@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;

/** Параметри адреси, у яких зазвичай і їде секрет. */
const SECRET_PARAM = /^(token|access_token|id_token|key|apiKey|code|state|password)$/i;

function maskText(text: string): string {
	return text.replace(EMAIL_IN_TEXT, "$1***$2").replace(/https?:\/\/\S+/g, maskUrl);
}

function maskUrl(raw: string): string {
	try {
		const url = new URL(raw);
		let touched = false;
		for (const key of [...url.searchParams.keys()]) {
			if (SECRET_PARAM.test(key)) {
				url.searchParams.set(key, "«приховано»");
				touched = true;
			}
		}
		return touched ? url.toString() : raw;
	} catch {
		// Не адреса — лишаємо як є: редакція не має права нічого зіпсувати.
		return raw;
	}
}

function scrub(value: unknown, depth = 0): unknown {
	if (depth > 6) return "«глибше не читаємо»";
	if (typeof value === "string") return maskText(value);
	if (Array.isArray(value)) return value.map((v) => scrub(v, depth + 1));
	if (value instanceof Error) return maskText(`${value.name}: ${value.message}`);
	if (value && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value as Record<string, unknown>).map(([k, v]) => [
				k,
				REDACT_KEY.test(k) ? "«приховано»" : scrub(v, depth + 1),
			]),
		);
	}
	return value;
}

class LogService {
	errorCount = $state(0);
	private recentLogs: string[] = [];
	/**
	 * DEBUGGING-v8 § 1.5: після відмови сховища дзеркалення вимикається до кінця
	 * сесії. Втратити дзеркало прийнятно; довбати заповнене сховище на кожен
	 * запис — ні.
	 */
	private mirrorEnabled = true;

	private logConfig = {
		auth: false,
		profile: false,
		editor: false,
		store: false,
		game: false,
		sync: true,
		settings: false,
		interaction: false,
		presence: false,
		stats: false,
		data: false,
		i18n: false,
		version: false,
		ui: false,
		score: true,
		debug: true,
	};

	constructor() {
		if (browser) {
			const saved = sessionStorageProvider.getItem("logs");
			if (saved) {
				try {
					this.recentLogs = JSON.parse(saved);
				} catch (_e) {
					// ignore
				}
			}
			window.__recentLogs = this.recentLogs;
		}
	}

	private shouldLog(category: string): boolean {
		if (dev) return true;
		if (category === 'error') return true;
		return this.logConfig[category as keyof typeof this.logConfig] || false;
	}

	log(category: string, message: string, ...args: unknown[]) {
		const logMsg = `[${category.toUpperCase()}] ${message}`;
		this.addToRecent(logMsg, args);
		if (this.shouldLog(category)) {
			console.log(logMsg, ...args);
		}
	}

	error(category: string, message: string, ...args: unknown[]) {
		this.errorCount++;
		const logMsg = `[ERROR][${category.toUpperCase()}] ${message}`;
		this.addToRecent(logMsg, args);
		console.error(logMsg, ...args);
	}

	warn(category: string, message: string, ...args: unknown[]) {
		const logMsg = `[WARN][${category.toUpperCase()}] ${message}`;
		this.addToRecent(logMsg, args);
		if (this.shouldLog(category)) {
			console.warn(logMsg, ...args);
		}
	}

	info(category: string, message: string, ...args: unknown[]) {
		this.log(category, message, ...args);
	}

	addToRecent(msg: string, args: unknown[]) {
		const time = new Date().toISOString();
		const MAX_ARG_LENGTH = 500;
		// Редакція — тут, на єдиному шляху, яким запис потрапляє і в буфер, і в
		// sessionStorage, і у звіт для розробника (SECURITY-v8 § 10).
		const fullMsg = `${time} ${maskText(msg)} ${args.map(a => {
			try {
				const safe = scrub(a);
				let str = '';
				if (typeof safe === 'object' && safe !== null) {
					str = JSON.stringify(safe);
				} else {
					str = String(safe);
				}

				if (str.length > MAX_ARG_LENGTH) {
					return str.substring(0, MAX_ARG_LENGTH) + '... [truncated]';
				}
				return str;
			} catch {
				return maskText(String(a));
			}
		}).join(' ')}`;

		this.recentLogs.push(fullMsg);
		if (this.recentLogs.length > MAX_RECENT_LOGS) this.recentLogs.shift();

		if (browser) {
			try {
				window.__recentLogs = this.recentLogs;
				if (!this.mirrorEnabled) return;

				const logsJson = JSON.stringify(this.recentLogs);
				// If logs are still too big (e.g. > 2MB), reduce the count more aggressively
				if (logsJson.length > 2 * 1024 * 1024) {
					while (this.recentLogs.length > 100) {
						this.recentLogs.shift();
					}
					this.mirror(JSON.stringify(this.recentLogs));
				} else {
					this.mirror(logsJson);
				}
			} catch {
				// Жоден шлях логера не має права кинути назовні: виняток тут
				// поклав би саме той код, який намагалися залогувати
				// (DEBUGGING-v8 § 1.5). Буфер у памʼяті лишається робочим.
				this.mirrorEnabled = false;
			}
		}
	}

	/** Дзеркало в sessionStorage. Перша ж відмова вимикає його до кінця сесії. */
	private mirror(payload: string) {
		if (!sessionStorageProvider.setItem("logs", payload)) {
			this.mirrorEnabled = false;
		}
	}

	getRecentLogs() {
		return this.recentLogs.join('\n');
	}

	async copyLogsToClipboard() {
		const logs = this.getRecentLogs();
		const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : "unknown";
		const buildTime = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : "unknown";
		
		// ISO, а не toLocaleString(): звіт читає той, хто розбирає збій, а не
		// користувач, який його скопіював. Голий toLocaleString() рендериться в
		// локалі СИСТЕМИ користувача — 03.08 чи 08.03 залежно від того, де він
		// живе, і розрізнити їх у звіті нема по чому (I18N-v8 § 4.3). Для
		// проєкту з сімома мовами це не гіпотеза.
		// ONLINE — половина звітів «нічого не працює» пояснюється саме цим рядком
		// (DEBUGGING-v8 § 2.3). URL проходить ту саму редакцію, що й записи: у
		// параметрах адреси їде код авторизації після повернення від провайдера.
		const url = browser ? maskText(window.location.href) : 'SSR';
		const online = browser ? String(navigator.onLine) : 'n/a';
		const info = `--- LOG REPORT ---\nDATE: ${new Date().toISOString()}\nURL: ${url}\nONLINE: ${online}\nDEVICE: ${navigator.userAgent}\nVERSION: ${appVersion}\nBUILD: ${buildTime}\n---\n${logs}`;
		try {
			await navigator.clipboard.writeText(info);
			return true;
		} catch (_err) {
			this.warn("system", "Failed to copy logs to clipboard");
			return false;
		}
	}

	/**
	 * Той самий `scrub`, що чистить буфер: одна реалізація на всі канали. Раніше
	 * тут жила друга, окрема, і саме вона була єдиною в проєкті — тобто чистився
	 * лише віддалений журнал, а звіт для розробника ні.
	 */
	sanitizeDetails(details: Record<string, unknown>): Record<string, unknown> {
		return scrub(details) as Record<string, unknown>;
	}

	async logToRemote(action: string, details: Record<string, unknown>) {
		try {
			const sanitizedDetails = this.sanitizeDetails(details);
			const { getDb, getAuthInstance } = await import("../services/firebase/config");
			const { collection, addDoc, serverTimestamp } = await import("firebase/firestore");

			/*
			 * Запис можливий лише від свого імені — так вимагає правило
			 * `system_logs`. Неавторизований журнал не пише взагалі: інакше
			 * колекція перетворилася б на відкриту скриньку для будь-кого.
			 */
			const uid = getAuthInstance().currentUser?.uid;
			if (!uid) return;

			await addDoc(collection(getDb(), "system_logs"), {
				timestamp: serverTimestamp(),
				uid,
				action,
				details: sanitizedDetails,
				userAgent: navigator.userAgent
			});
		} catch (_e: unknown) {
			this.error("system", "Failed to log to remote");
		}
	}
}

export const logService = new LogService();

declare global {
	interface Window {
		__recentLogs: string[];
	}
}
