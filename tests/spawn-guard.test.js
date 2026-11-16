import { SpawnGuard, EmulatedMouseFilter } from '../src/game/input/SpawnGuard.js'

describe('SpawnGuard (per finger)', () => {
    test('one finger moving does not stop another finger spawning', () => {
        const g = new SpawnGuard()
        g.noteMove(1, 1000)
        expect(g.canSpawn(1, 1100)).toBe(false)
        expect(g.canSpawn(2, 1100)).toBe(true)
        expect(g.canSpawn(1, 1200)).toBe(true)
    })

    test('a finger cannot grab what it just made, another finger can', () => {
        const g = new SpawnGuard()
        g.noteSpawn(1, 1000)
        expect(g.canDrag(1, 1100)).toBe(false)
        expect(g.canDrag(2, 1100)).toBe(true)
        expect(g.canDrag(1, 1200)).toBe(true)
    })

    test('lifting a finger keeps its clocks, so a bounce on the same slot is still caught', () => {
        const g = new SpawnGuard()
        g.noteMove(1, 1000); g.noteSpawn(1, 1000)
        g.release(1)
        expect(g.canSpawn(1, 1001)).toBe(false)
        expect(g.canDrag(1, 1001)).toBe(false)
        expect(g.canSpawn(1, 1300)).toBe(true)
    })
})

describe('EmulatedMouseFilter', () => {
    test('a mouse press right after a touch at the same spot is a duplicate', () => {
        const f = new EmulatedMouseFilter()
        f.noteTouch(100, 100, 1000)
        expect(f.isDuplicate(false, 102, 101, 1300)).toBe(true)
    })

    test('a far or late mouse press is real, and touches are never duplicates', () => {
        const f = new EmulatedMouseFilter()
        f.noteTouch(100, 100, 1000)
        expect(f.isDuplicate(false, 400, 400, 1100)).toBe(false)
        expect(f.isDuplicate(false, 100, 100, 3000)).toBe(false)
        expect(f.isDuplicate(true, 100, 100, 1100)).toBe(false)
    })
})
