/**
 * Shared speech helper for the canvas toys (globe, orrery).
 * Never throws: speechSynthesis / SpeechSynthesisUtterance may be missing or
 * may throw (privacy modes, headless browsers, locked-down WebViews).
 * Honours the configured speech settings (mute, volume 0-100, rate).
 */

/** Resolve utterance settings from a configManager (or defaults). */
export function resolveSpeechSettings(configManager) {
  let cfg = {};
  try { cfg = configManager?.getSpeechConfig?.() ?? {}; } catch (_) { cfg = {}; }
  const rate = typeof cfg.rate === 'number' && isFinite(cfg.rate)
    ? Math.min(2, Math.max(0.25, cfg.rate)) : 1;
  const volume = typeof cfg.volume === 'number' && isFinite(cfg.volume)
    ? Math.min(1, Math.max(0, cfg.volume / 100)) : 0.7;
  return { mute: !!cfg.mute, rate, volume };
}

/** Speak text. Returns true if an utterance was queued. */
export function speakText(configManager, text, pitch = 1.1, lang, queue = false) {
  try {
    const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    if (!synth || typeof SpeechSynthesisUtterance === 'undefined') return false;
    const { mute, rate, volume } = resolveSpeechSettings(configManager);
    if (mute || volume <= 0) return false;
    if (!queue) synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = rate;
    u.volume = volume;
    u.pitch = pitch;
    if (lang) u.lang = lang;
    synth.speak(u);
    return true;
  } catch (_) {
    return false;
  }
}

/** Stop any speech in progress (safe to call anywhere). */
export function cancelSpeech() {
  try { window.speechSynthesis?.cancel?.(); } catch (_) { /* ignore */ }
}
