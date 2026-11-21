export function focusTrap(node: HTMLElement) {
	const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

	function handleKeydown(e: KeyboardEvent) {
		if (e.key !== 'Tab') return;

		const focusable = Array.from(node.querySelectorAll<HTMLElement>(selector)).filter(
			(el) => !el.hasAttribute('disabled') && el.offsetParent !== null
		);

		if (focusable.length === 0) {
			e.preventDefault();
			return;
		}

		const first = focusable[0];
		const last = focusable[focusable.length - 1];

		if (e.shiftKey) {
			if (document.activeElement === first) {
				last.focus();
				e.preventDefault();
			}
		} else {
			if (document.activeElement === last) {
				first.focus();
				e.preventDefault();
			}
		}
	}

	const initial = node.querySelector<HTMLElement>(selector);
	if (initial) {
		requestAnimationFrame(() => initial.focus());
	}

	node.addEventListener('keydown', handleKeydown);

	return {
		destroy() {
			node.removeEventListener('keydown', handleKeydown);
		}
	};
}
