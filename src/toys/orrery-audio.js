/**
 * Sound for the orrery: xylophone-style chimes (WebAudio, lazily created,
 * never throws) and language-tagged speech (never throws, honours
 * mute/volume/rate).
 */
import { resolveSpeechSettings } from './toy-speech.js';

// C major pentatonic stepping up with distance from the Sun (Sun .. Neptune).
const SCALE = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99];
export const chimeFrequency = i => SCALE[Math.max(0, Math.min(SCALE.length - 1, i))];

export function audioLevel(configManager) {
  let a = {};
  try { a = configManager?.getAudioConfig?.() ?? {}; } catch (_) { a = {}; }
  if (a.mute) return 0;
  const v = typeof a.volume === 'number' && isFinite(a.volume) ? a.volume : 70;
  return Math.max(0, Math.min(1, v / 100));
}

/** First enabled language we have certain translations for, else 'en'. */
export function pickLanguage(configManager) {
  try {
    const code = configManager?.getConfig?.()?.languages?.enabled?.[0]?.code;
    const p = String(code || 'en').toLowerCase().split(/[-_]/)[0];
    return ['es', 'fr', 'pt'].includes(p) ? p : 'en';
  } catch (_) { return 'en'; }
}

export function speakLocal(configManager, text, { lang = 'en', pitch = 1.15 } = {}) {
  try {
    const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    if (!synth || typeof SpeechSynthesisUtterance === 'undefined') return false;
    const { mute, rate, volume } = resolveSpeechSettings(configManager);
    if (mute || volume <= 0) return false;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = rate; u.volume = volume; u.pitch = pitch;
    if (lang && lang !== 'en') u.lang = lang;
    synth.speak(u);
    return true;
  } catch (_) { return false; }
}

export class Chimes {
  constructor(configManager) {
    this.cfg = configManager;
    this.ac = null;
    this.live = new Set();
  }

  _ctx() {
    try {
      if (this.ac) return this.ac;
      const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
      if (!AC) return null;
      this.ac = new AC();
      return this.ac;
    } catch (_) { return null; }
  }

  _note(freq, delay, dur, peak) {
    try {
      const ac = this._ctx();
      if (!ac) return false;
      if (ac.state === 'suspended') ac.resume?.();
      const t0 = ac.currentTime + delay;
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g); g.connect(ac.destination);
      osc.onended = () => { this.live.delete(osc); try { osc.disconnect(); g.disconnect(); } catch (_) { /* ignore */ } };
      this.live.add(osc);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
      return true;
    } catch (_) { return false; }
  }

  chime(i) {
    const v = audioLevel(this.cfg);
    if (v <= 0) return false;
    const f = chimeFrequency(i);
    const ok = this._note(f, 0, 0.9, 0.22 * v);
    this._note(f * 2, 0, 0.35, 0.05 * v);
    return ok;
  }

  arpeggio() {
    const v = audioLevel(this.cfg);
    if (v <= 0) return false;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, k) => this._note(f, k * 0.11, 0.7, 0.2 * v));
    return true;
  }

  close() {
    this.live.forEach(o => { try { o.stop(); } catch (_) { /* ignore */ } });
    this.live.clear();
    try { this.ac?.close?.(); } catch (_) { /* ignore */ }
    this.ac = null;
  }
}
