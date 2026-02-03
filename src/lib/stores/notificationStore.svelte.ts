/**
 * Notification Store
 * Manages global toast notifications for the application.
 */

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
    id: string;
    type: NotificationType;
    message: string;
    timeout?: number;
}

function createNotificationStore() {
    let notifications = $state<Notification[]>([]);

    function add(type: NotificationType, message: string, timeout = 5000) {
        const id = crypto.randomUUID();
        const notification: Notification = { id, type, message, timeout };

        notifications = [...notifications, notification];

        if (timeout > 0) {
            setTimeout(() => {
                remove(id);
            }, timeout);
        }
    }

    function remove(id: string) {
        notifications = notifications.filter(n => n.id !== id);
    }

    return {
        get value() {
            return notifications;
        },
        add,
        remove,
        info: (msg: string, timeout?: number) => add('info', msg, timeout),
        success: (msg: string, timeout?: number) => add('success', msg, timeout),
        warning: (msg: string, timeout?: number) => add('warning', msg, timeout),
        error: (msg: string, timeout?: number) => add('error', msg, timeout),
    };
}

export const notificationStore = createNotificationStore();
