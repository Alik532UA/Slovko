export class SpeechModalStore {
	isOpen = $state(false);
	lang = $state("");

	open(language: string) {
		this.lang = language;
		this.isOpen = true;
	}

	close() {
		this.isOpen = false;
	}
}

export const speechModalStore = new SpeechModalStore();
