import { PointerRegistry, TAP_SLOP, TAP_MAX_MS, trackMove, isTapRelease } from '../src/game/input/PointerRegistry.js'

const obj = (id) => ({ id, active: true })

describe('PointerRegistry', () => {
    test('tracks several pointers independently', () => {
        const r = new PointerRegistry()
        r.begin(1, 10, 10, 0); r.begin(2, 50, 50, 0); r.begin(3, 90, 90, 0)
        expect(r.size).toBe(3)
        expect(r.anyDown()).toBe(true)
        r.end(2)
        expect(r.has(2)).toBe(false)
        expect(r.size).toBe(2)
        r.end(1); r.end(3)
        expect(r.anyDown()).toBe(false)
    })

    test('two pointers drag two objects at once; a third cannot take a dragged object', () => {
        const r = new PointerRegistry()
        const a = obj('a'), b = obj('b')
        r.begin(1, 0, 0, 0); r.begin(2, 0, 0, 0); r.begin(3, 0, 0, 0)
        expect(r.startDrag(1, a)).toBe(true)
        expect(r.startDrag(2, b)).toBe(true)
        expect(r.startDrag(3, a)).toBe(false)
        expect(r.isObjectDragged(a)).toBe(true)
        expect(r.draggedObjects()).toEqual([a, b])
        expect(r.latestDragged()).toBe(b)
        r.stopDrag(2)
        expect(r.latestDragged()).toBe(a)
        expect(r.isObjectDragged(b)).toBe(false)
    })

    test('a pointer holds at most one drag', () => {
        const r = new PointerRegistry()
        r.begin(1, 0, 0, 0)
        expect(r.startDrag(1, obj('a'))).toBe(true)
        expect(r.startDrag(1, obj('b'))).toBe(false)
    })

    test('ending a pointer releases its drag and reports it', () => {
        const r = new PointerRegistry()
        const a = obj('a')
        r.begin(1, 0, 0, 0); r.startDrag(1, a)
        const rec = r.end(1)
        expect(rec.obj).toBe(a)
        expect(r.draggedObjects()).toEqual([])
    })

    test('dropObject removes the drag of a vanished object', () => {
        const r = new PointerRegistry()
        const a = obj('a')
        r.begin(1, 0, 0, 0); r.startDrag(1, a)
        r.dropObject(a)
        expect(r.isObjectDragged(a)).toBe(false)
        expect(r.get(1).obj).toBe(null)
    })

    test('clearDrags and cancelAll leave nothing behind', () => {
        const r = new PointerRegistry()
        r.begin(1, 0, 0, 0); r.begin(2, 0, 0, 0)
        r.startDrag(1, obj('a')); r.startDrag(2, obj('b'))
        r.clearDrags()
        expect(r.draggedObjects()).toEqual([])
        expect(r.size).toBe(2)
        r.clear()
        expect(r.size).toBe(0)
    })

    test('remembers how an object was released (cancelled drags are not throws)', () => {
        const r = new PointerRegistry()
        const a = obj('a')
        r.begin(1, 0, 0, 0); r.startDrag(1, a)
        r.stopDrag(1, { cancelled: true, t: 123 })
        expect(r.wasCancelled(a)).toBe(true)
        expect(r.releaseTime(a)).toBe(123)
    })
})

describe('per-pointer tap versus drag', () => {
    test('a press that stays put is a tap', () => {
        const r = new PointerRegistry()
        const rec = r.begin(1, 100, 100, 1000)
        expect(trackMove(rec, 103, 102, 1050)).toBe(true)
        expect(isTapRelease(rec, 103, 102, 1100)).toBe(true)
    })

    test('wandering past the slop makes it a drag for good', () => {
        const r = new PointerRegistry()
        const rec = r.begin(1, 100, 100, 1000)
        expect(trackMove(rec, 100 + TAP_SLOP + 5, 100, 1050)).toBe(false)
        expect(trackMove(rec, 100, 100, 1060)).toBe(false) // back at the start: still a drag
        expect(isTapRelease(rec, 100, 100, 1100)).toBe(false)
    })

    test('a long press is not a tap', () => {
        const r = new PointerRegistry()
        const rec = r.begin(1, 0, 0, 0)
        expect(isTapRelease(rec, 0, 0, TAP_MAX_MS)).toBe(false)
    })

    test('each pointer decides on its own', () => {
        const r = new PointerRegistry()
        const a = r.begin(1, 0, 0, 0), b = r.begin(2, 200, 0, 0)
        trackMove(a, 100, 0, 10)
        trackMove(b, 201, 0, 10)
        expect(isTapRelease(a, 100, 0, 50)).toBe(false)
        expect(isTapRelease(b, 201, 0, 50)).toBe(true)
    })
})
