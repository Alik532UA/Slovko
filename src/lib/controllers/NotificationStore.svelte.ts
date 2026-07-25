/**
 * Notification Store
 * Manages global toast notifications for the application.
 * WCAG 2.2.1 Timing Adjustable: pauses timer on hover AND focus with reference counting.
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
	anchor?: HTMLElement;
}

interface TimerInfo {
	id: string;
	timerId: ReturnType<typeof setTimeout> | null;
	startTime: number;
	elapsed: number;
	duration: number;
	holds: number;
}

const MAX_NOTIFICATIONS = 4;

class NotificationStore {
	private _notifications = $state<Notification[]>([]);
	private timers = new Map<string, TimerInfo>();

	get value() {
		return this._notifications;
	}

	private _arm(info: TimerInfo) {
		const remaining = Math.max(0, info.duration - info.elapsed);
		info.startTime = Date.now();
		info.timerId = setTimeout(() => this.remove(info.id), remaining);
	}

	pauseTimer(id: string) {
		const info = this.timers.get(id);
		if (!info) return;
		info.holds += 1;
		if (info.holds > 1 || info.timerId === null) return;
		clearTimeout(info.timerId);
		info.elapsed = Math.min(info.elapsed + (Date.now() - info.startTime), info.duration);
		info.timerId = null;
	}

	resumeTimer(id: string) {
		const info = this.timers.get(id);
		if (!info) return;
		if (info.holds > 0) info.holds -= 1;
		if (info.holds > 0 || info.timerId !== null) return;
		this._arm(info);
	}

	add(type: NotificationType, message: string, timeout = 5000, action?: NotificationAction, hideLogs?: boolean, anchor?: HTMLElement) {
		const id = crypto.randomUUID();
		const notification: Notification = { id, type, message, timeout, action, hideLogs, anchor };

		this._notifications = [...this._notifications, notification];
		if (this._notifications.length > MAX_NOTIFICATIONS) {
			this.remove(this._notifications[0].id);
		}

		if (timeout > 0) {
			const info: TimerInfo = { id, timerId: null, startTime: 0, elapsed: 0, duration: timeout, holds: 0 };
			this.timers.set(id, info);
			this._arm(info);
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

	info(msg: string, timeout?: number, action?: NotificationAction, anchor?: HTMLElement) { this.add("info", msg, timeout, action, false, anchor); }
	success(msg: string, timeout?: number, action?: NotificationAction, anchor?: HTMLElement) { this.add("success", msg, timeout, action, false, anchor); }
	warning(msg: string, timeout?: number, action?: NotificationAction, anchor?: HTMLElement) { this.add("warning", msg, timeout, action, false, anchor); }
	error(msg: string, timeout?: number, action?: NotificationAction, hideLogs?: boolean, anchor?: HTMLElement) { this.add("error", msg, timeout, action, hideLogs, anchor); }
}

export const notificationStore = new NotificationStore();
