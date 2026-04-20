/**
 * Storage Provider Interface
 * Defines how data should be persisted.
 */
export interface StorageProvider {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
	removeItem(key: string): void;
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

	setItem(key: string, value: string): void {
		if (typeof window === "undefined") return;
		localStorage.setItem(this.prefix + key, value);
	}

	removeItem(key: string): void {
		if (typeof window === "undefined") return;
		localStorage.removeItem(this.prefix + key);
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

	setItem(key: string, value: string): void {
		if (typeof window === "undefined") return;
		sessionStorage.setItem(this.prefix + key, value);
	}

	removeItem(key: string): void {
		if (typeof window === "undefined") return;
		sessionStorage.removeItem(this.prefix + key);
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
