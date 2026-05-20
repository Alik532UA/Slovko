/**
 * VersionStore - відстеження версії додатка
 */
class VersionStore {
	// Встановлюємо версію відразу з build-time константи
	private _currentVersion = $state<string>(typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : "0.0.0");
	private _serverVersion = $state<string | null>(null);
	private _hasUpdate = $state(false);
	private _refusedVersion = $state<string | null>(null);
	private _refusedAt = $state<number>(0);

	get currentVersion() { return this._currentVersion; }
	get serverVersion() { return this._serverVersion || this._currentVersion; }
	get hasUpdate() { return this._hasUpdate; }
	get refusedVersion() { return this._refusedVersion; }
	get refusedAt() { return this._refusedAt; }

	setVersion(v: string) { this._currentVersion = v; }
	setServerVersion(v: string) { this._serverVersion = v; }
	setUpdate(u: boolean) { this._hasUpdate = u; }
	setRefusal(version: string, timestamp: number) {
		this._refusedVersion = version;
		this._refusedAt = timestamp;
	}
}

export const versionStore = new VersionStore();
