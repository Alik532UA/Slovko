import { z } from "zod";

// ========================================
// БАЗОВІ СХЕМИ
// ========================================

/**
 * Схема для словника перекладів або транскрипцій.
 * Key: англійське слово (або ID)
 * Value: переклад або транскрипція
 */
export const DictionarySchema = z.record(z.string(), z.string());

/**
 * Схема для списку слів (масив рядків).
 */
export const WordListSchema = z.array(z.string());

// ========================================
// СХЕМИ ФАЙЛІВ ДАНИХ
// ========================================

/**
 * Схема файлу рівня (наприклад, A1.json в levels).
 * Очікуємо об'єкт з полем words, або просто масив слів (для сумісності).
 * В коді використовується { words: string[] }.
 */
export const LevelFileSchema = z
	.object({
		id: z.string().optional(),
		name: z.string().optional(),
		words: WordListSchema,
	})
	.or(
		// Fallback if file is just an array of strings
		z
			.array(z.string())
			.transform((words) => ({ words, id: undefined, name: undefined })),
	);

/**
 * Схема файлу теми.
 * В типах сказано: "on disk it is just string[]".
 */
export const TopicFileSchema = z
	.array(z.string())
	.transform((words) => ({ words }));

/**
 * Схема для локальної семантики (semantics.json)
 */
export const SemanticsSchema = z.object({
	labels: z.record(z.string(), z.string()),
});

// ========================================
// ТИПИ ZOD
// ========================================

export type Dictionary = z.infer<typeof DictionarySchema>;
export type LevelFile = z.infer<typeof LevelFileSchema>;
export type TopicFile = z.infer<typeof TopicFileSchema>;
