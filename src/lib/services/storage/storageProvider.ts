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
	getItem(key: string): string | null {
		if (typeof window === "undefined") return null;
		return localStorage.getItem(key);
	}

	setItem(key: string, value: string): void {
		if (typeof window === "undefined") return;
		localStorage.setItem(key, value);
	}

	removeItem(key: string): void {
		if (typeof window === "undefined") return;
		localStorage.removeItem(key);
	}
}

export const localStorageProvider = new LocalStorageProvider();
