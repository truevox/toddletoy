/**
 * DOM construction and small DOM updaters for the orrery toy. No game logic.
 */
import { ORRERY_CSS } from './orrery-css.js';
import { BODIES, FRIENDLY, SCALE_NOTE, factsFor } from './orrery-data.js';
import { SPEED_STEPS } from './orrery-time.js';
import { drawPortrait } from './orrery-sprites.js';
import { stripRows, BTN, GAP } from './orrery-layout.js';

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function btn(cls, label, text, onClick) {
  const b = el('button', cls, text);
  b.type = 'button';
  b.setAttribute('aria-label', label);
  b.addEventListener('click', onClick);
  return b;
}

function portraitCanvas(cls, size, i) {
  const c = el('canvas', cls);
  const dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
  c.width = c.height = Math.round(size * dpr);
  try {
    const g = c.getContext('2d');
    if (g) { g.setTransform(dpr, 0, 0, dpr, 0, 0); drawPortrait(g, i, size); }
  } catch (_) { /* portraits are decoration */ }
  return c;
}

export function drawPortraitInto(canvas, i, size) {
  try {
    const dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
    canvas.width = canvas.height = Math.round(size * dpr);
    const g = canvas.getContext('2d');
    if (!g) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawPortrait(g, i, size);
  } catch (_) { /* ignore */ }
}

/** Build the whole DOM. h = handler callbacks. Returns { root, ...refs }. */
export function buildUI(h) {
  const root = el('div');
  root.id = 'orrery-toy';
  const style = el('style', null, ORRERY_CSS);
  root.appendChild(style);

  const canvas = el('canvas', 'orr-canvas');
  canvas.setAttribute('aria-hidden', 'true');
  root.appendChild(canvas);

  // Back must be the first button in the document (>= 48px, top-left).
  const back = btn('orr-back', 'Back to the toy menu', '← Back', h.onBack);
  back.style.minHeight = '48px';
  back.style.minWidth = '48px';
  root.appendChild(back);

  const title = el('div', 'orr-title', '☀️ Solar System');
  root.appendChild(title);

  const tools = el('div', 'orr-tools');
  const home = btn('orr-round orr-home', 'Show the whole Solar System', '🏠', h.onHome);
  const info = btn('orr-round orr-info', 'About sizes and distances', 'ⓘ', h.onInfo);
  info.setAttribute('aria-pressed', 'false');
  tools.append(home, info);
  root.appendChild(tools);

  const note = el('div', 'orr-note', SCALE_NOTE);
  note.hidden = true;
  note.setAttribute('role', 'note');
  root.appendChild(note);

  const dock = el('div', 'orr-dock');
  const side = el('div', 'orr-side');

  // Info card
  const card = el('div', 'orr-card');
  card.hidden = true;
  const cardPortrait = el('canvas', 'orr-portrait');
  const cardText = el('div', 'orr-text');
  const name = el('div', 'orr-name');
  const line = el('div', 'orr-line');
  cardText.append(name, line);
  const more = btn('orr-more', 'More facts', 'ⓘ More', h.onMore);
  more.setAttribute('aria-expanded', 'false');
  const facts = el('dl', 'orr-facts');
  const scale = el('div', 'orr-scale', SCALE_NOTE);
  const expand = el('div', 'orr-expand');
  expand.hidden = true;
  expand.append(facts, scale);
  card.append(cardPortrait, cardText, more, expand);
  card.addEventListener('click', e => { if (e.target === card || e.target === cardText || e.target === name || e.target === line) h.onMore(); });

  // Find-it panel (shares the card slot)
  const game = el('div', 'orr-game');
  game.hidden = true;
  const gamePortrait = el('canvas', 'orr-portrait');
  const gameText = el('div', 'orr-text');
  const gameName = el('div', 'orr-name');
  const gameStars = el('div', 'orr-stars');
  gameStars.setAttribute('aria-hidden', 'true');
  gameText.append(gameName, gameStars);
  const repeat = btn('orr-more', 'Say it again', '🔊', h.onRepeat);
  game.append(gamePortrait, gameText, repeat);

  // Actions: speed + game + compare
  const actions = el('div', 'orr-actions');
  actions.setAttribute('role', 'group');
  actions.setAttribute('aria-label', 'Time and tools');
  const slow = btn('orr-round orr-slow', 'Slower', '🐢', h.onSlower);
  const play = btn('orr-round orr-play', 'Pause', '', h.onPlay);
  play.setAttribute('aria-pressed', 'false');
  const ico = el('span', 'orr-ico', '⏸');
  const bars = el('span', 'orr-bars');
  SPEED_STEPS.forEach((_, k) => { const b = el('i'); b.style.height = `${2 + k * 1.5}px`; bars.appendChild(b); });
  play.append(ico, bars);
  const fast = btn('orr-round orr-fast', 'Faster', '🐇', h.onFaster);
  const gap = el('span', 'orr-gap');
  const find = btn('orr-round orr-find', 'Find it game', '🔍', h.onFind);
  find.setAttribute('aria-pressed', 'false');
  const compare = btn('orr-round orr-compare', 'Compare planet sizes', '📏', h.onCompare);
  compare.setAttribute('aria-pressed', 'false');
  actions.append(slow, play, fast, gap, find, compare);

  side.append(card, game, actions);

  // Strip: Sun + 8 planets
  const strip = el('div', 'orr-strip');
  strip.setAttribute('role', 'group');
  strip.setAttribute('aria-label', 'Sun and planets');
  const stripBtns = BODIES.map((b, i) => {
    const p = el('button', 'orr-pb');
    p.type = 'button';
    p.setAttribute('aria-label', b.name);
    p.setAttribute('aria-pressed', 'false');
    p.dataset.i = String(i);
    p.appendChild(portraitCanvas('', 38, i));
    p.addEventListener('click', () => h.onSelect(i));
    strip.appendChild(p);
    return p;
  });

  dock.append(side, strip);
  root.appendChild(dock);

  const live = el('div', 'orr-live');
  live.setAttribute('aria-live', 'polite');
  live.setAttribute('role', 'status');
  root.appendChild(live);

  return { root, canvas, back, title, home, info, note, dock, side, card, cardPortrait, name, line, more, facts, scale, expand,
    game, gamePortrait, gameName, gameStars, repeat, actions, slow, play, ico, bars, fast, find, compare, strip, stripBtns, live };
}

