// GamepadInput: dead zone, time-based movement, clamping, per-pad cursors, press vs hold, connect/disconnect, fade.
import { GamepadInput, applyDeadZone, DEAD_ZONE, IDLE_MS, MAX_FRAME_MS, SPEED_PER_SEC, MAX_PADS } from '../src/game/input/GamepadInput.js';

const W = 1000, H = 600;
const makePad = (extra = {}) => ({ connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), ...extra });

function setup({ reduced = false, pads = [] } = {}) {
    const target = new EventTarget();
    const nav = { pads, getGamepads: jest.fn(function () { return this.pads; }) };
    const scene = { scale: { width: W, height: H } };
    const events = [];
    const view = { update: jest.fn(), remove: jest.fn(), hideAll: jest.fn(), setRadius: jest.fn(), destroy: jest.fn() };
    let t = 1000;
    const gp = new GamepadInput(scene, (name, data) => events.push({ name, data }), { now: () => t, nav, target, reducedMotion: () => reduced, createView: () => view });
    const connect = (i) => { nav.pads[i] = nav.pads[i] || makePad(); target.dispatchEvent(Object.assign(new Event('gamepadconnected'), { gamepad: { index: i } })); return nav.pads[i]; };
    const frame = (ms = 16) => { t += ms; gp.update(); };
    const press = (pad, i, on = true) => { pad.buttons[i] = { pressed: on, value: on ? 1 : 0 }; };
    return { gp, nav, scene, events, view, target, connect, frame, press, advance: (ms) => { t += ms; }, by: (name) => events.filter(e => e.name === name).map(e => e.data) };
}

describe('applyDeadZone', () => {
    test('nothing inside the zone', () => {
        expect(applyDeadZone(0.1, 0.1)).toEqual({ x: 0, y: 0 });
        expect(applyDeadZone(DEAD_ZONE, 0)).toEqual({ x: 0, y: 0 });
    });
    test('starts from zero at the edge of the zone and reaches 1 at full tilt, keeping direction', () => {
        const a = applyDeadZone(DEAD_ZONE + 0.01, 0);
        expect(a.x).toBeGreaterThan(0); expect(a.x).toBeLessThan(0.05);
        const b = applyDeadZone(1, 0); expect(b.x).toBeCloseTo(1, 5);
        const c = applyDeadZone(-0.6, 0.6); expect(c.x).toBeLessThan(0); expect(c.y).toBeGreaterThan(0); expect(c.x).toBeCloseTo(-c.y, 5);
    });
});

describe('no pad, no polling', () => {
    test('update() never asks the browser for pads until one connects', () => {
        const s = setup();
        const scans = s.nav.getGamepads.mock.calls.length;
        for (let i = 0; i < 50; i++) s.frame();
        expect(s.nav.getGamepads.mock.calls.length).toBe(scans);
        expect(s.gp.active).toBe(false);
    });
    test('a pad that is already there at start is picked up', () => {
        const s = setup({ pads: [makePad()] });
        expect(s.gp.cursor(0)).not.toBeNull();
    });
    test('connecting starts polling; the cursor stays hidden until the pad is used', () => {
        const s = setup();
        s.connect(0);
        s.frame();
        expect(s.nav.getGamepads).toHaveBeenCalled();
        expect(s.gp.cursor(0).visible).toBe(false);
        expect(s.view.update).not.toHaveBeenCalled();
    });
    test('only four pads', () => {
        const s = setup();
        for (let i = 0; i < 6; i++) s.connect(i);
        expect(s.gp.pads.size).toBe(MAX_PADS);
    });
});

