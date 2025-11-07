/**
 * Application-wide constants for configuration and UI.
 */

// Language and Localization
export const LANGUAGE_FLAGS = {
  'en': '🇺🇸', 'es': '🇪🇸', 'zh': '🇨🇳', 'hi': '🇮🇳', 'ar': '🇸🇦',
  'fr': '🇫🇷', 'bn': '🇧🇩', 'pt': '🇵🇹', 'ru': '🇷🇺', 'id': '🇮🇩',
  'tlh': '⚔️', 'jbo': '🤖', 'eo': '⭐'
};

export const DEFAULT_LANGUAGE_FLAG = '🌍';

export const DIFFICULTY_LEVELS = {
  1: 'trivial',
  2: 'easy',
  3: 'easy',
  4: 'medium',
  5: 'medium',
  6: 'medium',
  7: 'hard',
  8: 'hard',
  9: 'very-hard',
  10: 'very-hard',
  11: 'extreme',
  12: 'nightmare',
  13: 'nightmare'
};

export const DIFFICULTY_TEXTS = {
  'trivial': 'Trivial',
  'easy': 'Easy',
  'medium': 'Medium',
  'hard': 'Hard',
  'very-hard': 'Very Hard',
  'extreme': 'Extreme',
  'nightmare': 'Expert Only'
};

export const DEFAULT_DIFFICULTY_TEXT = 'Medium';

export const DEFAULT_LANGUAGE_RANKS = {
  'eo': 1, 'id': 2, 'es': 3, 'pt': 4, 'fr': 5, 'en': 6,
  'jbo': 7, 'ru': 8, 'bn': 9, 'hi': 10, 'tlh': 11, 'ar': 12, 'zh': 13
};

export const DEFAULT_RANK = 6; // Corresponds to English

export const DEFAULT_LEARNING_HOURS = {
  'eo': '150-200h', 'id': '900h', 'es': '600-750h', 'pt': '600-750h',
  'fr': '600-750h', 'en': '700-900h', 'jbo': '1000h±', 'ru': '1100h',
  'bn': '1100h', 'hi': '1100h', 'tlh': '1400h±', 'ar': '2200h', 'zh': '2200h+'
};

export const DEFAULT_HOURS = '700-900h'; // Corresponds to English

// Platform Identifiers
export const PLATFORMS = {
  IOS: 'ios',
  ANDROID: 'android',
  MAC: 'mac',
  WINDOWS: 'windows',
  DESKTOP: 'desktop'
};
