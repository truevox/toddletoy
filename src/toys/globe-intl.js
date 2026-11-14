/**
 * Localised country names + spoken phrases for the globe toy.
 * Uses Intl.DisplayNames (feature-detected) with graceful English fallback.
 */

/** Toy language code -> BCP-47 speech/Intl tag. tlh/jbo have no voices: omitted (English only). */
export const SPEECH_LANG = {
  en: 'en-US', es: 'es-ES', zh: 'zh-CN', hi: 'hi-IN', ar: 'ar-SA', fr: 'fr-FR',
  bn: 'bn-BD', pt: 'pt-PT', ru: 'ru-RU', id: 'id-ID', eo: 'eo',
};

/** "Where is X?" (all simple, unambiguous phrasings). English uses "Can you find X?". */
const FIND_PHRASE = {
  en: n => `Can you find ${n}?`,
  es: n => `¿Dónde está ${n}?`,
  fr: n => `Où est ${n} ?`,
  pt: n => `Onde fica ${n}?`,
  zh: n => `${n}在哪里？`,
  ru: n => `Где находится ${n}?`,
  id: n => `Di mana ${n}?`,
  hi: n => `${n} कहाँ है?`,
  ar: n => `أين ${n}؟`,
  bn: n => `${n} কোথায়?`,
  eo: n => `Kie estas ${n}?`,
};

/** Codes of enabled languages that can be spoken, in config order (always >= 1, English default). */
export function enabledLanguages(configManager) {
  let list = [];
  try {
    const arr = configManager?.getConfig?.()?.languages?.enabled;
    if (Array.isArray(arr)) list = arr.map(l => (typeof l === 'string' ? l : l?.code)).filter(Boolean);
  } catch (_) { list = []; }
  const seen = new Set();
  const out = [];
  for (const c of list) { if (!seen.has(c)) { seen.add(c); out.push(c); } }
  return out.length ? out : ['en'];
}

/** Spoken-language subset: drops languages with no TTS voice (tlh, jbo); falls back to English. */
export function speakableLanguages(configManager) {
  const l = enabledLanguages(configManager).filter(c => SPEECH_LANG[c]);
  return l.length ? l : ['en'];
}

const displayCache = new Map();

/** Intl.DisplayNames for a toy language, or null when unsupported. `Ctor` is injectable for tests. */
export function getDisplayNames(code, Ctor = (typeof Intl !== 'undefined' ? Intl.DisplayNames : undefined)) {
  const tag = SPEECH_LANG[code];
  if (!tag || !Ctor) return null;
  const key = code + ':' + (Ctor === Intl?.DisplayNames ? 'native' : 'custom');
  if (Ctor === Intl?.DisplayNames && displayCache.has(key)) return displayCache.get(key);
  let dn = null;
  try {
    const supported = typeof Ctor.supportedLocalesOf === 'function' ? Ctor.supportedLocalesOf([tag]) : [tag];
    if (supported.length) dn = new Ctor([tag], { type: 'region', fallback: 'none' });
  } catch (_) { dn = null; }
  if (Ctor === Intl?.DisplayNames) displayCache.set(key, dn);
  return dn;
}

/**
 * { name, localised } of `country` in language `code`. English (or any failure / no ISO
 * code / unsupported language) falls back to the friendly English name, localised=false
 * (true only for English itself and for real Intl results).
 */
export function nameInfo(country, code, Ctor) {
  const fallback = { name: country.name, localised: code === 'en' };
  if (code === 'en' || !country.alpha2) return fallback;
  try {
    const dn = getDisplayNames(code, Ctor);
    const n = dn && dn.of(country.alpha2);
    return typeof n === 'string' && n && n !== country.alpha2 ? { name: n, localised: true } : fallback;
  } catch (_) { return fallback; }
}

export function countryNameIn(country, code, Ctor) { return nameInfo(country, code, Ctor).name; }

/**
 * [{code, lang, name}] for each speakable language that really has a localised
 * name, in order. Never empty: falls back to the English name.
 */
export function localisedNames(country, codes, Ctor) {
  const out = [];
  for (const code of codes) {
    const info = nameInfo(country, code, Ctor);
    if (info.localised) out.push({ code, lang: SPEECH_LANG[code] || 'en-US', name: info.name });
  }
  return out.length ? out : [{ code: 'en', lang: 'en-US', name: country.name }];
}

/** The "find it" prompt in `code`, falling back to English phrasing. */
export function findPrompt(country, code, Ctor) {
  const f = FIND_PHRASE[code] || FIND_PHRASE.en;
  const useCode = FIND_PHRASE[code] ? code : 'en';
  return { text: f(countryNameIn(country, useCode, Ctor)), lang: SPEECH_LANG[useCode] };
}