describe('movement', () => {
    test('a stick moves its pad cursor, in the stick direction', () => {
        const s = setup(); const pad = s.connect(0);
        const x0 = s.gp.cursor(0).x, y0 = s.gp.cursor(0).y;
        pad.axes = [1, 0, 0, 0];
        s.frame(); s.frame();
        expect(s.gp.cursor(0).x).toBeGreaterThan(x0);
        expect(s.gp.cursor(0).y).toBeCloseTo(y0, 5);
        pad.axes = [0, -1, 0, 0];
        s.frame();
        expect(s.gp.cursor(0).y).toBeLessThan(y0);
    });
    test('the right stick and the d-pad move it too', () => {
        const s = setup(); const pad = s.connect(0);
        const x0 = s.gp.cursor(0).x;
        pad.axes = [0, 0, -1, 0]; s.frame();
        const x1 = s.gp.cursor(0).x; expect(x1).toBeLessThan(x0);
        pad.axes = [0, 0, 0, 0]; s.press(pad, 15); s.frame();
        expect(s.gp.cursor(0).x).toBeGreaterThan(x1);
        s.press(pad, 15, false); s.press(pad, 13); const y1 = s.gp.cursor(0).y; s.frame();
        expect(s.gp.cursor(0).y).toBeGreaterThan(y1);
    });
    test('inside the dead zone nothing moves and the cursor stays hidden', () => {
        const s = setup(); const pad = s.connect(0);
        const before = { ...s.gp.cursor(0) };
        pad.axes = [0.12, -0.1, 0.05, 0.1];
        for (let i = 0; i < 10; i++) s.frame();
        expect(s.gp.cursor(0).x).toBe(before.x); expect(s.gp.cursor(0).y).toBe(before.y);
        expect(s.gp.cursor(0).visible).toBe(false);
    });
    test('speed is time-based: a longer frame moves further, a stalled frame is capped', () => {
        const a = setup(); const pa = a.connect(0); pa.axes = [1, 0, 0, 0];
        const b = setup(); const pb = b.connect(0); pb.axes = [1, 0, 0, 0];
        const x0 = a.gp.cursor(0).x;
        a.frame(16); a.frame(16);                    // second frame: dt 16
        b.frame(16); b.frame(32);
        const da = a.gp.cursor(0).x - x0, db = b.gp.cursor(0).x - x0;
        expect(db).toBeGreaterThan(da);
        expect(db - da).toBeCloseTo(SPEED_PER_SEC * Math.min(W, H) * 16 / 1000, 3);
        const c = setup(); const pc = c.connect(0); pc.axes = [0, 1, 0, 0];
        c.frame(16);
        const y0 = c.gp.cursor(0).y;
        c.frame(5000);
        expect(c.gp.cursor(0).y - y0).toBeCloseTo(SPEED_PER_SEC * Math.min(W, H) * MAX_FRAME_MS / 1000, 3);
    });
    test('diagonals are not faster than straight lines', () => {
        const s = setup(); const pad = s.connect(0);
        s.frame();
        const { x: x0, y: y0 } = s.gp.cursor(0);
        pad.axes = [1, 1, 1, 1]; s.press(pad, 15); s.press(pad, 13);
        s.frame(16);
        const c = s.gp.cursor(0);
        expect(Math.hypot(c.x - x0, c.y - y0)).toBeCloseTo(SPEED_PER_SEC * Math.min(W, H) * 16 / 1000, 3);
    });
    test('the cursor never leaves the screen', () => {
        const s = setup(); const pad = s.connect(0);
        pad.axes = [-1, -1, 0, 0];
        for (let i = 0; i < 200; i++) s.frame(50);
        let c = s.gp.cursor(0);
        expect(c.x).toBeGreaterThan(0); expect(c.y).toBeGreaterThan(0);
        pad.axes = [1, 1, 0, 0];
        for (let i = 0; i < 400; i++) s.frame(50);
        c = s.gp.cursor(0);
        expect(c.x).toBeLessThan(W); expect(c.y).toBeLessThan(H);
    });
    test('the cursor stays clear of the exit button in the top-right corner', () => {
        const s = setup(); const pad = s.connect(0);
        pad.axes = [1, -1, 0, 0];
        for (let i = 0; i < 400; i++) s.frame(50);
        const c = s.gp.cursor(0);
        const inside = c.x > W - 60 && c.y < 60;
        expect(inside).toBe(false);
    });
    test('resize keeps a cursor in the same relative place', () => {
        const s = setup(); s.connect(0);
        const c0 = s.gp.cursor(0);
        s.scene.scale.width = W / 2; s.scene.scale.height = H / 2;
        s.gp.handleResize({ width: W, height: H });
        const c1 = s.gp.cursor(0);
        expect(c1.x).toBeCloseTo(c0.x / 2, 0); expect(c1.y).toBeCloseTo(c0.y / 2, 0);
        expect(s.view.setRadius).not.toHaveBeenCalled(); // no view yet
    });
});

