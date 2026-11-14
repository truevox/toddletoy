/**
 * Play layer of the globe toy: Surprise me, the Find-it game, the passport,
 * the "ghost hand" gesture hint and keyboard control. Talks to GlobeToy through
 * its small public surface (flyTo, selectCountry, particles, audio, ui...).
 */
import { safeStorage } from '../utils/safeStorage.js';
import { Passport } from './globe-passport.js';
import { FindGame, pickSurprise } from './globe-game.js';
import { speakableLanguages, localisedNames, findPrompt } from './globe-intl.js';
import { metaFor, metaKey, WELL_KNOWN } from './globe-meta.js';
import { speakText } from './toy-speech.js';

const HINT_IDLE_MS = 25000;
const PULSE_MS = 30000;
const NEXT_ROUND_MS = 2800;

export class GlobePlay {
  constructor(toy) {
    this.toy = toy;
    this.passport = new Passport(safeStorage);
    this.game = new FindGame(toy._countries);
    this.lastSurprise = -1;
    this._t = { hint: 0, tick: 0, next: 0, surprise: 0, wrong: 0, nudge: 0, apply: 0 };
    this._ghost = false;
    this._byKey = null;
  }

  callbacks(onBack) {
    const t = this.toy;
    return {
      back: onBack,
      zoom: dir => { t.zoomStep(dir); t._poke(); },
      home: () => { t.goHome(); t._poke(); },
      surprise: () => this.surprise(),
      find: () => (this.game.active ? this.stopGame() : this.startGame()),
      passport: () => this.togglePassport(),
      resetPassport: () => { this.passport.clear(); this.toy.ui.setPassportCount(0); this.openPassport(); },
      toggleMore: () => t.toggleMore(),
    };
  }

  // ── lifecycle ──────────────────────────────────────────────────────────────
  onShow() {
    const t = this.toy;
    t.ui.setPassportCount(this.passport.count);
    t.ui.setZoomState(t.zoom, 1, 5);
    t.ui.setGameActive(false);
    if (!this.passport.isLearned()) this._t.hint = t.after(1500, () => this.playHint());
  }

  onHide() { this.clearTimers(); this.game.stop(); this._ghost = false; if (this.toy.ui) this.toy.ui.setGameActive(false); }

  clearTimers() { for (const k of Object.keys(this._t)) { this.toy.cancel(this._t[k]); this._t[k] = 0; } }

  canSpin() { return !this.toy._sel && !this.game.active && !this.toy.ui.passportOpen && !this._ghost; }

  onUserInput() { this._stopGhost(); }
  onFirstTap() { this._stopGhost(); }
  onSpaceTap() { if (this.toy.ui.passportOpen) this.toy.ui.closePassport(); }

  // ── ghost-hand hint ────────────────────────────────────────────────────────
  armHint() {
    const t = this.toy;
    if (t._dragged && t._tapped && !this.passport.isLearned()) this.passport.markLearned();
    t.cancel(this._t.hint); this._t.hint = 0;
    if (!this.passport.isLearned() && !this.game.active) this._t.hint = t.after(HINT_IDLE_MS, () => this.playHint());
  }

  playHint() {
    const t = this.toy;
    if (this.game.active || t.ui.passportOpen || this.passport.isLearned() || !t.renderer) return;
    const { cx, cy, R } = t.renderer;
    const pick = t._countries.filter(c => c.alpha2 && WELL_KNOWN.has(c.alpha2) && c.capRadiusDeg >= 14)
      .sort((a, b) => t.distanceTo(a) - t.distanceTo(b))[0];
    if (pick && !t._sel) t._pulse = { country: pick, until: performance.now() + PULSE_MS };
    if (!t.reducedMotion()) {
      this._ghost = true;
      t.ui.playGhost(cx - 0.35 * R, cy + 0.2 * R, 0.7 * R);
      t.cancel(this._t.nudge);
      const nudge = () => t.flyTo(t.lon - 26, t.lat, t.zoom, { dur: 1300 });
      this._t.nudge = t.after(250, () => { nudge(); this._t.nudge = t.after(2000, () => { nudge(); this._t.nudge = t.after(1800, () => { this._ghost = false; t._lastInteract = performance.now() - 3500 + 800; t._requestFrame(); }); }); });
    }
    t._requestFrame();
  }

