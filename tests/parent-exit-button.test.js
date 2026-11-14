/**
 * @jest-environment jsdom
 */
import { ParentExitButton } from '../src/ui/ParentExitButton.js';

function pointer(type, props = {}) {
    const e = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: 5, clientY: 5, button: 0, ...props });
    Object.defineProperty(e, 'pointerId', { value: props.pointerId ?? 1 });
    Object.defineProperty(e, 'pointerType', { value: props.pointerType ?? 'touch' });
    return e;
}
function key(type, k, extra = {}) {
    return new KeyboardEvent(type, { key: k, bubbles: true, cancelable: true, ...extra });
}

describe('ParentExitButton', () => {
    let onExit, exit, btn, docSpy;

    beforeEach(() => {
        jest.useFakeTimers();
        document.body.innerHTML = '';
        document.head.innerHTML = '';
        onExit = jest.fn();
        exit = new ParentExitButton({ onExit });
        exit.show();
        btn = document.querySelector('.parent-exit-btn');
        // Anything reaching window/document is what Phaser would see
        docSpy = jest.fn();
        ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'touchstart', 'touchend', 'click', 'keydown', 'keyup']
            .forEach(t => { window.addEventListener(t, docSpy); document.addEventListener(t, docSpy); });
    });

    afterEach(() => {
        exit.destroy();
        jest.useRealTimers();
    });

    test('is accessible: focusable button with the required aria-label, hidden until shown', () => {
        expect(btn.tagName).toBe('BUTTON');
        expect(btn.getAttribute('aria-label')).toBe('Hold for 2 seconds to exit');
        expect(btn.tabIndex).toBe(0);
        const fresh = new ParentExitButton({ onExit });
        expect(fresh.isVisible()).toBe(false);
        fresh.destroy();
    });

    test('show/hide toggle visibility', () => {
        expect(exit.isVisible()).toBe(true);
        exit.hide();
        expect(exit.isVisible()).toBe(false);
        expect(btn.style.display).toBe('none');
        exit.show();
        expect(btn.style.display).toBe('flex');
        expect(document.querySelectorAll('.parent-exit-btn')).toHaveLength(1);
    });

    test('holding for 2 seconds fires onExit exactly once', () => {
        btn.dispatchEvent(pointer('pointerdown'));
        jest.advanceTimersByTime(1999);
        expect(onExit).not.toHaveBeenCalled();
        jest.advanceTimersByTime(1);
        expect(onExit).toHaveBeenCalledTimes(1);
        btn.dispatchEvent(pointer('pointerup'));
        jest.advanceTimersByTime(5000);
        expect(onExit).toHaveBeenCalledTimes(1);
        // releasing after a successful exit does not show the tap hint
        expect(document.querySelector('.parent-exit-hint').style.display).toBe('none');
    });

    test('progress ring is shown while held and reset on release', () => {
        const ring = btn.querySelector('.pe-ring');
        btn.dispatchEvent(pointer('pointerdown'));
        expect(btn.dataset.holding).toBe('true');
        expect(ring.style.strokeDashoffset).toBe('0');
        expect(ring.style.transition).toContain('2000ms');
        btn.dispatchEvent(pointer('pointerup'));
        expect(btn.dataset.holding).toBeUndefined();
        expect(ring.style.strokeDashoffset).not.toBe('0');
    });

    test('short tap shows the hint, does not exit, and the hint goes away', () => {
        const hint = document.querySelector('.parent-exit-hint');
        btn.dispatchEvent(pointer('pointerdown'));
        jest.advanceTimersByTime(200);
        btn.dispatchEvent(pointer('pointerup'));
        expect(hint.style.display).toBe('block');
        expect(hint.textContent).toBe('Hold to exit');
        jest.advanceTimersByTime(5000);
        expect(onExit).not.toHaveBeenCalled();
        expect(hint.style.display).toBe('none');
    });

    test('pointer leaving the button cancels the hold', () => {
        btn.dispatchEvent(pointer('pointerdown'));
        jest.advanceTimersByTime(1000);
        btn.dispatchEvent(new MouseEvent('pointerleave'));
        jest.advanceTimersByTime(5000);
        expect(onExit).not.toHaveBeenCalled();
        expect(btn.dataset.holding).toBeUndefined();
    });

    test('pointercancel and moving far away cancel the hold', () => {
        btn.dispatchEvent(pointer('pointerdown'));
        btn.dispatchEvent(pointer('pointercancel'));
        jest.advanceTimersByTime(3000);
        expect(onExit).not.toHaveBeenCalled();

        btn.dispatchEvent(pointer('pointerdown'));
        btn.dispatchEvent(pointer('pointermove', { clientX: 500, clientY: 500 }));
        jest.advanceTimersByTime(3000);
        expect(onExit).not.toHaveBeenCalled();
    });

    test('hiding while held cancels the exit', () => {
        btn.dispatchEvent(pointer('pointerdown'));
        jest.advanceTimersByTime(1000);
        exit.hide();
        jest.advanceTimersByTime(5000);
        expect(onExit).not.toHaveBeenCalled();
    });

    test('presses never propagate to the page (so Phaser cannot spawn an object)', () => {
        btn.dispatchEvent(pointer('pointerdown'));
        btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        btn.dispatchEvent(new Event('touchstart', { bubbles: true, cancelable: true }));
        btn.dispatchEvent(new Event('touchend', { bubbles: true, cancelable: true }));
        btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        btn.dispatchEvent(pointer('pointerup'));
        btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(docSpy).not.toHaveBeenCalled();
    });

    test('keyboard: holding Enter or Space works like a pointer hold; keydown/up do not leak', () => {
        ['Enter', ' '].forEach(k => {
            onExit.mockClear();
            btn.dispatchEvent(key('keydown', k));
            btn.dispatchEvent(key('keydown', k, { repeat: true }));
            jest.advanceTimersByTime(2000);
            expect(onExit).toHaveBeenCalledTimes(1);
            btn.dispatchEvent(key('keyup', k));
        });
        expect(docSpy).not.toHaveBeenCalled();
    });

    test('keyboard: a short press shows the hint and does not exit; other keys ignored', () => {
        btn.dispatchEvent(key('keydown', 'Enter'));
        jest.advanceTimersByTime(300);
        btn.dispatchEvent(key('keyup', 'Enter'));
        expect(document.querySelector('.parent-exit-hint').style.display).toBe('block');
        btn.dispatchEvent(key('keydown', 'a'));
        jest.advanceTimersByTime(5000);
        expect(onExit).not.toHaveBeenCalled();
    });

    test('losing focus cancels a keyboard hold', () => {
        btn.dispatchEvent(key('keydown', 'Enter'));
        btn.dispatchEvent(new Event('blur'));
        jest.advanceTimersByTime(3000);
        expect(onExit).not.toHaveBeenCalled();
    });

    test('secondary mouse button does not start a hold', () => {
        btn.dispatchEvent(pointer('pointerdown', { button: 2, pointerType: 'mouse' }));
        jest.advanceTimersByTime(3000);
        expect(onExit).not.toHaveBeenCalled();
    });

    test('respects safe-area insets in its styling', () => {
        const css = document.getElementById('parent-exit-button-styles').textContent;
        expect(css).toContain('env(safe-area-inset-top');
        expect(css).toContain('env(safe-area-inset-right');
    });
});
