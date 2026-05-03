import { browser, dev } from "$app/environment";
import { sessionStorageProvider } from "./storage/storageProvider";

const MAX_RECENT_LOGS = 1000;

class LogService {
	errorCount = $state(0);
	private recentLogs: string[] = [];
	
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
		const fullMsg = `${time} ${msg} ${args.map(a => {
			try {
				let str = '';
				if (typeof a === 'object' && a !== null) {
					str = JSON.stringify(a);
				} else {
					str = String(a);
				}
				
				if (str.length > MAX_ARG_LENGTH) {
					return str.substring(0, MAX_ARG_LENGTH) + '... [truncated]';
				}
				return str;
			} catch {
				return String(a);
			}
		}).join(' ')}`;
		
		this.recentLogs.push(fullMsg);
		if (this.recentLogs.length > MAX_RECENT_LOGS) this.recentLogs.shift();
		
		if (browser) {
			try {
				const logsJson = JSON.stringify(this.recentLogs);
				// If logs are still too big (e.g. > 2MB), reduce the count more aggressively
				if (logsJson.length > 2 * 1024 * 1024) {
					while (this.recentLogs.length > 100) {
						this.recentLogs.shift();
					}
					sessionStorageProvider.setItem("logs", JSON.stringify(this.recentLogs));
				} else {
					sessionStorageProvider.setItem("logs", logsJson);
				}
				window.__recentLogs = this.recentLogs;
			} catch (e) {
				// Fallback: clear logs if storage is still failing despite truncation
				console.error("Failed to save logs to storage even after truncation", e);
			}
		}
	}

	getRecentLogs() {
		return this.recentLogs.join('\n');
	}

	async copyLogsToClipboard() {
		const logs = this.getRecentLogs();
		const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : "unknown";
		const buildTime = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : "unknown";
		
		const info = `--- LOG REPORT ---\nDATE: ${new Date().toLocaleString()}\nURL: ${browser ? window.location.href : 'SSR'}\nDEVICE: ${navigator.userAgent}\nVERSION: ${appVersion}\nBUILD: ${buildTime}\n---\n${logs}`;
		try {
			await navigator.clipboard.writeText(info);
			return true;
		} catch (_err) {
			this.error("system", "Failed to copy logs");
			return false;
		}
	}

	sanitizeDetails(details: Record<string, unknown>): Record<string, unknown> {
		const SENSITIVE_KEYS = ['password', 'token', 'email', 'credential', 'secret', 'key'];
		const sanitized = { ...details };

		Object.keys(sanitized).forEach(key => {
			const lowerKey = key.toLowerCase();
			if (SENSITIVE_KEYS.some(k => lowerKey.includes(k))) {
				sanitized[key] = '[REDACTED]';
			} else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
				sanitized[key] = this.sanitizeDetails(sanitized[key] as Record<string, unknown>);
			}
		});

		return sanitized;
	}

	async logToRemote(action: string, details: Record<string, unknown>) {
		try {
			const sanitizedDetails = this.sanitizeDetails(details);
			const { db, auth } = await import("../firebase/config");
			const { collection, addDoc, serverTimestamp } = await import("firebase/firestore");

			const uid = auth.currentUser?.uid || "anonymous";

			await addDoc(collection(db, "system_logs"), {
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
