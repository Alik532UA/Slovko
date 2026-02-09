export const logConfig = {
	auth: false,
	profile: false,
	editor: false,
	store: true,
	game: true,
	sync: false,
	settings: false,
	interaction: false,
	presence: false,
	stats: false,
	ui: false,
	data: true,
	i18n: false,
	version: false,
};

const recentLogs: string[] = [];
const MAX_RECENT_LOGS = 100;

export const logService = {
	log(category: keyof typeof logConfig, message: string, ...args: unknown[]) {
		const logMsg = `[${category.toUpperCase()}] ${message}`;
		this.addToRecent(logMsg, args);
		if (logConfig[category]) {
			console.log(logMsg, ...args);
		}
	},
	error(category: keyof typeof logConfig, message: string, ...args: unknown[]) {
		const logMsg = `[ERROR][${category.toUpperCase()}] ${message}`;
		this.addToRecent(logMsg, args);
		console.error(logMsg, ...args);
	},
	warn(category: keyof typeof logConfig, message: string, ...args: unknown[]) {
		const logMsg = `[WARN][${category.toUpperCase()}] ${message}`;
		this.addToRecent(logMsg, args);
		console.warn(logMsg, ...args);
	},
	addToRecent(msg: string, args: unknown[]) {
		const fullMsg = `${new Date().toISOString().split('T')[1].split('.')[0]} ${msg} ${args.map(a => {
			try {
				return JSON.stringify(a);
			} catch {
				return String(a);
			}
		}).join(' ')}`;
		recentLogs.push(fullMsg);
		if (recentLogs.length > MAX_RECENT_LOGS) recentLogs.shift();
	},
	getRecentLogs() {
		return recentLogs.join('\n');
	},
	async copyLogsToClipboard() {
		const logs = this.getRecentLogs();
		const info = `UA: ${navigator.userAgent}\nURL: ${window.location.href}\n---\n${logs}`;
		try {
			await navigator.clipboard.writeText(info);
			return true;
		} catch (err) {
			console.error("Failed to copy logs:", err);
			return false;
		}
	},

	/**
	 * Очищує об'єкт від чутливих даних перед відправкою
	 */
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
	},
	
	/**
	 * Записує важливі події у Firestore для аналізу
	 */
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
			console.error("Failed to log to remote:", e);
		}
	}
};
