/**
 * Notification Store
 * Manages global toast notifications for the application.
 */

export type NotificationType = "info" | "success" | "warning" | "error";

export interface Notification {
	id: string;
	type: NotificationType;
	message: string;
	timeout?: number;
}

class NotificationStore {
	private _notifications = $state<Notification[]>([]);

	get value() {
		return this._notifications;
	}

	add(type: NotificationType, message: string, timeout = 5000) {
		const id = crypto.randomUUID();
		const notification: Notification = { id, type, message, timeout };

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

	info(msg: string, timeout?: number) { this.add("info", msg, timeout); }
	success(msg: string, timeout?: number) { this.add("success", msg, timeout); }
	warning(msg: string, timeout?: number) { this.add("warning", msg, timeout); }
	error(msg: string, timeout?: number) { this.add("error", msg, timeout); }
}

export const notificationStore = new NotificationStore();
