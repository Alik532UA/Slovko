import { browser, dev } from "$app/environment";
import { base } from "$app/paths";

export const logConfig = {
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
	debug: true, // system/fallback logs
};

const MAX_RECENT_LOGS = 1000;

class LogService {
	errorCount = $state(0);
	private recentLogs: string[] = [];

	constructor() {
		if (browser) {
			const saved = sessionStorage.getItem("slovko_logs");
			if (saved) {
				try {
					this.recentLogs = JSON.parse(saved);
				} catch (e) {
					// ignore
				}
			}
			window.__recentLogs = this.recentLogs;
		}
	}

	log(category: string, message: string, ...args: unknown[]) {
		const logMsg = `[${category.toUpperCase()}] ${message}`;
		this.addToRecent(logMsg, args);
		if (dev || category === 'debug' || logConfig[category as keyof typeof logConfig]) {
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
		if (dev || category === 'debug' || logConfig[category as keyof typeof logConfig]) {
			console.warn(logMsg, ...args);
		}
	}

	info(category: string, message: string, ...args: unknown[]) {
		this.log(category, message, ...args);
	}

	addToRecent(msg: string, args: unknown[]) {
		const time = new Date().toISOString();
		const fullMsg = `${time} ${msg} ${args.map(a => {
			try {
				if (typeof a === 'object') return JSON.stringify(a);
				return String(a);
			} catch {
				return String(a);
			}
		}).join(' ')}`;
		this.recentLogs.push(fullMsg);
		if (this.recentLogs.length > MAX_RECENT_LOGS) this.recentLogs.shift();
		if (browser) {
			sessionStorage.setItem("slovko_logs", JSON.stringify(this.recentLogs));
			window.__recentLogs = this.recentLogs;
		}
	}

	getRecentLogs() {
		return this.recentLogs.join('\n');
	}

	async copyLogsToClipboard() {
		const logs = this.getRecentLogs();
		let appVersion = "unknown";
		if (browser) {
			try {
				const res = await fetch(`${base}/app-version.json?t=` + Date.now());
				if (res.ok) {
					const data = await res.json();
					appVersion = data.version;
				}
			} catch (e) {
				// ignore
			}
		}
		
		const info = `--- REPORT from Copy LOG button ---\nDATE: ${new Date().toLocaleString()}\nURL: ${browser ? window.location.href : 'SSR'}\nDEVICE: ${navigator.userAgent}\nVERSION: ${appVersion}\n---\n${logs}`;
		try {
			await navigator.clipboard.writeText(info);
			return true;
		} catch (err) {
			this.error("system", "Failed to copy logs");
			if (browser) alert("Could not copy automatically. See console.");
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
		} catch (e: unknown) {
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