/** Fill the info card for body i. */
export function fillCard(ui, i, expanded) {
  const b = BODIES[i];
  ui.name.textContent = b.name;
  ui.line.textContent = FRIENDLY[i];
  drawPortraitInto(ui.cardPortrait, i, 56);
  ui.facts.textContent = '';
  factsFor(i).forEach(f => {
    const dt = el('dt', null, f.label), dd = el('dd', null, f.value);
    ui.facts.append(dt, dd);
  });
  ui.card.hidden = false;
  setExpanded(ui, expanded);
}

export function setExpanded(ui, expanded) {
  ui.expand.hidden = !expanded;
  ui.more.setAttribute('aria-expanded', String(expanded));
  ui.more.textContent = expanded ? 'Less' : 'ⓘ More';
  ui.more.setAttribute('aria-label', expanded ? 'Fewer facts' : 'More facts');
}

export function setSelected(ui, sel) {
  ui.stripBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(i === sel)));
}

export function setSpeedUi(ui, speedIndex, paused) {
  ui.ico.textContent = paused ? '▶' : '⏸';
  ui.play.setAttribute('aria-label', paused ? 'Play' : 'Pause');
  ui.play.setAttribute('aria-pressed', String(paused));
  Array.from(ui.bars.children).forEach((b, k) => b.classList.toggle('on', !paused && k <= speedIndex));
  ui.slow.disabled = false;
}

/** Wrap the strip into rows that fit (one row if possible). */
export function layoutStrip(ui, availW) {
  const rows = stripRows(Math.max(100, availW - 16));
  const per = rows[0];
  ui.strip.style.maxWidth = `${per * BTN + (per - 1) * GAP + 20}px`;
  return rows.length;
}

export function announce(ui, text) {
  ui.live.textContent = '';
  ui.live.textContent = text;
}
