/**
 * Початковий набір слів для вивчення
 * У майбутньому: замінити на API/localStorage
 */
import type { WordPair } from "../types";

export const wordPairs: WordPair[] = [
	{ id: "1", target: "коли", source: "when" },
	{ id: "2", target: "класти", source: "put" },
	{ id: "3", target: "могли б", source: "could" },
	{ id: "4", target: "помідор", source: "tomato" },
	{ id: "5", target: "старий", source: "old" },
	{ id: "6", target: "новий", source: "new" },
	{ id: "7", target: "книга", source: "book" },
	{ id: "8", target: "вода", source: "water" },
	{ id: "9", target: "хліб", source: "bread" },
	{ id: "10", target: "молоко", source: "milk" },
	{ id: "11", target: "яблуко", source: "apple" },
	{ id: "12", target: "дім", source: "house" },
	{ id: "13", target: "кіт", source: "cat" },
	{ id: "14", target: "собака", source: "dog" },
	{ id: "15", target: "дерево", source: "tree" },
	{ id: "16", target: "сонце", source: "sun" },
	{ id: "17", target: "місяць", source: "moon" },
	{ id: "18", target: "зірка", source: "star" },
	{ id: "19", target: "небо", source: "sky" },
	{ id: "20", target: "земля", source: "earth" },
	{ id: "21", target: "вогонь", source: "fire" },
	{ id: "22", target: "час", source: "time" },
	{ id: "23", target: "день", source: "day" },
	{ id: "24", target: "ніч", source: "night" },
	{ id: "25", target: "ранок", source: "morning" },
	{ id: "26", target: "вечір", source: "evening" },
	{ id: "27", target: "друг", source: "friend" },
	{ id: "28", target: "любов", source: "love" },
	{ id: "29", target: "життя", source: "life" },
	{ id: "30", target: "робота", source: "work" },
	{ id: "31", target: "школа", source: "school" },
	{ id: "32", target: "місто", source: "city" },
	{ id: "33", target: "країна", source: "country" },
	{ id: "34", target: "їжа", source: "food" },
	{ id: "35", target: "гроші", source: "money" },
	{ id: "36", target: "серце", source: "heart" },
	{ id: "37", target: "голова", source: "head" },
	{ id: "38", target: "рука", source: "hand" },
	{ id: "39", target: "нога", source: "leg" },
	{ id: "40", target: "око", source: "eye" },
];

/**
 * Отримати випадкові пари слів
 * @param count - кількість пар
 * @param excludeIds - ID пар, які вже використовуються
 */
export function getRandomPairs(
	count: number,
	excludeIds: Set<string> = new Set(),
): WordPair[] {
	const available = wordPairs.filter((p) => !excludeIds.has(p.id));
	const shuffled = [...available].sort(() => Math.random() - 0.5);
	return shuffled.slice(0, count);
}