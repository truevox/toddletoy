/**
 * DOM for the globe toy: canvases, buttons, info card, passport panel, ghost
 * hand and live region. Owns its own timers (passport hold) and exposes a
 * small imperative API to GlobeToy.
 */
import { GLOBE_CSS } from './globe-style.js';
import { computeLayout, BTN_PLAY } from './globe-layout.js';
import { CONTINENT_ORDER, CONTINENTS } from './globe-meta.js';

const HOLD_MS = 2000;

function el(tag, cls, text, attrs) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  if (attrs) for (const k of Object.keys(attrs)) e.setAttribute(k, attrs[k]);
  return e;
}

function button(cls, label, text, onClick) {
  const b = el('button', cls, text, { type: 'button', 'aria-label': label });
  b.addEventListener('click', onClick);
  return b;
}

export class GlobeUI {
  /** @param cb { back, zoom(dir), home, surprise, find, passport, resetPassport, toggleMore } */
  constructor(cb) {
    this.cb = cb;
    this.layout = null;
    this._holdTimer = null;
    this.root = el('div'); this.root.id = 'globe-toy';
    this.root.appendChild(el('style', '', GLOBE_CSS));

    this.bg = el('canvas'); this.bg.style.pointerEvents = 'none'; this.bg.setAttribute('aria-hidden', 'true');
    this.root.appendChild(this.bg);
    const stars = el('div', 'gt-stars'); stars.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 14; i++) {
      const s = el('i');
      s.style.cssText = `left:${(i * 37.7 + 11) % 100}%;top:${(i * 53.3 + 7) % 100}%;animation-delay:${(i * 0.37) % 3.4}s;animation-duration:${2.6 + (i % 5) * 0.5}s`;
      stars.appendChild(s);
    }
    this.root.appendChild(stars);

    this.canvas = el('canvas', 'gt-main', undefined, { tabindex: '0', role: 'img', 'aria-label': 'Spinning globe. Drag to turn it, tap a country.' });
    this.root.appendChild(this.canvas);

    // Back must be the first button in the container.
    this.back = button('gt-back', 'Back', '← Back', () => cb.back());
    this.back.style.minHeight = '48px';
    this.root.appendChild(this.back);

    this.zoomBox = el('div', 'gt-zoom');
    this.zoomIn = button('gt-z', 'Zoom in', '+', () => cb.zoom(1));
    this.zoomOut = button('gt-z', 'Zoom out', '−', () => cb.zoom(-1));
    this.homeBtn = button('gt-z', 'Zoom out all the way', '🏠', () => cb.home());
    this.homeBtn.style.display = 'none'; this.homeBtn.style.fontSize = '1.3rem';
    this.zoomBox.append(this.zoomIn, this.zoomOut, this.homeBtn);
    this.root.appendChild(this.zoomBox);

    this.playBox = el('div', 'gt-play');
    this.surpriseBtn = button('gt-btn gt-surprise', 'Surprise me', '🎲', () => cb.surprise());
    this.findBtn = button('gt-btn gt-find', 'Find it! Start the finding game', '🔍', () => cb.find());
    this.findBtn.setAttribute('aria-pressed', 'false');
    this.passBtn = button('gt-btn gt-pass-btn', 'My passport', '🧳', () => cb.passport());
    this.badge = el('span', 'gt-badge', '0'); this.passBtn.appendChild(this.badge);
    this.playBox.append(this.surpriseBtn, this.findBtn, this.passBtn);
    this.root.appendChild(this.playBox);

    this.infoPanel = el('div', 'gt-card');
    this.cardMain = el('button', 'gt-card-main', undefined, { type: 'button', 'aria-expanded': 'false' });
    this.flagEl = el('span', 'gt-flag'); this.flagEl.setAttribute('aria-hidden', 'true');
    const text = el('div', 'gt-text');
    this.nameEl = el('div', 'gt-name'); this.subEl = el('div', 'gt-sub');
    text.append(this.nameEl, this.subEl);
    this.cardMain.append(this.flagEl, text);
    this.cardMain.addEventListener('click', () => cb.toggleMore());
    this.moreEl = el('div', 'gt-more'); this.moreEl.hidden = true;
    this.infoPanel.append(this.cardMain, this.moreEl);
    this.root.appendChild(this.infoPanel);

