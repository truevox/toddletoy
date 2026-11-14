/**
 * Behaviour of the orrery toy: selection, camera follow, speed controls,
 * compare view, Find-it game, hints and keyboard. Functions take the toy `t`.
 */
import { BODIES, FRIENDLY, SCALE_NOTE, COMPARE_NOTE, EARTH_INDEX, sentenceName, spokenName, FIND_PROMPT, FOUND_PROMPT, THATS_PROMPT, factsFor } from './orrery-data.js';
import { followZoom, goHome, zoomAbout, scaleOf, MAX_ZOOM } from './orrery-camera.js';
import { fillCard, setExpanded, setSelected, setSpeedUi, announce, drawPortraitInto } from './orrery-ui.js';
import { speakLocal, pickLanguage } from './orrery-audio.js';
import { burst } from './orrery-sky.js';
import { createGame, startGame, stopGame, tapBody, nextRound, hintLevel } from './orrery-game.js';
import { compareLayout, fitCompareScale, pickCompare, clampScroll } from './orrery-compare.js';

const SPEED_NAMES = ['Very slow', 'Normal speed', 'Fast', 'Very fast'];
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

function later(t, ms, fn) {
  const id = setTimeout(() => { t.timers.delete(id); if (t._visible) fn(); }, ms);
  t.timers.add(id);
}

function say(t, text, lang, pitch) { speakLocal(t.configManager, text, { lang, pitch }); }

function sayBody(t, i) {
  const lang = pickLanguage(t.configManager);
  if (lang === 'en') say(t, `${i === 0 ? 'The Sun' : BODIES[i].name}. ${FRIENDLY[i]}`, 'en');
  else say(t, spokenName(i, lang), lang);
}

function bodyPlace(i) {
  const f = factsFor(i)[0];
  return i === 0 ? BODIES[0].name : `${BODIES[i].name}, ${f.value}`;
}

function refreshLayout(t) { t._relayout(false); }

export function select(t, i) {
  if (t.game.active) return gameTap(t, i);
  t.sel = i; t.S.sel = i; t.hinted.tapped = true;
  if (t.mode === 'orbit') {
    const c = t.cam;
    c.follow = i;
    c.tz = followZoom(BODIES[i].r, t.viewTarget.base, t.free.w, t.free.h);
  }
  t.expanded = false;
  fillCard(t.ui, i, false);
  setSelected(t.ui, i);
  refreshLayout(t);
  if (t.mode === 'compare') scrollIntoView(t, i);
  t.chimes.chime(i);
  sayBody(t, i);
  announce(t.ui, bodyPlace(i));
  if (t.mode === 'orbit' && !t.reduced) { t._computePositions(); burst(t.S.particles, t.S.px[i], t.S.py[i], 8); }
}

export function deselect(t, goBack = true) {
  t.sel = -1; t.S.sel = -1;
  if (goBack) goHome(t.cam);
  t.ui.card.hidden = true;
  setSelected(t.ui, -1);
  refreshLayout(t);
}

export function home(t) {
  if (t.mode === 'compare') { t.cmp.zoom = 1; t.cmp.scrollX = 0; t._compareSetup(false); }
  goHome(t.cam);
  if (t.sel >= 0) deselect(t, true);
  announce(t.ui, 'Whole Solar System');
}

function togglePause(t) {
  t.time.togglePause();
  setSpeedUi(t.ui, t.time.speedIndex, t.time.paused);
  announce(t.ui, t.time.paused ? 'Paused' : SPEED_NAMES[t.time.speedIndex]);
}

function speed(t, dir) {
  if (dir < 0) t.time.slower(); else t.time.faster();
  setSpeedUi(t.ui, t.time.speedIndex, t.time.paused);
  announce(t.ui, SPEED_NAMES[t.time.speedIndex]);
}

function toggleInfo(t) {
  const n = t.ui.note;
  n.textContent = t.mode === 'compare' ? COMPARE_NOTE : SCALE_NOTE;
  n.hidden = !n.hidden;
  t.ui.info.setAttribute('aria-pressed', String(!n.hidden));
}

function hideNote(t) { t.ui.note.hidden = true; t.ui.info.setAttribute('aria-pressed', 'false'); }

function toggleMore(t) {
  if (t.sel < 0) return;
  t.expanded = !t.expanded;
  setExpanded(t.ui, t.expanded);
  refreshLayout(t);
}

// ── Compare view ────────────────────────────────────────────────────────────
function setDisabled(t, on) {
  [t.ui.slow, t.ui.play, t.ui.fast, t.ui.find].forEach(b => { b.disabled = on; });
}

