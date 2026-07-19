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

class NotificationStore {
	private _notifications = $state<Notification[]>([]);

	get value() {
		return this._notifications;
	}

	add(type: NotificationType, message: string, timeout = 5000, action?: NotificationAction, hideLogs?: boolean) {
		const id = crypto.randomUUID();
		const notification: Notification = { id, type, message, timeout, action, hideLogs };

		this._notifications = [...this._notifications, notification];

		if (timeout > 0) {
			setTimeout(() => {
				this.remove(id);
			}, timeout);
		}
	}

	remove(id: string) {
		this._notifications = this._notifications.filter((n) => n.id !== id);
	}

	clear() {
		this._notifications = [];
	}

	info(msg: string, timeout?: number, action?: NotificationAction) { this.add("info", msg, timeout, action); }
	success(msg: string, timeout?: number, action?: NotificationAction) { this.add("success", msg, timeout, action); }
	warning(msg: string, timeout?: number, action?: NotificationAction) { this.add("warning", msg, timeout, action); }
	error(msg: string, timeout?: number, action?: NotificationAction, hideLogs?: boolean) { this.add("error", msg, timeout, action, hideLogs); }
}

export const notificationStore = new NotificationStore();
