import { setContext, getContext } from "svelte";
import type { GameController } from "$lib/services/gameController";

const GAME_CONTROLLER_KEY = Symbol("GAME_CONTROLLER");

export function setGameController(controller: GameController) {
	setContext(GAME_CONTROLLER_KEY, controller);
}

export function getGameController(): GameController {
	const controller = getContext<GameController>(GAME_CONTROLLER_KEY);
	if (!controller) {
		throw new Error("GameController not found in context.");
	}
	return controller;
}
