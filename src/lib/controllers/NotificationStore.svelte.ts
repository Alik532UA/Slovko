/**
 * Notification Store
 * Manages global toast notifications for the application.
 */

export type NotificationType = "info" | "success" | "warning" | "error";

export interface NotificationAction {
	label: string;
	onClick: () => void;
}

export interface Notification {
	id: string;
	type: NotificationType;
	message: string;
	timeout?: number;
	action?: NotificationAction;
	hideLogs?: boolean;
}

interface TimerInfo {
	timerId: ReturnType<typeof setTimeout> | null;
	startTime: number;
	elapsed: number;
	duration: number;
}

class NotificationStore {
	private _notifications = $state<Notification[]>([]);
	private timers = new Map<string, TimerInfo>();

	get value() {
		return this._notifications;
	}

	private _startTimer(id: string, duration: number, elapsed: number) {
		const remaining = duration - elapsed;
		const timerId = setTimeout(() => this.remove(id), remaining);
		this.timers.set(id, { timerId, startTime: Date.now(), elapsed, duration });
	}

	pauseTimer(id: string) {
		const info = this.timers.get(id);
		if (!info || info.timerId === null) return;
		clearTimeout(info.timerId);
		const newElapsed = Math.min(info.elapsed + (Date.now() - info.startTime), info.duration);
		this.timers.set(id, { ...info, timerId: null, elapsed: newElapsed });
	}

	resumeTimer(id: string) {
		const info = this.timers.get(id);
		if (!info || info.timerId !== null) return;
		this._startTimer(id, info.duration, info.elapsed);
	}

	add(type: NotificationType, message: string, timeout = 5000, action?: NotificationAction, hideLogs?: boolean) {
		const id = crypto.randomUUID();
		const notification: Notification = { id, type, message, timeout, action, hideLogs };

		this._notifications = [...this._notifications, notification];

		if (timeout > 0) {
			this._startTimer(id, timeout, 0);
		}
	}

	remove(id: string) {
		const info = this.timers.get(id);
		if (info?.timerId) clearTimeout(info.timerId);
		this.timers.delete(id);
		
		this._notifications = this._notifications.filter((n) => n.id !== id);
	}

	clear() {
		for (const info of this.timers.values()) {
			if (info.timerId) clearTimeout(info.timerId);
		}
		this.timers.clear();
		this._notifications = [];
	}

	info(msg: string, timeout?: number, action?: NotificationAction) { this.add("info", msg, timeout, action); }
	success(msg: string, timeout?: number, action?: NotificationAction) { this.add("success", msg, timeout, action); }
	warning(msg: string, timeout?: number, action?: NotificationAction) { this.add("warning", msg, timeout, action); }
	error(msg: string, timeout?: number, action?: NotificationAction, hideLogs?: boolean) { this.add("error", msg, timeout, action, hideLogs); }
}

export const notificationStore = new NotificationStore();
