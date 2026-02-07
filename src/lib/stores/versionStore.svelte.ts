/**
 * Version Store - відстеження версії додатка
 */
export const versionStore = (() => {
	let currentVersion = $state<string | null>(null);
	let hasUpdate = $state(false);
	let refusedVersion = $state<string | null>(null);
	let refusedAt = $state<number>(0);

	return {
		get currentVersion() {
			return currentVersion;
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
		setUpdate(u: boolean) {
			hasUpdate = u;
		},
		setRefusal(version: string, timestamp: number) {
			refusedVersion = version;
			refusedAt = timestamp;
		}
	};
})();
