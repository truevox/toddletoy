import { GlobeToy } from '../src/toys/GlobeToy.js';
import { OrreryToy } from '../src/toys/OrreryToy.js';
import { speakText, resolveSpeechSettings } from '../src/toys/toy-speech.js';

function stubCtx() {
  const fn = () => {};
  const grad = { addColorStop: fn };
  return new Proxy({}, {
    get: (t, k) => (k in t ? t[k] : (k === 'createRadialGradient' || k === 'createLinearGradient' ? () => grad : fn)),
    set: (t, k, v) => { t[k] = v; return true; },
  });
}

describe('toy lifecycle', () => {
  let rafs, cancelled, nextId, addSpy, removeSpy, origGetContext;

  beforeEach(() => {
    origGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = () => stubCtx();
    rafs = new Map(); cancelled = 0; nextId = 1;
    window.requestAnimationFrame = cb => { const id = nextId++; rafs.set(id, cb); return id; };
    window.cancelAnimationFrame = id => { if (rafs.delete(id)) cancelled++; };
    global.requestAnimationFrame = window.requestAnimationFrame;
    global.cancelAnimationFrame = window.cancelAnimationFrame;
    addSpy = jest.spyOn(window, 'addEventListener');
    removeSpy = jest.spyOn(window, 'removeEventListener');
    document.body.innerHTML = '';
  });

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = origGetContext;
    addSpy.mockRestore(); removeSpy.mockRestore();
  });

  const router = { navigate: jest.fn() };

  test.each([
    ['GlobeToy', GlobeToy, 'globe-toy'],
    ['OrreryToy', OrreryToy, 'orrery-toy'],
  ])('%s: repeated show/hide does not accumulate listeners or leave RAF running', (_n, Toy, id) => {
    const toy = new Toy(router, null);
    for (let i = 0; i < 10; i++) { toy.show(); toy.hide(); }
    expect(rafs.size).toBe(0);
    expect(document.querySelectorAll('#' + id).length).toBe(1);
    const count = (spy, ev) => spy.mock.calls.filter(c => c[0] === ev).length;
    expect(count(addSpy, 'resize')).toBe(count(removeSpy, 'resize'));
    expect(count(addSpy, 'resize')).toBe(10);

    toy.show();
    expect(rafs.size).toBe(1);
    toy.show(); // double show must not double up
    expect(rafs.size).toBe(1);
    expect(count(addSpy, 'resize') - count(removeSpy, 'resize')).toBe(1);
    toy.hide();
    expect(rafs.size).toBe(0);

    toy.show();
    toy.destroy();
    expect(rafs.size).toBe(0);
    expect(document.querySelectorAll('#' + id).length).toBe(0);
    expect(count(addSpy, 'resize')).toBe(count(removeSpy, 'resize'));
  });

  test('RAF callback arriving after hide does not reschedule', () => {
    const toy = new GlobeToy(router, null);
    toy.show();
    const [[, cb]] = [...rafs.entries()];
    toy.hide();
    cb(1000);
    expect(rafs.size).toBe(0);
  });

  test('back buttons are at least 44px tall', () => {
    for (const Toy of [GlobeToy, OrreryToy]) {
      document.body.innerHTML = '';
      const toy = new Toy(router, null);
      toy.show();
      const btn = document.querySelector('button');
      expect(parseInt(btn.style.minHeight, 10)).toBeGreaterThanOrEqual(44);
      btn.click();
      expect(router.navigate).toHaveBeenCalledWith('/');
      toy.destroy();
    }
  });

  test('globe: tap handler never throws when speech is missing or throwing', () => {
    const toy = new GlobeToy(router, null);
    toy.show();
    toy.canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: window.innerWidth, height: window.innerHeight });
    toy.setView(-52, -10);
    const saved = global.speechSynthesis;
    const savedU = global.SpeechSynthesisUtterance;
    try {
      global.speechSynthesis = { speak() { throw new Error('boom'); }, cancel() { throw new Error('boom'); } };
      expect(() => toy._handleTap(window.innerWidth / 2, window.innerHeight / 2)).not.toThrow();
      expect(toy.infoPanel.textContent).toContain('Brazil');
      delete global.SpeechSynthesisUtterance;
      expect(() => toy._handleTap(window.innerWidth / 2, window.innerHeight / 2)).not.toThrow();
      global.speechSynthesis = undefined;
      expect(() => toy._handleTap(window.innerWidth / 2, window.innerHeight / 2)).not.toThrow();
    } finally {
      global.speechSynthesis = saved;
      global.SpeechSynthesisUtterance = savedU;
    }
    toy.destroy();
  });

  test('orrery: tap handler never throws and selects a planet within tolerance', () => {
    const toy = new OrreryToy(router, null);
    toy.show();
    toy.canvas.getBoundingClientRect = () => ({ left: 0, top: 0 });
    const { items } = toy._items(0);
    const saved = global.speechSynthesis;
    global.speechSynthesis = { speak() { throw new Error('boom'); }, cancel() {} };
    try {
      expect(() => toy._handleTap(items[0].x + 20, items[0].y)).not.toThrow();
      expect(toy.selectedIdx).toBe(0);
      expect(toy.infoPanel.textContent).toContain('Mercury');
      expect(() => toy._handleTap(items[7].x - 15, items[7].y + 10)).not.toThrow();
      expect(toy.selectedIdx).toBe(7);
    } finally {
      global.speechSynthesis = saved;
    }
    toy.destroy();
  });

  test('hide() cancels speech', () => {
    const cancel = jest.fn();
    const saved = global.speechSynthesis;
    global.speechSynthesis = { speak: jest.fn(), cancel };
    const toy = new GlobeToy(router, null);
    toy.show(); toy.hide();
    expect(cancel).toHaveBeenCalled();
    global.speechSynthesis = saved;
    toy.destroy();
  });
});

describe('toy-speech', () => {
  let speak, cancel, saved, savedU;
  beforeEach(() => {
    saved = global.speechSynthesis; savedU = global.SpeechSynthesisUtterance;
    speak = jest.fn(); cancel = jest.fn();
    global.speechSynthesis = { speak, cancel };
    global.SpeechSynthesisUtterance = function (t) { this.text = t; };
  });
  afterEach(() => { global.speechSynthesis = saved; global.SpeechSynthesisUtterance = savedU; });

  test('mute silences', () => {
    expect(speakText({ getSpeechConfig: () => ({ mute: true, volume: 70, rate: 1 }) }, 'x')).toBe(false);
    expect(speak).not.toHaveBeenCalled();
  });

  test('volume 0 silences; volume and rate are applied', () => {
    expect(speakText({ getSpeechConfig: () => ({ volume: 0 }) }, 'x')).toBe(false);
    expect(speakText({ getSpeechConfig: () => ({ volume: 40, rate: 1.5 }) }, 'Brazil', 1.1)).toBe(true);
    const u = speak.mock.calls[0][0];
    expect(u.text).toBe('Brazil');
    expect(u.volume).toBeCloseTo(0.4);
    expect(u.rate).toBeCloseTo(1.5);
  });

  test('settings are clamped and defaults used without a config manager', () => {
    expect(resolveSpeechSettings({ getSpeechConfig: () => ({ volume: 500, rate: 9 }) })).toEqual({ mute: false, volume: 1, rate: 2 });
    expect(resolveSpeechSettings(null)).toEqual({ mute: false, volume: 0.7, rate: 1 });
    expect(resolveSpeechSettings({ getSpeechConfig() { throw new Error('x'); } }).mute).toBe(false);
  });
});
