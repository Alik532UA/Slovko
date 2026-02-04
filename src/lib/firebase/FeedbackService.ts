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

export const FeedbackService = {
	async submitFeedback(data: FeedbackData) {
		try {
			// Генеруємо читабельний ID на основі поточної дати
			const now = new Date();
			const timestampId = now
				.toISOString()
				.replace("T", "-")
				.slice(0, 19)
				.replace(/:/g, "-");

			// Шлях: feedback -> {category} -> messages -> {YYYY-MM-DD-HH-mm-ss}
			const docRef = doc(
				db,
				"feedback",
				data.category,
				"messages",
				timestampId,
			);

			const payload = {
				title: data.title || null,
				message: data.message,
				status: "new",
				context: {
					url: window.location.href,
					appVersion: versionStore.currentVersion || "unknown",
					userAgent: navigator.userAgent,
					language: {
						interface: settingsStore.value.interfaceLanguage,
						source: settingsStore.value.sourceLanguage,
						target: settingsStore.value.targetLanguage,
					},
					currentLevel: settingsStore.value.currentLevel,
					currentTopic: settingsStore.value.currentTopic,
				},
				user: {
					uid: auth.currentUser?.uid || null,
					isAnonymous: auth.currentUser?.isAnonymous ?? true,
					email: auth.currentUser?.email || null,
				},
				timestamp: serverTimestamp(),
			};

			await setDoc(docRef, payload);
			logService.log(
				"sync",
				`Feedback (${data.category}) submitted with ID:`,
				timestampId,
			);
			return true;
		} catch (error) {
			logService.error("sync", "Error submitting feedback:", error);
			throw error;
		}
	},
};
