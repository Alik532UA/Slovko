/**
 * Обгортає функцію у throttle (виконує не частіше ніж раз на `ms` мілісекунд)
 * Рекомендовано для подій scroll / resize
 */
export function throttle<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
	let lastCall = 0;
	return function (this: unknown, ...args: Parameters<T>) {
		const now = Date.now();
		if (now - lastCall >= ms) {
			lastCall = now;
			fn.apply(this, args);
		}
	} as unknown as T;
}
