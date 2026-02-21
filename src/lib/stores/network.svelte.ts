import { browser } from "$app/environment";
import { logService } from "../services/logService";

/**
 * Network Store — Відстеження стану мережі (Svelte 5 Runes)
 * Керує відображенням індикатора підключення з урахуванням затримок.
 */

type NetworkState = 'online' | 'offline';

class NetworkStoreClass {
	// Реактивні стани
	private _isOnline = $state(true);
	private _showIndicator = $state(false);
	private _indicatorType = $state<NetworkState>('online');
	
	private hideTimer: ReturnType<typeof setTimeout> | null = null;
	private offlineDelayTimer: ReturnType<typeof setTimeout> | null = null;

	constructor() {
		if (browser) {
			this._isOnline = window.navigator.onLine;
			
			// Якщо при завантаженні мережі вже немає — показуємо відразу
			if (!this._isOnline) {
				this._showIndicator = true;
				this._indicatorType = 'offline';
			}

			window.addEventListener('online', () => this.handleOnline());
			window.addEventListener('offline', () => this.handleOffline());
		}
	}

	get isOnline() { return this._isOnline; }
	get showIndicator() { return this._showIndicator; }
	get indicatorType() { return this._indicatorType; }

	private handleOnline() {
		this._isOnline = true;
		logService.log("ui", "Network: Online");

		// Скасовуємо таймер появи "offline", якщо інтернет з'явився швидко
		if (this.offlineDelayTimer) {
			clearTimeout(this.offlineDelayTimer);
			this.offlineDelayTimer = null;
		}

		// Якщо індикатор "offline" був показаний — змінюємо на "online"
		if (this._showIndicator && this._indicatorType === 'offline') {
			this._indicatorType = 'online';
			
			// Ховаємо через 1.5 секунди (відповідно до вимог 1-2с)
			if (this.hideTimer) clearTimeout(this.hideTimer);
			this.hideTimer = setTimeout(() => {
				this._showIndicator = false;
			}, 1500);
		}
	}

	private handleOffline() {
		this._isOnline = false;
		logService.log("ui", "Network: Offline");

		// Скасовуємо таймер приховання, якщо він був (наприклад, швидко перемкнули)
		if (this.hideTimer) {
			clearTimeout(this.hideTimer);
			this.hideTimer = null;
		}

		// Показуємо іконку відсутності зв'язку через 1.5 секунди (вимога 1-2с)
		if (this.offlineDelayTimer) clearTimeout(this.offlineDelayTimer);
		this.offlineDelayTimer = setTimeout(() => {
			if (!this._isOnline) {
				this._indicatorType = 'offline';
				this._showIndicator = true;
			}
		}, 1500);
	}
}

export const networkStore = new NetworkStoreClass();
