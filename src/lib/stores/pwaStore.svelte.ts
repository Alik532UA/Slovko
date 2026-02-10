/**
 * PWA Store — Керування станом встановлення (PWA)
 * Відстежує можливість встановлення, тип платформи та статус.
 */

import { browser } from "$app/environment";
import { logService } from "../services/logService";

interface BeforeInstallPromptEvent extends Event {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

function createPwaStore() {
	let deferredPrompt = $state<BeforeInstallPromptEvent | null>(null);
	let isInstalled = $state(false);
	let isIOS = $state(false);
	let isAndroid = $state(false);
	
	// Тепер кнопка доступна завжди, якщо додаток не встановлено
	let canInstall = $derived(!isInstalled);

	function init() {
		if (!browser) return;

		const ua = window.navigator.userAgent;
		isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
		isAndroid = /Android/.test(ua);
		
		// Перевірка, чи вже встановлено
		const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
							 (window.navigator as any).standalone === true;
		isInstalled = isStandalone;

		window.addEventListener("beforeinstallprompt", (e) => {
			e.preventDefault();
			deferredPrompt = e as BeforeInstallPromptEvent;
			logService.log("ui", "PWA: Install prompt captured");
		});

		window.addEventListener("appinstalled", () => {
			logService.log("ui", "PWA: App installed");
			deferredPrompt = null;
			isInstalled = true;
		});
	}

	async function install() {
		if (!browser) return "manual";

		if (isIOS) return "ios";

		if (deferredPrompt) {
			deferredPrompt.prompt();
			const { outcome } = await deferredPrompt.userChoice;
			deferredPrompt = null;
			return outcome === "accepted" ? "installed" : "dismissed";
		}

		// Якщо немає промпта, але ми на Android або Windows
		return "manual";
	}

	return {
		get isInstalled() { return isInstalled; },
		get isIOS() { return isIOS; },
		get isAndroid() { return isAndroid; },
		get canInstall() { return canInstall; },
		get hasNativePrompt() { return !!deferredPrompt; },
		init,
		install
	};
}

export const pwaStore = createPwaStore();