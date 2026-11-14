/**
 * Tiny synthesized sound effects for the globe toy (WebAudio). Never throws,
 * honours audio mute/volume, creates the AudioContext lazily on a user gesture,
 * and closes it on dispose.
 */
export class GlobeAudio {
  constructor(configManager) {
    this.configManager = configManager;
    this.ctx = null;
    this.disposed = false;
  }

  _settings() {
    let cfg = {};
    try { cfg = this.configManager?.getAudioConfig?.() ?? {}; } catch (_) { cfg = {}; }
    const vol = typeof cfg.volume === 'number' && isFinite(cfg.volume) ? Math.min(1, Math.max(0, cfg.volume / 100)) : 0.7;
    return { mute: !!cfg.mute, vol };
  }

  _ensure() {
    if (this.disposed) return null;
    try {
      if (!this.ctx) {
        const AC = typeof window !== 'undefined' ? (window.AudioContext || window.webkitAudioContext) : null;
        if (!AC) return null;
        this.ctx = new AC();
      }
      if (this.ctx.state === 'suspended' && this.ctx.resume) this.ctx.resume().catch(() => {});
      return this.ctx;
    } catch (_) { return null; }
  }

  /** One blip: frequency sweep + decay envelope. */
  _blip(freq, endFreq, start, dur, peak, type = 'sine') {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const t0 = ctx.currentTime + start;
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (endFreq !== freq) osc.frequency.exponentialRampToValueAtTime(endFreq, t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.onended = () => { try { osc.disconnect(); gain.disconnect(); } catch (_) { /* gone */ } };
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  }

  _play(notes) {
    try {
      const { mute, vol } = this._settings();
      if (mute || vol <= 0) return false;
      if (!this._ensure()) return false;
      for (const n of notes) this._blip(n[0], n[1], n[2], n[3], n[4] * vol * 0.5, n[5]);
      return true;
    } catch (_) { return false; }
  }

  /** Soft pop for selecting a country. */
  pop() { return this._play([[520, 880, 0, 0.12, 0.6]]); }
  /** Slightly sweeter pop for a brand-new country. */
  popNew() { return this._play([[520, 880, 0, 0.12, 0.6], [880, 1320, 0.1, 0.18, 0.5]]); }
  /** Cheerful ascending arpeggio (C major) for finding the answer. */
  cheer() {
    return this._play([[523, 523, 0, 0.18, 0.55, 'triangle'], [659, 659, 0.12, 0.18, 0.55, 'triangle'],
      [784, 784, 0.24, 0.18, 0.55, 'triangle'], [1047, 1047, 0.36, 0.36, 0.6, 'triangle']]);
  }
  /** Gentle whoosh-y blip for Surprise me. */
  whoosh() { return this._play([[300, 900, 0, 0.35, 0.35, 'sine']]); }

  /** Release the AudioContext (it is recreated lazily on the next sound). */
  close() {
    try { const p = this.ctx?.close?.(); if (p && p.catch) p.catch(() => {}); } catch (_) { /* ignore */ }
    this.ctx = null;
  }

  dispose() { this.disposed = true; this.close(); }
}
