/**
 * Перевіряє, чи є число "магічним" (складається з однакових цифр)
 * Наприклад: 11, 22, 33, ..., 111, 222, ..., 999999
 */
export function isMagicGap(gap: number): boolean {
	if (gap < 11 || gap > 999999) return false;

	const s = gap.toString();
	if (s.length < 2) return false;

	// Перевіряємо, чи всі символи в рядку однакові
	for (let i = 1; i < s.length; i++) {
		if (s[i] !== s[0]) return false;
	}

	return true;
}
