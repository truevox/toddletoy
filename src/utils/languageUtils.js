/**
 * Utility functions for handling language-specific logic.
 */
import {
    LANGUAGE_FLAGS,
    DEFAULT_LANGUAGE_FLAG,
    DIFFICULTY_LEVELS,
    DIFFICULTY_TEXTS,
    DEFAULT_DIFFICULTY_TEXT,
    DEFAULT_LANGUAGE_RANKS,
    DEFAULT_RANK,
    DEFAULT_LEARNING_HOURS,
    DEFAULT_HOURS
} from '../config/constants.js';

/**
 * Get flag emoji for a language code.
 * @param {string} code - The language code (e.g., 'en').
 * @returns {string} The flag emoji.
 */
export function getLanguageFlag(code) {
    return LANGUAGE_FLAGS[code] || DEFAULT_LANGUAGE_FLAG;
}

/**
 * Get difficulty level category for styling.
 * @param {number} rank - The difficulty rank of the language.
 * @returns {string} The difficulty level category.
 */
export function getDifficultyLevel(rank) {
    return DIFFICULTY_LEVELS[rank] || 'medium';
}

/**
 * Get difficulty text for display.
 * @param {string} level - The difficulty level category.
 * @returns {string} The display text for the difficulty.
 */
export function getDifficultyText(level) {
    return DIFFICULTY_TEXTS[level] || DEFAULT_DIFFICULTY_TEXT;
}

/**
 * Get default difficulty rank for a language code.
 * @param {string} code - The language code.
 * @returns {number} The difficulty rank.
 */
export function getDefaultRank(code) {
    return DEFAULT_LANGUAGE_RANKS[code] || DEFAULT_RANK;
}

/**
 * Get default learning hours for a language code.
 * @param {string} code - The language code.
 * @returns {string} The estimated learning hours.
 */
export function getDefaultHours(code) {
    return DEFAULT_LEARNING_HOURS[code] || DEFAULT_HOURS;
}
