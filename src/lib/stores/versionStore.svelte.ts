/**
 * Version Store - відстеження версії додатка
 */
export const versionStore = (() => {
	// Встановлюємо версію відразу з build-time константи, щоб уникнути null при старті
	let currentVersion = $state<string>(typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : "0.0.0");
	let serverVersion = $state<string | null>(null);
	let hasUpdate = $state(false);
	let refusedVersion = $state<string | null>(null);
	let refusedAt = $state<number>(0);

	return {
		get currentVersion() {
			return currentVersion;
		},
		get serverVersion() {
			return serverVersion || currentVersion;
		},
		get hasUpdate() {
			return hasUpdate;
		},
		get refusedVersion() {
			return refusedVersion;
		},
		get refusedAt() {
			return refusedAt;
		},
		setVersion(v: string) {
			currentVersion = v;
		},
		setServerVersion(v: string) {
			serverVersion = v;
		},
		setUpdate(u: boolean) {
			hasUpdate = u;
		},
		setRefusal(version: string, timestamp: number) {
			refusedVersion = version;
			refusedAt = timestamp;
		}
	};
})();