describe('buttons: press, hold, release', () => {
    test('a face button is a finger: down at the cursor, up at the cursor', () => {
        const s = setup(); const pad = s.connect(0);
        s.press(pad, 0); s.frame();
        const [down] = s.by('pointerDown');
        expect(down).toMatchObject({ pointerId: 'pad0', source: 'gamepad', pad: 0 });
        expect(down.x).toBeCloseTo(s.gp.cursor(0).x, 5); expect(down.y).toBeCloseTo(s.gp.cursor(0).y, 5);
        expect(s.gp.cursor(0).pressed).toBe(true);
        s.press(pad, 0, false); s.frame();
        expect(s.by('pointerUp')).toHaveLength(1);
        expect(s.by('pointerMove')).toHaveLength(0);
    });
    test.each([0, 1, 2, 3])('face button %i spawns', (i) => {
        const s = setup(); const pad = s.connect(0);
        s.press(pad, i); s.frame();
        expect(s.by('pointerDown')).toHaveLength(1);
    });
    test('holding while moving drags: pointer moves follow the cursor, release lets go', () => {
        const s = setup(); const pad = s.connect(0);
        s.press(pad, 1); s.frame();
        pad.axes = [1, 0, 0, 0];
        s.frame(); s.frame(); s.frame();
        const moves = s.by('pointerMove');
        expect(moves).toHaveLength(3);
        expect(moves[2].x).toBeGreaterThan(moves[0].x);
        expect(moves.every(m => m.pointerId === 'pad0')).toBe(true);
        pad.axes = [0, 0, 0, 0]; s.press(pad, 1, false); s.frame();
        const up = s.by('pointerUp');
        expect(up).toHaveLength(1);
        expect(up[0].x).toBeCloseTo(moves[2].x, 5);
    });
    test('moving without a button sends no pointer events', () => {
        const s = setup(); const pad = s.connect(0);
        pad.axes = [1, 1, 0, 0]; s.frame(); s.frame();
        expect(s.events).toHaveLength(0);
    });
    test('two face buttons together are still one finger', () => {
        const s = setup(); const pad = s.connect(0);
        s.press(pad, 0); s.press(pad, 1); s.frame();
        s.press(pad, 0, false); s.frame();
        expect(s.by('pointerUp')).toHaveLength(0);
        s.press(pad, 1, false); s.frame();
        expect(s.by('pointerDown')).toHaveLength(1); expect(s.by('pointerUp')).toHaveLength(1);
    });
    test('shoulders, triggers, menu and stick presses do nothing harmful, but wake the cursor', () => {
        const s = setup(); const pad = s.connect(0);
        [4, 5, 6, 7, 8, 9, 10, 11, 16].forEach(i => { s.press(pad, i); s.frame(); s.press(pad, i, false); s.frame(); });
        expect(s.events).toHaveLength(0);
        expect(s.gp.cursor(0).visible).toBe(true);
    });
    test('an analogue trigger counts only past half way', () => {
        const s = setup(); const pad = s.connect(0);
        pad.buttons[0] = { pressed: false, value: 0.3 }; s.frame();
        expect(s.by('pointerDown')).toHaveLength(0);
        pad.buttons[0] = { pressed: false, value: 0.8 }; s.frame();
        expect(s.by('pointerDown')).toHaveLength(1);
    });
});

describe('several pads', () => {
    test('each pad has its own cursor and its own finger', () => {
        const s = setup();
        const p0 = s.connect(0), p1 = s.connect(1);
        expect(s.gp.cursor(0).x).not.toBe(s.gp.cursor(1).x);
        const a0 = s.gp.cursor(0).x, a1 = s.gp.cursor(1).x;
        p0.axes = [1, 0, 0, 0]; s.frame();
        const b0 = s.gp.cursor(0).x;
        p1.axes = [-1, 0, 0, 0]; p0.axes = [0, 0, 0, 0];
        s.frame();
        expect(b0).toBeGreaterThan(a0);
        expect(s.gp.cursor(0).x).toBe(b0);            // pad 0 did not follow pad 1's stick
        expect(s.gp.cursor(1).x).toBeLessThan(a1);
        s.press(p0, 0); s.press(p1, 0); s.frame();
        const downs = s.by('pointerDown');
        expect(downs.map(d => d.pointerId).sort()).toEqual(['pad0', 'pad1']);
        expect(downs[0].x).not.toBe(downs[1].x);
        const ids = s.view.update.mock.calls.map(c => c[0]);
        expect(new Set(ids)).toEqual(new Set([0, 1]));
    });
    test('disconnect removes that cursor, drops a held button and leaves the other pad alone', () => {
        const s = setup();
        const p0 = s.connect(0); s.connect(1);
        s.press(p0, 0); s.frame();
        s.target.dispatchEvent(Object.assign(new Event('gamepaddisconnected'), { gamepad: { index: 0 } }));
        expect(s.gp.cursor(0)).toBeNull();
        expect(s.gp.cursor(1)).not.toBeNull();
        expect(s.view.remove).toHaveBeenCalledWith(0);
        expect(s.by('pointerUp')).toHaveLength(1);
        s.frame();
        expect(s.gp.active).toBe(true);
    });
    test('a pad that vanishes from the list without an event is cleaned up, and polling stops with the last pad', () => {
        const s = setup();
        s.connect(0);
        s.nav.pads[0] = null;
        s.frame();
        expect(s.gp.cursor(0)).toBeNull();
        const scans = s.nav.getGamepads.mock.calls.length;
        s.frame(); s.frame();
        expect(s.nav.getGamepads.mock.calls.length).toBe(scans);
    });
    test('a pad can reconnect and get a fresh cursor', () => {
        const s = setup();
        s.connect(0);
        s.target.dispatchEvent(Object.assign(new Event('gamepaddisconnected'), { gamepad: { index: 0 } }));
        s.connect(0);
        expect(s.gp.cursor(0)).not.toBeNull();
    });
});

