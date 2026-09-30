// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * ВСТАНОВЛЕННЯ ОДНИМ НАТИСКОМ (канон FULLSCREEN-INSTALL § 4.3, § 8.1).
 *
 * Подію ловить скрипт першого кадру (`app.html`, перевіряє `src/install-first-frame.test.ts`)
 * і кладе в `window.__pwaInstallPrompt`. Тут — лише те, що з нею робить натиск. Подію
 * підробляємо: справжній Chrome кидає її лише придатному сайту, і лише коли йому заманеться.
 *
 * Зворотні експерименти, кожен червоний: подія не забувається після показу — «лише раз»;
 * `await` перед `prompt()` — «у тому самому натиску»; відмова без запису в журнал —
 * «браузер відмовив».
 */

const log = vi.hoisted(() => ({ info: vi.fn(), warn: vi.fn(), log: vi.fn(), error: vi.fn() }));
vi.mock("../logService.svelte", () => ({ logService: log }));

import { promptInstall } from "./installPrompt";

type Choice = { outcome: "accepted" | "dismissed"; platform: string };
type Stash = { __pwaInstallPrompt?: unknown };

let stash: Stash;

function stashPrompt(choice: Choice | Error) {
	const event = {
		prompt: vi.fn(async () => {
			if (choice instanceof Error) throw choice;
		}),
		userChoice: choice instanceof Error ? new Promise<Choice>(() => {}) : Promise.resolve(choice),
	};
	stash.__pwaInstallPrompt = event;
	return event;
}

beforeEach(() => {
	stash = {};
	vi.stubGlobal("window", stash);
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.clearAllMocks();
});

describe("вікно браузера «Встановити»", () => {
	it("без події — вікна немає, і натиск просить кроки", async () => {
		expect(await promptInstall()).toBe("unavailable");
		expect(log.warn).not.toHaveBeenCalled();
	});

	it("показує вікно браузера й віддає відповідь людини — лише раз", async () => {
		const event = stashPrompt({ outcome: "dismissed", platform: "web" });

		expect(await promptInstall()).toBe("dismissed");
		expect(event.prompt).toHaveBeenCalledTimes(1);
		expect(stash.__pwaInstallPrompt).toBeNull();
		expect(await promptInstall()).toBe("unavailable");
		expect(event.prompt).toHaveBeenCalledTimes(1);
	});

	it("згода — «accepted», і відповідь у журналі", async () => {
		stashPrompt({ outcome: "accepted", platform: "web" });
		expect(await promptInstall()).toBe("accepted");
		expect(log.info).toHaveBeenCalledWith("ui", "PWA: install prompt answered", { outcome: "accepted" });
	});

	/**
	 * Без дії людини браузер вікна не покаже: `prompt()` мусить прозвучати в тому самому
	 * натиску, тобто ДО першого `await`, — синхронно з викликом.
	 */
	it("prompt() кличеться в тому самому натиску, до першого await", () => {
		const event = stashPrompt({ outcome: "dismissed", platform: "web" });
		void promptInstall();
		expect(event.prompt).toHaveBeenCalledTimes(1);
	});

	it("браузер відмовив — у журнал, а натиск просить кроки", async () => {
		stashPrompt(new Error("not allowed"));

		expect(await promptInstall()).toBe("unavailable");
		expect(log.warn).toHaveBeenCalledWith("ui", "PWA: install prompt failed", {
			reason: "Error: not allowed",
		});
	});
});
