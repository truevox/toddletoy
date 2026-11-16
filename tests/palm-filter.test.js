import { PalmFilter, PALM_WINDOW_MS } from '../src/game/input/PalmFilter.js'

const c = (id, x, y) => ({ id, x, y })

describe('PalmFilter', () => {
    test('four close contacts in the window are one soft touch at their centre', () => {
        const f = new PalmFilter()
        ;[c(1, 100, 100), c(2, 140, 110), c(3, 120, 160), c(4, 160, 150)].forEach((k, i) => f.offer(k, i * 10))
        const out = f.flush(60)
        expect(out.singles).toEqual([])
        expect(out.palms).toHaveLength(1)
        expect(out.palms[0].ids.sort()).toEqual([1, 2, 3, 4])
        expect(out.palms[0].x).toBeCloseTo(130)
        expect(out.palms[0].y).toBeCloseTo(130)
    })

    test('three fingers are three touches', () => {
        const f = new PalmFilter()
        ;[c(1, 100, 100), c(2, 140, 110), c(3, 120, 160)].forEach(k => f.offer(k, 0))
        const out = f.flush(40)
        expect(out.palms).toEqual([])
        expect(out.singles).toHaveLength(3)
    })

    test('spread-out fingers each count, however many', () => {
        const f = new PalmFilter()
        ;[c(1, 50, 50), c(2, 400, 60), c(3, 100, 500), c(4, 420, 480), c(5, 250, 300)].forEach(k => f.offer(k, 0))
        const out = f.flush(40)
        expect(out.palms).toEqual([])
        expect(out.singles).toHaveLength(5)
    })

    test('a palm plus a far finger: the palm collapses, the finger stays', () => {
        const f = new PalmFilter()
        ;[c(1, 100, 100), c(2, 130, 100), c(3, 100, 140), c(4, 140, 140), c(5, 700, 600)].forEach(k => f.offer(k, 0))
        const out = f.flush(40)
        expect(out.palms).toHaveLength(1)
        expect(out.singles.map(s => s.id)).toEqual([5])
    })

    test('the window opens at the first contact and is due after PALM_WINDOW_MS', () => {
        const f = new PalmFilter()
        expect(f.due(0)).toBe(false)
        f.offer(c(1, 0, 0), 100)
        expect(f.due(100 + PALM_WINDOW_MS - 1)).toBe(false)
        expect(f.due(100 + PALM_WINDOW_MS)).toBe(true)
        f.flush(200)
        expect(f.due(500)).toBe(false)
    })

    test('late contacts near a fresh palm are absorbed; far ones are not', () => {
        const f = new PalmFilter()
        ;[c(1, 100, 100), c(2, 130, 100), c(3, 100, 140), c(4, 140, 140)].forEach(k => f.offer(k, 0))
        f.flush(40)
        expect(f.offer(c(5, 120, 180), 150).absorbed).toBe(true)
        expect(f.isMember(5)).toBe(true)
        expect(f.offer(c(6, 600, 500), 160).absorbed).toBe(false)
        expect(f.offer(c(7, 120, 120), 2000).absorbed).toBe(false) // long after
    })

    test('members are forgotten when they lift', () => {
        const f = new PalmFilter()
        ;[c(1, 100, 100), c(2, 130, 100), c(3, 100, 140), c(4, 140, 140)].forEach(k => f.offer(k, 0))
        f.flush(40)
        expect(f.isMember(2)).toBe(true)
        f.release(2)
        expect(f.isMember(2)).toBe(false)
    })

    test('pending contacts can move or leave before the flush', () => {
        const f = new PalmFilter()
        f.offer(c(1, 0, 0), 0)
        expect(f.isPending(1)).toBe(true)
        f.updatePending(1, 5, 6)
        expect(f.flush(10).singles[0]).toMatchObject({ id: 1, x: 5, y: 6 })
        f.offer(c(2, 0, 0), 20)
        f.removePending(2)
        expect(f.flush(30).singles).toEqual([])
    })
})
