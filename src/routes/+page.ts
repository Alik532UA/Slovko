import { gameOrchestrator } from "$lib/services/gameOrchestrator";
import { errorHandler } from "$lib/services/errorHandler";
import type { PageLoad } from "./$types";

// Вимикаємо SSR, оскільки гра залежить від localStorage та клієнтської логіки
export const ssr = false;

export const load: PageLoad = async ({ url }) => {
	try {
		return await gameOrchestrator.prepareGameSession(url);
	} catch (e) {
		errorHandler.handle(e, "PageLoad", { category: "game" });
		throw e; // Нехай SvelteKit обробить падіння, якщо оркестратор не впорався
	}
};