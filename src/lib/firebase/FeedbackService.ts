import {
	serverTimestamp,
	collection,
	addDoc,
	doc,
	setDoc,
} from "firebase/firestore";
import { db, auth } from "./config";
import { AuthService } from "./AuthService";
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

/**
 * Забезпечує наявність авторизації та повертає дані користувача
 */
async function ensureAuth() {
	let user = auth.currentUser;
	if (!user) {
		try {
			await AuthService.loginAnonymously();
			await new Promise((resolve) => setTimeout(resolve, 600));
			user = auth.currentUser;
		} catch (e) {
			console.warn("[FeedbackService] Could not establish anonymous session");
		}
	}
	return user;
}

export const FeedbackService = {
	async submitFeedback(data: FeedbackData) {
		try {
			const user = await ensureAuth();
			const isAnonymous = !user || user.isAnonymous;
			const prefix = import.meta.env.DEV ? "dev_" : "";
			const rootCollection = `${prefix}${isAnonymous ? "feedback_anonymous" : "feedback"}`;

			// Використовуємо addDoc для автоматичної генерації ID та чистоти коду
			const messagesRef = collection(
				db,
				rootCollection,
				data.category,
				"messages",
			);

			const payload = {
				title: data.title || null,
				message: data.message,
				status: "new",
				isGuestReport: isAnonymous,
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
					uid: user?.uid || "guest",
					isAnonymous: isAnonymous,
					email: user?.email || null,
				},
				timestamp: serverTimestamp(),
			};

			const timestampId = new Date()
				.toISOString()
				.replace("T", "-")
				.slice(0, 19)
				.replace(/:/g, "-");
			const docRef = doc(messagesRef, timestampId);
			await setDoc(docRef, payload);

			logService.log(
				"sync",
				`Feedback saved to ${rootCollection} with ID:`,
				timestampId,
			);
			return true;
		} catch (error: any) {
			logService.error("sync", "Error submitting feedback:", error);
			if (error.code === "permission-denied") throw new Error("AUTH_REQUIRED");
			throw error;
		}
	},

	async reportWordError(data: WordReportData) {
		try {
			const user = await ensureAuth();
			const isAnonymous = !user || user.isAnonymous;
			const prefix = import.meta.env.DEV ? "dev_" : "";
			const rootCollection = `${prefix}${isAnonymous ? "feedback_anonymous" : "feedback"}`;

			const messagesRef = collection(
				db,
				rootCollection,
				"word_error",
				"messages",
			);

			const payload = {
				...data,
				status: "new",
				isGuestReport: isAnonymous,
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
					uid: user?.uid || "guest",
					isAnonymous: isAnonymous,
					email: user?.email || null,
				},
				timestamp: serverTimestamp(),
			};

			const timestampId = new Date()
				.toISOString()
				.replace("T", "-")
				.slice(0, 19)
				.replace(/:/g, "-");
			const docRef = doc(messagesRef, timestampId);
			await setDoc(docRef, payload);

			logService.log(
				"sync",
				`Word error saved to ${rootCollection} with ID:`,
				timestampId,
			);
			return true;
		} catch (error: any) {
			logService.error("sync", "Error reporting word error:", error);
			if (error.code === "permission-denied") throw new Error("AUTH_REQUIRED");
			throw error;
		}
	},
};
