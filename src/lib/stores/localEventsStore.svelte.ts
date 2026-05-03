import type { InteractionEvent } from "../firebase/PresenceService.svelte";
import { gameFeedbackHandler } from "../services/gameFeedbackHandler";

class LocalEventsStore {
    events = $state<InteractionEvent[]>([]);

    addAchievement(streak: number) {
        this.events.push({
            id: crypto.randomUUID(),
            type: "daily_goal_reached",
            uid: "local_system",
            profile: { name: "", photoURL: null },
            timestamp: Date.now(),
            state: "expanded",
            streak,
        });

        gameFeedbackHandler.playSuccessSound(0.3);
        gameFeedbackHandler.vibrate(100);
    }

    addLeaderGapReached(gap: number) {
        this.events.push({
            id: crypto.randomUUID(),
            type: "leader_gap_reached",
            uid: "local_system",
            profile: { name: "", photoURL: null },
            timestamp: Date.now(),
            state: "expanded",
            gap,
        });

        gameFeedbackHandler.playSuccessSound(0.2);
    }

    addLeaderOvertaken() {
        this.events.push({
            id: crypto.randomUUID(),
            type: "leader_overtaken",
            uid: "local_system",
            profile: { name: "", photoURL: null },
            timestamp: Date.now(),
            state: "expanded",
        });

        gameFeedbackHandler.playSuccessSound(0.5);
        gameFeedbackHandler.vibrate(200);
    }

    removeEvent(id: string) {
        this.events = this.events.filter((e) => e.id !== id);
    }

    updateEventState(id: string, state: "collapsed" | "expanded" | "sent") {
        const event = this.events.find((e) => e.id === id);
        if (event) {
            event.state = state;
        }
    }
}

export const localEventsStore = new LocalEventsStore();
