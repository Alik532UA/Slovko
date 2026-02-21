/**
 * Utility functions for pluralization
 */

/**
 * Get the correct plural form for Slavic languages (like Ukrainian)
 * and generic fallback for English/others.
 * 
 * @param count The number to use for pluralization
 * @param singular Form for 1 (e.g., "день", "day")
 * @param plural Form for 2-4 (e.g., "дні", "days")
 * @param genitive Form for 5+ or 0 (e.g., "днів", "days")
 */
export function getPluralForm(count: number, singular: string, plural: string, genitive: string): string {
    const absCount = Math.abs(count);
    const mod10 = absCount % 10;
    const mod100 = absCount % 100;

    // Note: For non-Slavic languages, genitive is often just the same as plural.

    if (mod10 === 1 && mod100 !== 11) {
        return singular;
    } else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
        return plural; // For Ukrainian, this is the nominative plural (дні)
    } else {
        return genitive; // For Ukrainian, this is the genitive plural (днів)
    }
}
