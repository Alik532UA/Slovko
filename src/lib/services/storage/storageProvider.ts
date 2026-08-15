/**
 * Storage Provider Interface
 * Defines how data should be persisted.
 */
export interface StorageProvider {
	getItem(key: string): string | null;
	/**
	 * `true` — значення записане. Фасад не кидає (STORAGE-NAMESPACE-v8, Крок 1),
	 * але мовчазна відмова так само небезпечна: логер саме через неї не міг
	 * виконати DEBUGGING-v8 § 1.5 і довбав переповнене сховище на кожен запис.
	 * Викликач має право проігнорувати відповідь — тоді поведінка як була.
	 */
	setItem(key: string, value: string): boolean;
	removeItem(key: string): void;
	getJson<T>(key: string): T | null;
	setJson(key: string, value: unknown): boolean;
	clear(): void;
}

/**
 * LocalStorage implementation of StorageProvider
 */
export class LocalStorageProvider implements StorageProvider {
	private prefix: string;

	constructor(prefix: string = "slovko_") {
		this.prefix = prefix;
	}

	getItem(key: string): string | null {
		if (typeof window === "undefined") return null;
		return localStorage.getItem(this.prefix + key);
	}

	setItem(key: string, value: string): boolean {
		if (typeof window === "undefined") return false;
		try {
			localStorage.setItem(this.prefix + key, value);
			return true;
		} catch (e) {
			console.error(`LocalStorage Error: Failed to set item "${key}". Possibly quota exceeded.`, e);
			return false;
		}
	}

	removeItem(key: string): void {
		if (typeof window === "undefined") return;
		localStorage.removeItem(this.prefix + key);
	}

	getJson<T>(key: string): T | null {
		const raw = this.getItem(key);
		if (raw === null) return null;
		try {
			return JSON.parse(raw) as T;
		} catch {
			return null;
		}
	}

	setJson(key: string, value: unknown): boolean {
		return this.setItem(key, JSON.stringify(value));
	}

	clear(): void {
		if (typeof window === "undefined") return;
		const keysToRemove: string[] = [];
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key?.startsWith(this.prefix)) {
				keysToRemove.push(key);
			}
		}
		keysToRemove.forEach((k) => localStorage.removeItem(k));
	}
}

/**
 * SessionStorage implementation of StorageProvider
 */
export class SessionStorageProvider implements StorageProvider {
	private prefix: string;

	constructor(prefix: string = "slovko_") {
		this.prefix = prefix;
	}

	getItem(key: string): string | null {
		if (typeof window === "undefined") return null;
		return sessionStorage.getItem(this.prefix + key);
	}

	setItem(key: string, value: string): boolean {
		if (typeof window === "undefined") return false;
		try {
			sessionStorage.setItem(this.prefix + key, value);
			return true;
		} catch (e) {
			console.error(`SessionStorage Error: Failed to set item "${key}". Possibly quota exceeded.`, e);
			return false;
		}
	}

	removeItem(key: string): void {
		if (typeof window === "undefined") return;
		sessionStorage.removeItem(this.prefix + key);
	}

	getJson<T>(key: string): T | null {
		const raw = this.getItem(key);
		if (raw === null) return null;
		try {
			return JSON.parse(raw) as T;
		} catch {
			return null;
		}
	}

	setJson(key: string, value: unknown): boolean {
		return this.setItem(key, JSON.stringify(value));
	}

	clear(): void {
		if (typeof window === "undefined") return;
		const keysToRemove: string[] = [];
		for (let i = 0; i < sessionStorage.length; i++) {
			const key = sessionStorage.key(i);
			if (key?.startsWith(this.prefix)) {
				keysToRemove.push(key);
			}
		}
		keysToRemove.forEach((k) => sessionStorage.removeItem(k));
	}
}

export const localStorageProvider = new LocalStorageProvider();
export const sessionStorageProvider = new SessionStorageProvider();