export function compareSetup(t, reset) {
  const C = t.cmp, f = t.free;
  if (reset) { C.zoom = 1; C.scrollX = 0; }
  C.e0 = fitCompareScale(f.w, f.h);
  C.e = C.e0 * C.zoom;
  C.layout = compareLayout(C.e, 0);
  C.scrollX = clampScroll(C.scrollX, C.layout.worldWidth, f.w);
}

export function compareScroll(t, dx) {
  const C = t.cmp;
  C.scrollX = clampScroll(C.scrollX + dx, C.layout.worldWidth, t.free.w);
}

export function compareZoom(t, k, cx) {
  const C = t.cmp, nz = Math.min(4, Math.max(1, C.zoom * k)), ratio = nz / C.zoom, rel = cx - t.free.x;
  C.scrollX = rel - (rel - C.scrollX) * ratio;
  C.zoom = nz; C.e = C.e0 * nz;
  C.layout = compareLayout(C.e, 0);
  C.scrollX = clampScroll(C.scrollX, C.layout.worldWidth, t.free.w);
}

function scrollIntoView(t, i) {
  const C = t.cmp, f = t.free;
  const cx = i === 0 ? C.layout.sun.cx + C.layout.sun.r - 40 : C.layout.items[i - 1].cx;
  const sx = f.x + C.scrollX + cx;
  if (sx < f.x + 40 || sx > f.x + f.w - 40) C.scrollX = clampScroll(f.w / 2 - cx, C.layout.worldWidth, f.w);
}

function toggleCompare(t) {
  const entering = t.mode !== 'compare';
  if (t.game.active) stopFind(t);
  t.sel = -1; t.S.sel = -1; t.ui.card.hidden = true; setSelected(t.ui, -1);
  goHome(t.cam);
  t.mode = entering ? 'compare' : 'orbit';
  t.ui.compare.setAttribute('aria-pressed', String(entering));
  setDisabled(t, entering);
  hideNote(t);
  refreshLayout(t);
  if (entering) {
    compareSetup(t, true);
    t.ui.note.textContent = COMPARE_NOTE; t.ui.note.hidden = false;
    t.ui.info.setAttribute('aria-pressed', 'true');
    announce(t.ui, 'Comparing real sizes');
  } else announce(t.ui, 'Back to the orbits');
}

// ── Find it! ────────────────────────────────────────────────────────────────
function ask(t) {
  const g = t.game, lang = pickLanguage(t.configManager);
  const n = spokenName(g.target, lang);
  t.ui.gameName.textContent = `Find ${sentenceName(g.target)}!`;
  t.ui.game.classList.remove('orr-cheer');
  drawPortraitInto(t.ui.gamePortrait, g.target, 56);
  t.ui.gameStars.textContent = '⭐'.repeat(Math.min(g.found, 9));
  say(t, FIND_PROMPT[lang](n), lang);
  announce(t.ui, `Find ${sentenceName(g.target)}`);
}

function toggleFind(t) {
  if (t.game.active) return stopFind(t);
  if (t.mode === 'compare') toggleCompare(t);
  t.sel = -1; t.S.sel = -1; t.ui.card.hidden = true; setSelected(t.ui, -1);
  goHome(t.cam);
  t.expanded = false;
  startGame(t.game, now());
  t.ui.game.hidden = false;
  t.ui.find.setAttribute('aria-pressed', 'true');
  refreshLayout(t);
  ask(t);
}

export function stopFind(t) {
  stopGame(t.game);
  t.ui.game.hidden = true;
  t.ui.find.setAttribute('aria-pressed', 'false');
  t.S.hintOrbit = -1; t.S.pulse = -1;
  refreshLayout(t);
}

export function gameTap(t, body) {
  const g = t.game, r = tapBody(g, body), lang = pickLanguage(t.configManager);
  if (r.type === 'wrong') {
    t.chimes.chime(body);
    say(t, THATS_PROMPT[lang](spokenName(body, lang)), lang);
  } else if (r.type === 'correct') {
    t.S.hintOrbit = -1; t.S.pulse = -1;
    t.chimes.arpeggio();
    t._computePositions();
    if (!t.reduced) burst(t.S.particles, t.S.px[body], t.S.py[body], 30);
    t.ui.game.classList.add('orr-cheer');
    t.ui.gameName.textContent = `You found ${sentenceName(body)}!`;
    t.ui.gameStars.textContent = '⭐'.repeat(Math.min(g.found, 9));
    say(t, FOUND_PROMPT[lang](spokenName(body, lang)), lang);
    announce(t.ui, `You found ${sentenceName(body)}!`);
    later(t, 2600, () => { if (g.active) { nextRound(g, now()); ask(t); } });
  }
}

