// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
	SHARD_COUNT,
	allShardIds,
	changedShardIds,
	mergeShards,
	shardId,
	shardIndexFor,
	splitIntoShards,
	type WordMap,
} from "./wordShards";

/**
 * Шардинг прогресу по словах.
 *
 * Перевіряється рівно те, від чого залежить збереження прогресу живих людей:
 * розподіл стабільний, нічого не губиться при розкладанні й збиранні, і запис
 * торкається лише того, що справді змінилося.
 *
 * Функції чисті, тож ні мережі, ні емулятора тут не потрібно — і саме тому ці
 * перевірки йдуть у звичайному прогоні, а не «колись вручну».
 */

const word = (correct: number, key = "k"): WordMap[string] => ({
	wordKey: key,
	correctCount: correct,
	lastSeen: 1,
});

const sample = (count: number): WordMap =>
	Object.fromEntries(
		Array.from({ length: count }, (_, i) => [`en-uk-word${i}`, word(i, `en-uk-word${i}`)]),
	);

describe("розподіл по шардах", () => {
	it("перевірка жива: шардів справді кілька", () => {
		expect(SHARD_COUNT).toBeGreaterThan(1);
		expect(allShardIds()).toHaveLength(SHARD_COUNT);
	});

	it("те саме слово завжди в тому самому шарді", () => {
		// Якби розподіл плавав, слово роздвоїлося б між шардами, і злиття
		// місцевого з хмарним дало б дублікати.
		for (const key of ["кіт", "dog", "en-uk-abc", "🙂"]) {
			expect(shardIndexFor(key)).toBe(shardIndexFor(key));
		}
	});

	it("номер шарда завжди в межах", () => {
		for (let i = 0; i < 500; i++) {
			const index = shardIndexFor(`word-${i}-${"x".repeat(i % 40)}`);
			expect(index).toBeGreaterThanOrEqual(0);
			expect(index).toBeLessThan(SHARD_COUNT);
		}
	});

	it("розподіл рівний — жоден шард не збирає все", () => {
		const counts = new Map<string, number>();
		for (const key of Object.keys(sample(1600))) {
			const id = shardId(shardIndexFor(key));
			counts.set(id, (counts.get(id) ?? 0) + 1);
		}
		// 1600 слів на 16 шардів — у середньому 100. Якщо якийсь шард узяв більше
		// за чверть усього, розподіл вироджений і стеля документа не відсунулась.
		expect(Math.max(...counts.values())).toBeLessThan(400);
		expect(counts.size, "задіяні всі шарди").toBe(SHARD_COUNT);
	});
});

describe("розкласти й зібрати", () => {
	it("нічого не губиться й не додається", () => {
		const words = sample(300);
		const shards = splitIntoShards(words);
		const restored = mergeShards(Object.values(shards));

		expect(Object.keys(restored)).toHaveLength(Object.keys(words).length);
		expect(restored).toEqual(words);
	});

	it("порожні шарди теж повертаються", () => {
		// Інакше слово, видалене з мапи, лишилося б назавжди в старому документі.
		const shards = splitIntoShards({ "en-uk-one": word(1) });
		expect(Object.keys(shards)).toHaveLength(SHARD_COUNT);
	});

	it("зіпсований запис у шарді не ламає решту прогресу", () => {
		const good = splitIntoShards(sample(20));
		const broken = { "en-uk-bad": "не обʼєкт" } as unknown as WordMap;
		const restored = mergeShards([...Object.values(good), broken]);

		expect(restored["en-uk-bad"], "битий запис відкинуто").toBeUndefined();
		expect(Object.keys(restored).length, "решта на місці").toBe(20);
	});

	it("порожній прогрес збирається в порожню мапу", () => {
		expect(mergeShards([])).toEqual({});
		expect(mergeShards([null, undefined])).toEqual({});
	});
});

describe("записуємо лише те, що змінилося", () => {
	it("одне змінене слово чіпає один шард", () => {
		// Це і є та економія, заради якої все робиться: доти кожна синхронізація
		// перезаписувала ВЕСЬ прогрес заради одного лічильника.
		const before = sample(200);
		const after = { ...before, "en-uk-word7": word(99) };

		const changed = changedShardIds(after, before);

		expect(changed).toHaveLength(1);
		expect(changed[0]).toBe(shardId(shardIndexFor("en-uk-word7")));
	});

	it("без змін не пишемо нічого", () => {
		const words = sample(50);
		expect(changedShardIds(words, { ...words })).toEqual([]);
	});

	it("видалене слово теж рахується зміною", () => {
		const before = sample(50);
		const after = { ...before };
		delete after["en-uk-word3"];

		expect(changedShardIds(after, before)).toEqual([
			shardId(shardIndexFor("en-uk-word3")),
		]);
	});

	it("нове слово в порожньому прогресі", () => {
		expect(changedShardIds({ "en-uk-new": word(1) }, {})).toHaveLength(1);
	});
});
