/**
 * Version Store - відстеження версії додатка
 */
export const versionStore = (() => {
	let currentVersion = $state<string | null>(null);
	let hasUpdate = $state(false);

	return {
		get currentVersion() {
			return currentVersion;
		},
		get hasUpdate() {
			return hasUpdate;
		},
		setVersion(v: string) {
			currentVersion = v;
		},
		setUpdate(u: boolean) {
			hasUpdate = u;
		},
	};
})();