  _stopGhost() {
    this.toy.ui.stopGhost();
    this._ghost = false;
    this.toy.cancel(this._t.nudge); this._t.nudge = 0;
  }

  // ── passport ───────────────────────────────────────────────────────────────
  visit(country) {
    const res = this.passport.add(metaKey(country));
    if (res.isNew) this.toy.ui.setPassportCount(res.count);
    return res;
  }

  openPassport() {
    const t = this.toy;
    if (!this._byKey) this._byKey = new Map(t._countries.map(c => [metaKey(c), c]));
    const groups = {};
    for (const key of this.passport.list()) {
      const c = this._byKey.get(key);
      const m = c && metaFor(c);
      if (!m) continue;
      (groups[m.continentCode] = groups[m.continentCode] || []).push({ flag: c.flag, name: c.name });
    }
    t.ui.openPassport({ groups, count: this.passport.count, total: t._countries.length });
  }

  togglePassport() {
    if (this.toy.ui.passportOpen) { this.toy.ui.closePassport(); this.toy._poke(); return; }
    if (this.game.active) this.stopGame();
    this._stopGhost();
    this.openPassport();
  }

  // ── Surprise me ────────────────────────────────────────────────────────────
  surprise() {
    const t = this.toy;
    if (this.game.active) this.stopGame();
    t.ui.closePassport(); this._stopGhost();
    const c = pickSurprise(t._countries, this.lastSurprise);
    this.lastSurprise = c.idx;
    t.audio.whoosh();
    t._sel = null; t._pulse = null; t.ui.hideCard();
    t.cancel(this._t.surprise);
    const reduced = t.reducedMotion();
    t.flyTo(c.anchor.lon, c.anchor.lat, t.zoom, { dur: 1500, spin: reduced ? 0 : 360 });
    this._t.surprise = t.after(reduced ? 0 : 1500, () => { t.selectCountry(c, { fly: false }); t._poke(); });
  }

  // ── Find it! ───────────────────────────────────────────────────────────────
  _lang() { return speakableLanguages(this.toy.configManager)[0]; }

  startGame() {
    const t = this.toy;
    t.ui.closePassport(); this._stopGhost();
    t._sel = null; t._pulse = null; t._clearIdleTimers();
    t.ui.setGameActive(true);
    this.game.start(performance.now(), t.renderer.S);
    this._ask();
  }

  stopGame() {
    const t = this.toy;
    this.game.stop();
    t.cancel(this._t.tick); t.cancel(this._t.next); t.cancel(this._t.wrong);
    t._pulse = null; t._sel = null;
    t.ui.setGameActive(false); t.ui.hideCard();
    t._dirty = true; t._poke(); t._requestFrame();
  }

  _ask() {
    const t = this.toy, g = this.game, target = g.target;
    const p = findPrompt(target, this._lang());
    t._sel = null;
    t.ui.showCard({ flag: target.flag, name: p.text, sub: '', more: [] });
    t.ui.announce(p.text);
    speakText(t.configManager, p.text, 1.1, p.lang);
    t._pulse = g.pulse ? { country: target, until: performance.now() + 60000 } : null;
    this._armTick();
    t._dirty = true; t._requestFrame();
  }

  _armTick() {
    const t = this.toy;
    t.cancel(this._t.tick);
    this._t.tick = t.after(10300, () => this._applyHint(this.game.tick(performance.now())));
  }

  _applyHint(h) {
    const t = this.toy, target = this.game.target;
    if (!h || !target) { if (this.game.active) this._armTick(); return; }
    if (h === 'rotate') {
      t.flyTo(target.anchor.lon, target.anchor.lat, Math.min(t.zoom, 2.2), { dur: 900 });
      this._armTick();
    } else {
      t._pulse = { country: target, until: performance.now() + 60000 };
      t._requestFrame();
    }
  }