    this.ghost = el('div', 'gt-ghost', '👆'); this.ghost.setAttribute('aria-hidden', 'true');
    this.root.appendChild(this.ghost);
    this.live = el('div', 'gt-sr', '', { role: 'status', 'aria-live': 'polite' });
    this.root.appendChild(this.live);
    this.probe = el('div', 'gt-probe');
    this.root.appendChild(this.probe);
    this.passPanel = null;
    this.expandable = false;
  }

  readInsets() {
    try {
      const cs = getComputedStyle(this.probe);
      const n = v => (parseFloat(v) || 0);
      return { top: n(cs.paddingTop), right: n(cs.paddingRight), bottom: n(cs.paddingBottom), left: n(cs.paddingLeft) };
    } catch (_) { return {}; }
  }

  /** Position every control for the viewport; returns the layout. */
  applyLayout(w, h) {
    const l = this.layout = computeLayout(w, h, this.readInsets());
    const px = n => Math.round(n) + 'px';
    this.back.style.left = px(l.back.left); this.back.style.top = px(l.back.top);
    const z = this.zoomBox.style;
    z.right = px(l.zoom.right); z.top = px(l.zoom.top); z.flexDirection = l.zoom.horizontal ? 'row' : 'column';
    const p = this.playBox.style;
    if (l.play.vertical) {
      p.flexDirection = 'column'; p.gap = '12px'; p.left = px(l.play.left); p.top = px(l.play.top); p.width = BTN_PLAY + 'px';
    } else {
      p.flexDirection = 'row'; p.gap = '22px'; p.left = '0px'; p.top = px(l.play.top); p.width = px(l.play.width);
    }
    const c = this.infoPanel.style;
    c.width = px(l.card.width); c.bottom = px(l.card.bottom); c.maxHeight = px(l.card.maxH);
    c.left = px(l.landscape ? l.card.left : (w - l.card.width) / 2);
    this.root.style.setProperty('--gt-label', l.labelScale);
    return l;
  }

  announce(text) { this.live.textContent = ''; this.live.textContent = text; }

  // ── Card ───────────────────────────────────────────────────────────────────
  /** @param d {flag, name, sub, isNew, more: [[label, text]]} */
  showCard(d) {
    this.flagEl.textContent = d.flag || '';
    this.nameEl.textContent = d.name;
    this.subEl.textContent = d.sub || '';
    if (d.isNew) this.subEl.appendChild(el('span', 'gt-new', '⭐ New!'));
    this.moreEl.textContent = '';
    for (const [k, v] of d.more || []) {
      const row = el('div'); row.append(el('b', '', k), document.createTextNode(v)); this.moreEl.appendChild(row);
    }
    this.expandable = !!(d.more && d.more.length);
    if (this.expandable) this.subEl.appendChild(el('span', 'gt-chip', 'ⓘ more'));
    this.setExpanded(false);
    this.cardMain.disabled = !this.expandable;
    this.cardMain.style.cursor = this.expandable ? 'pointer' : 'default';
    this.infoPanel.classList.add('gt-show');
    this.infoPanel.scrollTop = 0;
  }

  /** Replace the second line of the card (used for "That's Argentina" feedback). */
  setSub(text) { this.subEl.textContent = text; }

  hideCard() { this.infoPanel.classList.remove('gt-show'); this.setExpanded(false); }

  get expanded() { return this.cardMain.getAttribute('aria-expanded') === 'true'; }

  setExpanded(on) {
    on = !!on && this.expandable;
    this.cardMain.setAttribute('aria-expanded', String(on));
    this.moreEl.hidden = !on;
    const chip = this.subEl.querySelector('.gt-chip');
    if (chip) chip.textContent = on ? 'ⓘ less' : 'ⓘ more';
    const l = this.layout;
    if (l && l.landscape === false) this.infoPanel.style.maxHeight = Math.round(on ? l.card.maxH : 130) + 'px';
  }

  // ── Controls state ─────────────────────────────────────────────────────────
  setZoomState(zoom, min, max) {
    this.zoomIn.disabled = zoom >= max - 0.01;
    this.zoomOut.disabled = zoom <= min + 0.01;
    this.homeBtn.style.display = zoom > min + 0.05 ? 'flex' : 'none';
  }

  setPassportCount(n) { this.badge.textContent = String(n); }

  setGameActive(on) {
    this.findBtn.classList.toggle('gt-on', on);
    this.findBtn.setAttribute('aria-pressed', String(on));
    this.findBtn.setAttribute('aria-label', on ? 'Stop the finding game' : 'Find it! Start the finding game');
    this.findBtn.textContent = on ? '✕' : '🔍';
  }

  // ── Ghost hand ─────────────────────────────────────────────────────────────
  playGhost(x, y, dx) {
    const g = this.ghost;
    g.classList.remove('gt-go'); void g.offsetWidth;
    g.style.left = Math.round(x) + 'px'; g.style.top = Math.round(y) + 'px';
    g.style.setProperty('--gdx', Math.round(dx) + 'px');
    g.classList.add('gt-go');
  }
  stopGhost() { this.ghost.classList.remove('gt-go'); }

  // ── Passport panel ─────────────────────────────────────────────────────────
  get passportOpen() { return !!this.passPanel; }

  openPassport({ groups, count, total }) {
    this.closePassport();
    const p = this.passPanel = el('div', 'gt-pass', undefined, { role: 'dialog', 'aria-label': 'My passport' });
    p.appendChild(el('h2', '', '🧳 My Passport'));
    p.appendChild(el('div', 'gt-total', `${count} of ${total} countries`));
    if (!count) p.appendChild(el('div', 'gt-total', 'Tap countries on the globe to collect their flags!'));
    for (const code of CONTINENT_ORDER) {
      const flags = groups[code];
      if (!flags || !flags.length) continue;
      p.appendChild(el('h3', '', CONTINENTS[code]));
      const row = el('div', 'gt-flags');
      for (const f of flags) row.appendChild(el('span', '', f.flag, { title: f.name, 'aria-label': f.name, role: 'img' }));
      p.appendChild(row);
    }
    const reset = el('button', 'gt-reset', undefined, { type: 'button', 'aria-label': 'Start over (grown-ups: hold for 2 seconds)' });
    reset.append(el('i'), document.createTextNode('Start over (grown-ups: hold 2 seconds)'));
    const start = e => { e.preventDefault(); reset.classList.add('gt-holding'); clearTimeout(this._holdTimer); this._holdTimer = setTimeout(() => { this._holdTimer = null; this.cb.resetPassport(); }, HOLD_MS); };
    const stop = () => { clearTimeout(this._holdTimer); this._holdTimer = null; reset.classList.remove('gt-holding'); };
    reset.addEventListener('pointerdown', start);
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel', 'blur']) reset.addEventListener(ev, stop);
    reset.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) start(e); });
    reset.addEventListener('keyup', stop);
    if (count) p.appendChild(reset);
    const x = button('gt-x', 'Close passport', '✕', () => this.cb.passport());
    p.appendChild(x);
    this.root.appendChild(p);
    x.focus({ preventScroll: true });
  }

  closePassport() {
    clearTimeout(this._holdTimer); this._holdTimer = null;
    if (this.passPanel) { this.passPanel.remove(); this.passPanel = null; }
  }

  dispose() { this.closePassport(); this.stopGhost(); }
}
