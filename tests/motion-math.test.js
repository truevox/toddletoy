import {
    newPose, popInPose, captionAlpha, idlePose, reactPose, bumpPose, ghostPose, dragTilt,
    POP_IN_MS, REACT_MS, GHOST_MS
} from '../src/game/systems/motion/MotionMath.js';

describe('MotionMath curves', () => {
    const p = newPose();

    test('pop-in starts small and visible, overshoots, and ends exactly at rest', () => {
        popInPose(0, false, p);
        expect(p.sx).toBeGreaterThan(0.25);
        expect(p.sx).toBeLessThan(0.5);
        expect(p.alpha).toBeGreaterThanOrEqual(0);
        let max = 0;
        for (let ms = 0; ms < POP_IN_MS; ms += 5) { popInPose(ms, false, p); max = Math.max(max, p.sx, p.sy); }
        expect(max).toBeGreaterThan(1.05);
        expect(max).toBeLessThan(1.25);
        expect(popInPose(POP_IN_MS, false, p)).toBe(true);
        expect([p.sx, p.sy, p.angle, p.lift, p.alpha]).toEqual([1, 1, 0, 0, 1]);
    });

    test('pop-in in reduced motion never overshoots or spins', () => {
        for (let ms = 0; ms < 200; ms += 5) {
            popInPose(ms, true, p);
            expect(p.sx).toBeLessThanOrEqual(1);
            expect(p.angle).toBe(0);
        }
    });

    test('captions wait, then fade in', () => {
        expect(captionAlpha(0)).toBe(0);
        expect(captionAlpha(100)).toBe(0);
        expect(captionAlpha(220)).toBeGreaterThan(0.2);
        expect(captionAlpha(400)).toBe(1);
    });

    test('idle stays within ~3% scale and a few % lift, and fades with weight', () => {
        let maxS = 0, maxL = 0;
        for (let t = 0; t < 10; t += 0.05) {
            idlePose(t, 1.2, 4, 1, p);
            maxS = Math.max(maxS, Math.abs(p.sx - 1));
            maxL = Math.max(maxL, Math.abs(p.lift));
        }
        expect(maxS).toBeLessThanOrEqual(0.0301);
        expect(maxS).toBeGreaterThan(0.02);
        expect(maxL).toBeLessThanOrEqual(0.0301);
        idlePose(1, 1, 4, 0, p);
        expect(p.sx).toBe(1);
        expect(p.lift).toBeCloseTo(0, 12);
    });

    test.each(['emoji', 'letter', 'number', 'shape'])('%s reaction returns exactly to rest', (kind) => {
        expect(reactPose(kind, 1, false, p)).toBe(false);
        expect([p.sx, p.sy, p.angle, p.lift]).toEqual([1, 1, 0, 0]);
        expect(reactPose(kind, 0, false, p)).toBe(true);
        expect(Math.abs(p.sx - 1) + Math.abs(p.angle) + p.lift).toBeLessThan(1e-9);
    });

    test('reactions differ by kind', () => {
        let jump = 0, wiggle = 0, bounces = 0, spin = 0, lastLift = 0, rising = false, peaks = 0;
        for (let u = 0; u < 1; u += 0.01) {
            reactPose('emoji', u, false, p); jump = Math.max(jump, p.lift);
            reactPose('letter', u, false, p); wiggle = Math.max(wiggle, Math.abs(p.angle));
            reactPose('shape', u, false, p); spin = Math.max(spin, p.angle);
            reactPose('number', u, false, p);
            if (p.lift > lastLift) rising = true;
            else if (rising && p.lift < lastLift) { peaks++; rising = false; }
            lastLift = p.lift;
        }
        expect(jump).toBeGreaterThan(0.2);
        expect(wiggle).toBeGreaterThan(8);
        expect(spin).toBeGreaterThan(300);
        expect(peaks).toBe(2);
    });

    test('reduced reaction is a pulse with no angle or lift', () => {
        for (const kind of ['emoji', 'letter', 'number', 'shape']) {
            for (let u = 0; u < 1; u += 0.05) {
                reactPose(kind, u, true, p);
                expect(p.angle).toBe(0);
                expect(p.lift).toBe(0);
            }
        }
    });

    test('bump squashes and recovers', () => {
        bumpPose(0.4, 1, p);
        expect(p.sx).toBeGreaterThan(1);
        expect(p.sy).toBeLessThan(1);
        expect(bumpPose(1, 1, p)).toBe(false);
        bumpPose(0.4, 0, p);
        expect(p.sx).toBe(1);
    });

    test('ghost shrinks, rises and fades to nothing', () => {
        ghostPose(0.99, false, p);
        expect(p.sx).toBeLessThan(0.5);
        expect(p.lift).toBeGreaterThan(0.3);
        expect(p.alpha).toBeLessThan(0.05);
        ghostPose(0.5, true, p);
        expect(p.sx).toBe(1);
    });

    test('tilt is bounded', () => {
        expect(dragTilt(100000)).toBe(10);
        expect(dragTilt(-100000)).toBe(-10);
        expect(dragTilt(0)).toBe(0);
    });

    test('durations match the brief', () => {
        expect(POP_IN_MS).toBeGreaterThanOrEqual(350);
        expect(REACT_MS).toBe(500);
        expect(GHOST_MS).toBe(300);
    });
});