describe('cursor appearance over time', () => {
    test('appears on first use, fades after the idle time, returns on use again', () => {
        const s = setup(); const pad = s.connect(0);
        pad.axes = [1, 0, 0, 0]; s.frame(); s.frame(); s.frame(); s.frame(); s.frame(); s.frame(); s.frame(); s.frame(); s.frame();
        expect(s.gp.cursor(0).alpha).toBe(1);
        pad.axes = [0, 0, 0, 0];
        s.advance(IDLE_MS - 200); s.frame();
        expect(s.gp.cursor(0).alpha).toBe(1);
        s.advance(400); s.frame();
        const mid = s.gp.cursor(0).alpha;
        expect(mid).toBeLessThan(1); expect(mid).toBeGreaterThan(0);
        for (let i = 0; i < 60; i++) s.frame(30);
        expect(s.gp.cursor(0).visible).toBe(false);
        pad.axes = [0, 1, 0, 0]; s.frame(); s.frame();
        expect(s.gp.cursor(0).visible).toBe(true);
    });
    test('reduced motion: it simply appears and disappears', () => {
        const s = setup({ reduced: true }); const pad = s.connect(0);
        pad.axes = [1, 0, 0, 0]; s.frame();
        expect(s.gp.cursor(0).alpha).toBe(1);
        pad.axes = [0, 0, 0, 0];
        s.advance(IDLE_MS + 10); s.frame();
        expect(s.gp.cursor(0).alpha).toBe(0);
        const last = s.view.update.mock.calls.at(-1)[1];
        expect(last.alpha).toBe(0);
    });
    test('the view receives position, pressed state and a radius sized from the screen', () => {
        const s = setup(); const pad = s.connect(1);
        s.press(pad, 0); s.frame();
        const [idx, st] = s.view.update.mock.calls.at(-1);
        expect(idx).toBe(1);
        expect(st).toMatchObject({ pressed: true });
        expect(st.radius).toBeGreaterThanOrEqual(20);
        expect(st.radius).toBeLessThan(Math.min(W, H) / 4);
    });
});

describe('pause and destroy', () => {
    test('covering the toy lets go of held buttons, hides cursors and stops polling', () => {
        const s = setup(); const pad = s.connect(0);
        s.press(pad, 0); s.frame();
        s.gp.setPaused(true);
        expect(s.by('pointerUp')).toHaveLength(1);
        expect(s.view.hideAll).toHaveBeenCalled();
        const scans = s.nav.getGamepads.mock.calls.length;
        s.frame();
        expect(s.nav.getGamepads.mock.calls.length).toBe(scans);
        s.gp.setPaused(false);
        s.frame();
        expect(s.nav.getGamepads.mock.calls.length).toBeGreaterThan(scans);
    });
    test('destroy stops listening and removes the view', () => {
        const s = setup(); s.connect(0);
        s.nav.pads[0].axes = [1, 0, 0, 0]; s.frame();
        s.gp.destroy();
        expect(s.view.destroy).toHaveBeenCalled();
        s.connect(2);
        expect(s.gp.active).toBe(false);
    });
});