  gameTap(country) {
    const t = this.toy, now = performance.now();
    const res = this.game.tap(country, now);
    if (res.type === 'idle') return;
    const langs = speakableLanguages(t.configManager);
    if (res.type === 'correct') {
      t.cancel(this._t.tick);
      const names = localisedNames(country, langs);
      const nov = this.visit(country);
      const a = country.anchor;
      t.flyTo(a.lon, a.lat, t.zoom, { dur: 600 });
      t._sel = { country, born: now, popAt: now + 560 }; t._pulse = null;
      const en = names[0].code === 'en';
      t.ui.showCard({ flag: country.flag, name: en ? `You found ${names[0].name}!` : names[0].name + '!', sub: (metaFor(country) || {}).continent || '', isNew: nov.isNew, more: [] });
      t.ui.announce(`You found ${country.name}`);
      t.audio.cheer();
      const reduced = t.reducedMotion();
      t.particles.burst(t.renderer.cx, t.renderer.cy, reduced ? 8 : nov.isNew ? 50 : 34, 1, 0.26);
      if (!reduced) t.particles.burst(t.renderer.cx, t.renderer.cy, nov.isNew ? 60 : 30, 2, 0.3);
      speakText(t.configManager, en ? `You found ${names[0].name}!` : names[0].name, 1.15, names[0].lang);
      t.cancel(this._t.next);
      this._t.next = t.after(NEXT_ROUND_MS, () => { this.game.nextRound(performance.now(), t.renderer.S); this._ask(); });
      t._requestFrame();
      return;
    }
    // wrong or ocean: never punished, just informative
    const first = langs[0];
    let text, spoken;
    if (country) {
      const nm = localisedNames(country, langs)[0];
      text = first === 'en' ? `That's ${nm.name}` : nm.name;
      spoken = { text, lang: first === 'en' ? 'en-US' : nm.lang };
      t._sel = { country, born: now, popAt: now };
      t.cancel(this._t.wrong);
      this._t.wrong = t.after(1400, () => { if (this.game.active && t._sel && t._sel.country === country) { t._sel = null; t._dirty = true; t._requestFrame(); } });
    } else {
      text = first === 'en' ? "That's the ocean" : '🌊';
      spoken = { text: first === 'en' ? text : 'Ocean', lang: 'en-US' };
    }
    t.ui.setSub(text);
    t.ui.announce(text);
    speakText(t.configManager, spoken.text, 1.1, spoken.lang);
    if (res.hint) t.cancel(this._t.apply); this._t.apply = t.after(1700, () => this._applyHint(res.hint));
    t._dirty = true; t._requestFrame();
  }

  // ── keyboard ───────────────────────────────────────────────────────────────
  onKey(e) {
    const t = this.toy, ui = t.ui;
    const k = e.key;
    if (k === 'Escape') {
      if (ui.passportOpen) { ui.closePassport(); t._poke(); } else if (this.game.active) this.stopGame(); else return;
      e.preventDefault(); return;
    }
    if (ui.passportOpen) return;
    const onCanvas = e.target === t.canvas;
    const step = 10 / t.zoom;
    if (k === '+' || k === '=') t.zoomStep(1);
    else if (k === '-' || k === '_') t.zoomStep(-1);
    else if (k === 'ArrowLeft') t.setView(t.lon - step, t.lat);
    else if (k === 'ArrowRight') t.setView(t.lon + step, t.lat);
    else if (k === 'ArrowUp') t.setView(t.lon, t.lat + step);
    else if (k === 'ArrowDown') t.setView(t.lon, t.lat - step);
    else if ((k === 'Enter' || k === ' ') && onCanvas) {
      const r = t.canvas.getBoundingClientRect();
      t._handleTap(r.left + t.renderer.cx, r.top + t.renderer.cy);
    } else return;
    e.preventDefault();
    this._stopGhost();
    t._poke();
  }
}
