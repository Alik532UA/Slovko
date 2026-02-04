import { addDoc, serverTimestamp, doc, setDoc } from "firebase/firestore";
import { db, auth } from "./config";
import { versionStore } from "../stores/versionStore.svelte";
import { settingsStore } from "../stores/settingsStore.svelte";
import { logService } from "../services/logService";

export type FeedbackCategory = "bug" | "improvement" | "contact";

export interface FeedbackData {
	category: FeedbackCategory;
	title: string;
	message: string;
}

export interface WordReportData {
	wordKey: string;
	errorType: string;
	comment?: string;
	sourceTranslation: string;
	targetTranslation: string;
}

export const FeedbackService = {
	async submitFeedback(data: FeedbackData) {
		// ... існуючий код ...
	},

	async reportWordError(data: WordReportData) {
		try {
			const now = new Date();
			const timestampId = now
				.toISOString()
				.replace("T", "-")
				.slice(0, 19)
				.replace(/:/g, "-");

			// Шлях: word_reports -> {timestampId}
			const docRef = doc(db, "word_reports", timestampId);

			const payload = {
				...data,
				status: "new",
				context: {
					url: window.location.href,
					appVersion: versionStore.currentVersion || "unknown",
					language: {
						interface: settingsStore.value.interfaceLanguage,
						source: settingsStore.value.sourceLanguage,
						target: settingsStore.value.targetLanguage,
					},
					mode: settingsStore.value.mode,
					currentLevel: settingsStore.value.currentLevel,
					currentTopic: settingsStore.value.currentTopic,
				},
				user: {
					uid: auth.currentUser?.uid || null,
					isAnonymous: auth.currentUser?.isAnonymous ?? true,
				},
				timestamp: serverTimestamp(),
			};

			await setDoc(docRef, payload);
			logService.log("sync", "Word error reported with ID:", timestampId);
			return true;
		} catch (error) {
			logService.error("sync", "Error reporting word error:", error);
			throw error;
		}
	},
};
