import type { WordProgress } from "$lib/data/schemas";

/**
 * Прогрес по словах — ШАРДАМИ, а не однією мапою в документі користувача.
 *
 * **Що це лікує.** Доти `users/{uid}.progress.words` була мапою «слово →
 * лічильники», по чотири поля на слово, і росла з кожним вивченим словом без
 * жодної межі в коді. Меж у Firestore дві, і жодної з них не видно ні в типах,
 * ні в тестах на малих даних:
 *
 *  1. **1 МіБ на документ.** Кілька тисяч слів — і документ підходить до стелі.
 *     Помилки немає доти, доки не стало запізно, і першим ламається
 *     найактивніший користувач — тобто той, кого найменше хочеться втратити.
 *  2. **Ціна запису.** Кожна синхронізація перезаписує мапу ЦІЛКОМ: платимо за
 *     весь обсяг за одне змінене слово, і в обидва боки.
 *
 * **Чому шарди, а не документ на слово.** Слова читаються завжди разом — увесь
 * прогрес потрібен, щоб порахувати статистику й підібрати наступне слово.
 * Документ на слово перетворив би одне читання на тисячі. Шістнадцять шардів —
 * компроміс: шістнадцять читань замість одного, зате запис торкається одного
 * шарда, а стеля документа відсувається в шістнадцять разів
 * (CLOUD-DATABASE-v8 § 6.2, § 6.3).
 *
 * **Розподіл детермінований.** Те саме слово завжди лягає в той самий шард —
 * інакше злиття місцевого з хмарним давало б дублікати.
 */

/** Скільки шардів. Змінювати НЕ можна без міграції: розподіл залежить від числа. */
export const SHARD_COUNT = 16;

/** Версія схеми прогресу. 3 — прогрес живе в підколекції `words`. */
export const WORDS_SCHEMA_VERSION = 3;

/**
 * Прогрес по словах так, як його бачить застосунок.
 *
 * Тип береться зі схеми (`data/schemas.ts`), а не описується тут удруге: два
 * описи того самого розходяться, і питання лише коли.
 */
export type WordMap = Record<string, WordProgress>;

/**
 * Номер шарда для слова: сума кодів символів за модулем.
 *
 * Не `hashCode` і не криптографія — тут потрібен лише рівний і стабільний
 * розподіл. Головна вимога: та сама відповідь на кожному пристрої й у кожній
 * версії, інакше слово роздвоїться між шардами.
 */
export function shardIndexFor(wordKey: string): number {
	let sum = 0;
	for (let i = 0; i < wordKey.length; i++) sum = (sum + wordKey.charCodeAt(i)) % 1_000_003;
	return sum % SHARD_COUNT;
}

/** Ідентифікатор документа шарда: `shard-00` … `shard-15`. */
export const shardId = (index: number): string => `shard-${String(index).padStart(2, "0")}`;

/** Усі ідентифікатори шардів — потрібні, щоб прочитати прогрес цілком. */
export const allShardIds = (): string[] =>
	Array.from({ length: SHARD_COUNT }, (_, index) => shardId(index));

/**
 * Розкласти мапу слів по шардах.
 *
 * Повертає ВСІ шарди, включно з порожніми: інакше слово, видалене з мапи, лишалося
 * б назавжди в старому документі шарда.
 */
export function splitIntoShards(words: WordMap): Record<string, WordMap> {
	const shards: Record<string, WordMap> = {};
	for (const index of Array.from({ length: SHARD_COUNT }, (_, i) => i)) {
		shards[shardId(index)] = {};
	}
	for (const [key, value] of Object.entries(words)) {
		shards[shardId(shardIndexFor(key))][key] = value;
	}
	return shards;
}

/** Зібрати мапу слів із документів шардів. */
export function mergeShards(documents: Array<WordMap | null | undefined>): WordMap {
	const words: WordMap = {};
	for (const document of documents) {
		if (!document) continue;
		for (const [key, value] of Object.entries(document)) {
			// Захист від зіпсованого документа: у шарді мають лежати лічильники,
			// а не що завгодно. Один битий запис не має ламати весь прогрес.
			if (value && typeof value === "object" && "correctCount" in value) words[key] = value;
		}
	}
	return words;
}

/**
 * Які шарди справді змінилися.
 *
 * Це і є та економія, заради якої все робиться: запис торкається одного-двох
 * документів замість усього прогресу.
 */
export function changedShardIds(next: WordMap, previous: WordMap): string[] {
	const nextShards = splitIntoShards(next);
	const previousShards = splitIntoShards(previous);
	return allShardIds().filter(
		(id) => JSON.stringify(nextShards[id]) !== JSON.stringify(previousShards[id])
	);
}
