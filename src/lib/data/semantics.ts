export interface SemanticGroup {
  base: string;
  specific: string[];
}

/**
 * Центральний реєстр семантичних зв'язків (Schema).
 * Визначає, які специфічні ключі відносяться до яких базових понять.
 */
export const semanticHierarchy: Record<string, SemanticGroup> = {
  "brother": {
    base: "brother",
    specific: ["brother_older", "brother_younger"]
  },
  "sister": {
    base: "sister",
    specific: ["sister_older", "sister_younger"]
  },
  "orange": {
    base: "orange",
    specific: ["orange_color", "orange_fruit"]
  },
  "aunt": {
    base: "aunt",
    specific: ["aunt_paternal", "aunt_maternal"]
  },
  "uncle": {
    base: "uncle",
    specific: ["uncle_paternal", "uncle_maternal"]
  },
  "leg": {
    base: "leg",
    specific: ["leg_full", "foot"]
  },
  "pronoun_3rd": {
    base: "pronoun_3rd",
    specific: ["he_pronoun", "she_pronoun", "it_pronoun"]
  },
  "you": {
    base: "you",
    specific: ["you_informal", "you_formal"]
  },
  "go": {
    base: "go",
    specific: ["go_foot", "go_vehicle"]
  },
  "walk": {
    base: "walk",
    specific: ["walk_action", "walk_pleasure"]
  }
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