export interface SemanticGroup {
	base: string;
	specific: string[];
}

/**
 * Центральний реєстр семантичних зв'язків (Schema).
 * Визначає, які специфічні ключі відносяться до яких базових понять.
 */
export const semanticHierarchy: Record<string, SemanticGroup> = {
	brother: {
		base: "brother",
		specific: ["brother_older", "brother_younger"],
	},
	sister: {
		base: "sister",
		specific: ["sister_older", "sister_younger"],
	},
	orange: {
		base: "orange",
		specific: ["orange_color", "orange_fruit"],
	},
	aunt: {
		base: "aunt",
		specific: ["aunt_paternal", "aunt_maternal"],
	},
	uncle: {
		base: "uncle",
		specific: ["uncle_paternal", "uncle_maternal"],
	},
	leg: {
		base: "leg",
		specific: ["leg_full", "foot"],
	},
	pronoun_3rd: {
		base: "pronoun_3rd",
		specific: ["he_pronoun", "she_pronoun", "it_pronoun"],
	},
	blue_group: {
		base: "blue",
		specific: ["blue_dark", "blue_light"],
	},
	walk: {
		base: "walk",
		specific: ["walk_action", "walk_pleasure"],
	},
	go: {
		base: "go",
		specific: ["go_foot", "go_vehicle"],
	},
	you: {
		base: "you_pronoun",
		specific: ["you_informal", "you_formal", "you"],
	},
	affair: {
		base: "affair",
		specific: ["affair_matter", "affair_romance"],
	},
	back: {
		base: "back",
		specific: ["back_body", "back_direction"],
	},
	fine: {
		base: "fine",
		specific: ["fine_good", "fine_penalty"],
	},
	time: {
		base: "time",
		specific: ["time_abstract", "time_clock"],
	},
	man: {
		base: "man",
		specific: ["man", "husband"],
	},
	woman: {
		base: "woman",
		specific: ["woman", "wife"],
	},
	warm_group: {
		base: "warm",
		specific: ["hot", "warm"],
	},
	get_take_group: {
		base: "get",
		specific: ["get", "take"],
	},
	watch: {
		base: "watch",
		specific: ["watch_verb", "watch_clock"],
	},
	right: {
		base: "right",
		specific: ["right_direction", "right_correct"],
	},
	hard: {
		base: "hard",
		specific: ["hard_difficult", "hard_solid"],
	},
	too: {
		base: "too",
		specific: ["too_also", "too_excessive"],
	},
};

/**
 * Знаходить базовий ключ для специфічного ключа, якщо він існує в ієрархії.
 */
export function getBaseKey(key: string): string | null {
	for (const group of Object.values(semanticHierarchy)) {
		if (group.specific.includes(key)) {
			return group.base;
		}
	}
	return null;
}

/**
 * Отримує групу за базовим ключем.
 */
export function getSemanticGroup(baseKey: string): SemanticGroup | null {
	return semanticHierarchy[baseKey] || null;
}
