/**
 * @jest-environment jsdom
 */
import { ObjectMotion } from '../src/game/systems/ObjectMotion.js';
import { applyPose } from '../src/game/systems/motion/GlyphPose.js';

function text(extra = {}) {
    return { x: 100, y: 200, width: 80, height: 100, scaleX: 1, scaleY: 1, angle: 0, alpha: 1,
        originX: 0.5, originY: 0.5, active: true, type: 'emoji', updateDisplayOrigin() {}, ...extra };
}
function word() { return { x: 60, y: 270, width: 60, height: 20, originX: 0, originY: 0.5, scaleX: 1, scaleY: 1, alpha: 1, active: true, destroy: jest.fn(), setActive(v) { this.active = v; } }; }
function sceneWith(...objs) { return { objects: objs, draggedObject: null, removeObject: jest.fn(), events: { once() {} } }; }
function run(m, ms, step = 16) { for (let t = 0; t < ms; t += step) m.update(t, step); }

describe('ObjectMotion', () => {
    test('never moves x/y or captions over 2 s of idle, but the glyph changes', () => {
        const o = text(); const w = word(); o.allLanguageWords = [{ words: [w] }];
        const m = new ObjectMotion(sceneWith(o));
        const wx = w.x, wy = w.y;
        const seen = new Set();
        for (let t = 0; t < 2000; t += 16) { m.update(t, 16); seen.add(o.scaleX.toFixed(4) + o.originY.toFixed(4)); }
        expect(o.x).toBe(100); expect(o.y).toBe(200);
        expect([w.x, w.y]).toEqual([wx, wy]);
        expect(seen.size).toBeGreaterThan(20);
    });

    test('pop-in starts small, captions start hidden, all rest after the pop', () => {
        const o = text(); const w = word(); o.allLanguageWords = [{ words: [w] }]; o.baseScale = 0.8;
        const m = new ObjectMotion(sceneWith(o)); m.idleEnabled = false;
        m.popIn(o);
        m.update(0, 16);
        expect(o.scaleX).toBeLessThan(0.8 * 0.5);
        expect(w.alpha).toBe(0);
        run(m, 700);
        expect(o.scaleX).toBeCloseTo(0.8, 5);
        expect(o.scaleY).toBeCloseTo(0.8, 5);
        expect(o.angle).toBe(0);
        expect(w.alpha).toBe(1);
        expect(o.originY).toBeCloseTo(0.5, 6);
    });

    test('scale composes with a baseScale that changes under it', () => {
        const o = text(); const m = new ObjectMotion(sceneWith(o)); m.idleEnabled = false;
        o.baseScale = 0.5; run(m, 100);
        expect(o.scaleX).toBeCloseTo(0.5, 5);
        o.baseScale = 0.7; run(m, 100);
        expect(o.scaleX).toBeCloseTo(0.7, 5);
        o.gridFitScale = 0.5; run(m, 100);
        expect(o.scaleX).toBeCloseTo(0.35, 5);
    });

    test.each(['emoji', 'letter', 'number', 'shape'])('%s react plays then rests exactly', (type) => {
        const o = text({ type }); const m = new ObjectMotion(sceneWith(o)); m.idleEnabled = false;
        m.react(o);
        let moved = false;
        for (let t = 0; t < 400; t += 16) { m.update(t, 16); if (o.angle !== 0 || o.scaleX !== 1 || o.originY !== 0.5) moved = true; }
        expect(moved).toBe(true);
        run(m, 300);
        expect(o.scaleX).toBe(1); expect(o.angle).toBe(0); expect(o.originY).toBeCloseTo(0.5, 6);
        expect(o.x).toBe(100); expect(o.y).toBe(200);
    });

    test('react is re-triggerable mid-play', () => {
        const o = text(); const m = new ObjectMotion(sceneWith(o)); m.idleEnabled = false;
        m.react(o); run(m, 300); m.react(o); run(m, 200);
        expect(o.motionState.reactMs).toBeGreaterThanOrEqual(0);
        run(m, 400);
        expect(o.motionState.reactMs).toBe(-1);
    });

    test('dragging lifts to 1.15 x baseScale, and releases back to rest', () => {
        const o = text(); o.baseScale = 0.8; const sc = sceneWith(o); const m = new ObjectMotion(sc); m.idleEnabled = false;
        sc.draggedObject = o; run(m, 600);
        expect(o.scaleX).toBeCloseTo(0.8 * 1.15, 3);
        sc.draggedObject = null; run(m, 1000);
        expect(o.scaleX).toBeCloseTo(0.8, 5);
        expect(o.angle).toBe(0);
    });

    test('reduced motion: no idle, no angle or lift in a reaction', () => {
        const o = text(); const m = new ObjectMotion(sceneWith(o)); m.reduced = true;
        const seen = new Set();
        for (let t = 0; t < 1500; t += 16) { m.update(t, 16); seen.add(o.scaleX); }
        expect(seen.size).toBe(1);
        m.react(o);
        for (let t = 0; t < 400; t += 16) { m.update(t, 16); expect(o.angle).toBe(0); expect(o.originY).toBeCloseTo(0.5, 6); }
    });

    test('public methods are safe on junk', () => {
        const m = new ObjectMotion(sceneWith());
        expect(() => { m.popIn(null); m.react(undefined); m.bump(null, 1); m.popOut(null); m.bump({ x: 1 }, NaN); }).not.toThrow();
    });

    test('releaseToGhost animates then destroys the display objects; clear destroys at once', () => {
        const o = text({ destroy: jest.fn(), setActive(v) { this.active = v; } }); const w = word(); o.allLanguageWords = [{ words: [w] }];
        const m = new ObjectMotion(sceneWith());
        m.releaseToGhost(o);
        expect(o.destroy).not.toHaveBeenCalled();
        run(m, 150);
        expect(o.destroy).not.toHaveBeenCalled();
        expect(o.alpha).toBeLessThan(1);
        expect(o.active).toBe(false);
        run(m, 250);
        expect(o.destroy).toHaveBeenCalledTimes(1);
        expect(w.destroy).toHaveBeenCalledTimes(1);

        const o2 = text({ destroy: jest.fn() });
        m.releaseToGhost(o2); m.clearGhosts();
        expect(o2.destroy).toHaveBeenCalledTimes(1);
        expect(m.ghosts.count).toBe(0);
    });
});

describe('applyPose on a shape container', () => {
    test('lifts the child, not the container', () => {
        const c = { x: 10, y: 20, scaleX: 1, scaleY: 1, angle: 0, alpha: 1, mainShape: { x: 0, y: 0 }, shapeSize: 100 };
        applyPose(c, { sx: 1, sy: 1, angle: 0, lift: 0, alpha: 1 }, 20);
        expect([c.x, c.y]).toEqual([10, 20]);
        expect(c.mainShape.y).toBe(-20);
    });
});