// ── Hints (ghost finger, pulses, game hints) ────────────────────────────────
export function hintsFrame(t) {
  const S = t.S, g = t.game, w = t._wall;
  S.ghost.on = false;
  if (g.active) {
    const lvl = hintLevel(g, now());
    S.hintOrbit = lvl >= 1 ? g.target : -1;
    S.pulse = lvl >= (g.target === 0 ? 1 : 2) ? g.target : -1;
    return;
  }
  S.hintOrbit = -1;
  S.pulse = !t.hinted.tapped && t.mode === 'orbit' ? EARTH_INDEX : -1;
  if (t.hinted.dragged || t.mode !== 'orbit' || t.sel >= 0 || t.reduced || w < 1.2 || t.time.dragging) return;
  const cyc = (w - 1.2) % 7.5, DUR = 2.4;
  if (cyc > DUR) return;
  const p = cyc / DUR, e = p * p * (3 - 2 * p), a = 0.4 + e * 1.7;
  const rad = scaleOf(t.view, t.cam) * 232;
  S.ghost.on = true; S.ghost.rad = rad; S.ghost.a0 = -0.4; S.ghost.a = -a;
  S.ghost.x = S.px[0] + Math.cos(a) * rad; S.ghost.y = S.py[0] - Math.sin(a) * rad;
}

// ── Reset, input, wiring ────────────────────────────────────────────────────
export function resetState(t) {
  const c = t.cam;
  goHome(c); c.fx = 0; c.fy = 0; c.z = 1;
  t.sel = -1; t.S.sel = -1; t.mode = 'orbit'; t.expanded = false;
  stopGame(t.game); t.game = t.game || createGame();
  const u = t.ui;
  u.card.hidden = true; u.game.hidden = true; hideNote(t);
  u.find.setAttribute('aria-pressed', 'false'); u.compare.setAttribute('aria-pressed', 'false');
  setDisabled(t, false); setSelected(u, -1);
  t.S.hintOrbit = -1; t.S.pulse = -1; t.S.ghost.on = false;
}

export function tapAt(t, x, y) {
  hideNote(t);
  if (t.mode === 'compare') {
    const C = t.cmp, f = t.free;
    const i = pickCompare(C.layout, x - f.x - C.scrollX, y - (f.y + f.h / 2));
    if (i >= 0) select(t, i); else if (t.sel >= 0) deselect(t, false);
    return;
  }
  const hit = t._pickAt(x, y);
  if (hit >= 0) { select(t, hit); return; }
  if (!t.game.active && (t.sel >= 0 || t.cam.follow >= 0)) deselect(t, true);
}

export function doubleTap(t, x, y) {
  if (t.mode !== 'orbit' || t.game.active || t._pickAt(x, y) >= 0) return;
  if (t.cam.tz >= 3.2) { goHome(t.cam); return; }
  t.cam.follow = -1;
  zoomAbout(t.view, t.cam, x, y, 2.2, MAX_ZOOM);
}

export function onKey(t, e) {
  if (!t._visible || e.ctrlKey || e.metaKey || e.altKey) return;
  const onButton = e.target && e.target.tagName === 'BUTTON';
  const k = e.key;
  if ((k === ' ' || k === 'Enter') && onButton) return;
  const f = t.free, cx = f.x + f.w / 2, cy = f.y + f.h / 2;
  if (k === 'ArrowRight' || k === 'ArrowLeft') {
    const dir = k === 'ArrowRight' ? 1 : -1;
    const cur = t.game.active ? Number(document.activeElement?.dataset?.i ?? -1) : t.sel;
    const i = cur < 0 ? (dir > 0 ? 0 : 8) : Math.min(8, Math.max(0, cur + dir));
    if (t.game.active) t.ui.stripBtns[i].focus(); else { select(t, i); t.ui.stripBtns[i].focus(); }
  } else if (k === ' ') togglePause(t);
  else if (k === '+' || k === '=') t._zoomBy(1.25, cx, cy);
  else if (k === '-' || k === '_') t._zoomBy(0.8, cx, cy);
  else if (k === 'Escape') {
    if (t.game.active) stopFind(t);
    else if (t.mode === 'compare') toggleCompare(t);
    else if (t.sel >= 0 || t.cam.tz > 1.05) home(t);
    else return;
  } else return;
  e.preventDefault();
}

export function handlers(t) {
  return {
    onBack: () => t.router.navigate('/'),
    onHome: () => home(t),
    onInfo: () => toggleInfo(t),
    onSlower: () => speed(t, -1),
    onPlay: () => togglePause(t),
    onFaster: () => speed(t, +1),
    onFind: () => toggleFind(t),
    onCompare: () => toggleCompare(t),
    onSelect: i => select(t, i),
    onMore: () => toggleMore(t),
    onRepeat: () => { if (t.game.active) ask(t); },
  };
}

export const actions = { handlers, tapAt, doubleTap, hintsFrame, resetState, onKey, compareSetup, compareScroll, compareZoom };
