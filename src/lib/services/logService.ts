export const logConfig = {
	auth: true,
	profile: false,
	editor: false,
	store: false,
	game: false,
	sync: false,
	settings: false,
	interaction: true,
	presence: true,
	stats: true,
};

const recentLogs: string[] = [];
const MAX_RECENT_LOGS = 100;

export const logService = {
	log(category: keyof typeof logConfig, message: string, ...args: any[]) {
		const logMsg = `[${category.toUpperCase()}] ${message}`;
		this.addToRecent(logMsg, args);
		if (logConfig[category]) {
			console.log(logMsg, ...args);
		}
	},
	error(category: keyof typeof logConfig, message: string, ...args: any[]) {
		const logMsg = `[ERROR][${category.toUpperCase()}] ${message}`;
		this.addToRecent(logMsg, args);
		console.error(logMsg, ...args);
	},
	warn(category: keyof typeof logConfig, message: string, ...args: any[]) {
		const logMsg = `[WARN][${category.toUpperCase()}] ${message}`;
		this.addToRecent(logMsg, args);
		console.warn(logMsg, ...args);
	},
	addToRecent(msg: string, args: any[]) {
		const fullMsg = `${new Date().toISOString().split('T')[1].split('.')[0]} ${msg} ${args.map(a => JSON.stringify(a)).join(' ')}`;
		recentLogs.push(fullMsg);
		if (recentLogs.length > MAX_RECENT_LOGS) recentLogs.shift();
	},
	getRecentLogs() {
		return recentLogs.join('\n');
	},
	
	/**
	 * Записує важливі події у Firestore для аналізу
	 */
	async logToRemote(action: string, details: Record<string, any>) {
		try {
			const { db, auth } = await import("../firebase/config");
			const { collection, addDoc, serverTimestamp } = await import("firebase/firestore");
			
			const uid = auth.currentUser?.uid || "anonymous";
			
			await addDoc(collection(db, "system_logs"), {
				timestamp: serverTimestamp(),
				uid,
				action,
				details,
				userAgent: navigator.userAgent
			});
		} catch (e) {
			console.error("Failed to log to remote:", e);
		}
	}
};
