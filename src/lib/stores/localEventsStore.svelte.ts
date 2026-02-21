import type { InteractionEvent } from "../firebase/PresenceService.svelte";
import { gameFeedbackHandler } from "../services/gameFeedbackHandler";

class LocalEventsStore {
    events = $state<InteractionEvent[]>([]);

    addAchievement(streak: number) {
        this.events.push({
            id: crypto.randomUUID(),
            type: "daily_goal_reached" as any, // Cast as any so it doesn't conflict with PresenceService if we remove it from there
            uid: "local_system",
            profile: { name: "", photoURL: null },
            timestamp: Date.now(),
            state: "expanded",
            streak,
        } as InteractionEvent);

        gameFeedbackHandler.playSuccessSound(0.3);
        gameFeedbackHandler.vibrate(100);
    }

    removeEvent(id: string) {
        this.events = this.events.filter((e) => e.id !== id);
    }
}

export const localEventsStore = new LocalEventsStore();
