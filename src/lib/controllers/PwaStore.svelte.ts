/**
 * PwaStore — Керування станом встановлення (PWA)
 */

import { browser } from "$app/environment";
import { logService } from "../services/logService.svelte";

interface BeforeInstallPromptEvent extends Event {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

class PwaStore {
	private deferredPrompt = $state<BeforeInstallPromptEvent | null>(null);
	private _isInstalled = $state(false);
	
	private ua = browser ? window.navigator.userAgent : "";
	private _isIOS = $state(/iPad|iPhone|iPod/.test(this.ua) && !("MSStream" in window));
	private _isIosChrome = $state(this._isIOS && this.ua.indexOf('CriOS') > -1);
	private _isAndroid = $state(/Android/.test(this.ua));
	
	private _canInstall = $derived(!this._isInstalled);

	constructor() {
		if (browser) {
			this.init();
		}
	}

	get isInstalled() { return this._isInstalled; }
	get isIOS() { return this._isIOS; }
	get isIosChrome() { return this._isIosChrome; }
	get isAndroid() { return this._isAndroid; }
	get canInstall() { return this._canInstall; }
	get hasNativePrompt() { return !!this.deferredPrompt; }

	public init() {
		const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
							 ("standalone" in window.navigator && (window.navigator as any).standalone === true);
		this._isInstalled = isStandalone;

		window.addEventListener("beforeinstallprompt", (e) => {
			e.preventDefault();
			this.deferredPrompt = e as BeforeInstallPromptEvent;
			logService.log("ui", "PWA: Install prompt captured");
		});

		window.addEventListener("appinstalled", () => {
			logService.log("ui", "PWA: App installed");
			this.deferredPrompt = null;
			this._isInstalled = true;
		});
	}

	async install() {
		if (!browser) return "manual";
		if (this._isIOS) return "ios";

		if (this.deferredPrompt) {
			this.deferredPrompt.prompt();
			const { outcome } = await this.deferredPrompt.userChoice;
			this.deferredPrompt = null;
			return outcome === "accepted" ? "installed" : "dismissed";
		}

		return "manual";
	}
}

export const pwaStore = new PwaStore();
