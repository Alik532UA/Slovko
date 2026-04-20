/**
 * Global application configuration
 */
export const SUPPORTED_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

export type Level = (typeof SUPPORTED_LEVELS)[number];
