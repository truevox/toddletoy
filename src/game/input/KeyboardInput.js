/**
 * KeyboardInput - the baby keyboard.
 *
 * Every key that is safe to use asks the scene for one big response: `input:keyPress`
 * with { code, key, kind, value, position }. Letters and digits ask for that letter or
 * number (the scene falls back to a random thing when the parent switched that content
 * off); position follows the key's place on a standard keyboard.
 *
 * Browser and system shortcuts are never touched: Ctrl/Meta/Alt combinations, Tab,
 * Escape, F-keys, typing in a field, a focused button's Space/Enter and keys pressed
 * while the toy is not the visible screen all pass straight through. The only
 * preventDefault is for keys that would scroll the page.
 *
 * Listens on window (not Phaser's keyboard queue) so the response is immediate and
 * preventDefault still works.
 */
import { viewWidth, viewHeight } from '../systems/DisplayScale.js';
import { classifyKey, keyPlace, scrollsPage } from './KeyMap.js';

export const KEY_GUARD_MS = 120;   // the same key twice within this is one press
const INSET = 0.1;                 // keep clear of the extreme edges (the exit button lives top-right)

const TYPING_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);
const CONTROL_TAGS = new Set(['BUTTON', 'A', 'SUMMARY']);

export class KeyboardInput {
    /**
     * @param {Object} scene - Phaser scene (only view size and active state are read)
     * @param {(name:string, data:Object)=>void} emit - InputManager.emit
     * @param {{now?:()=>number, target?:EventTarget}} [options]
     */
    constructor(scene, emit, options = {}) {
        this.scene = scene;
        this.emit = emit;
        this.now = options.now || (() => Date.now());
        this.paused = false;        // set right away when another screen covers the toy (the scene pause is queued a frame)
        this.held = new Set();      // codes currently down
        this.lastPress = new Map(); // code -> time of the last accepted press
        this.onDown = (e) => this.handleKeyDown(e);
        this.onUp = (e) => this.handleKeyUp(e);
        this.onBlur = () => this.clear();
        this.target = options.target || (typeof window !== 'undefined' ? window : null);
        if (this.target) {
            this.target.addEventListener('keydown', this.onDown);
            this.target.addEventListener('keyup', this.onUp);
            this.target.addEventListener('blur', this.onBlur);
        }
    }

    /** Is the toy the screen the child is looking at? (A paused scene sits behind settings or another toy.) */
    toyIsVisible() {
        if (this.paused) return false;
        const sys = this.scene && this.scene.sys;
        if (sys && typeof sys.isActive === 'function' && !sys.isActive()) return false;
        if (sys && typeof sys.isVisible === 'function' && !sys.isVisible()) return false;
        if (typeof document !== 'undefined' && document.hidden) return false;
        return true;
    }

    /** Is the key meant for something else (a field being typed in, a focused control)? */
    belongsToPage(event, code) {
        const el = event.target;
        const tag = el && el.tagName ? String(el.tagName).toUpperCase() : '';
        if (TYPING_TAGS.has(tag) || (el && el.isContentEditable)) return true;
        if (typeof document !== 'undefined' && document.activeElement) {
            const a = document.activeElement;
            if (TYPING_TAGS.has(String(a.tagName).toUpperCase()) || a.isContentEditable) return true;
        }
        const activates = code === 'Space' || code === 'Enter' || code === 'NumpadEnter';
        return activates && CONTROL_TAGS.has(tag);
    }

    positionFor(code) {
        const w = viewWidth(this.scene), h = viewHeight(this.scene);
        const place = keyPlace(code) || { nx: Math.random(), ny: Math.random() };
        return { x: w * (INSET + (1 - 2 * INSET) * place.nx), y: h * (INSET + (1 - 2 * INSET) * place.ny) };
    }

    handleKeyDown(event) {
        if (!event || event.ctrlKey || event.metaKey || event.altKey) return;
        const cls = classifyKey(event);
        if (!cls) return;
        const code = event.code || `key:${event.key}`;
        if (!this.toyIsVisible() || this.belongsToPage(event, code)) return;

        if (scrollsPage(code) && typeof event.preventDefault === 'function') event.preventDefault();

        // Holding a key is one press, not a stream
        if (event.repeat || this.held.has(code)) return;
        this.held.add(code);
        const t = this.now();
        const last = this.lastPress.get(code);
        if (last !== undefined && t - last >= 0 && t - last < KEY_GUARD_MS) return;
        this.lastPress.set(code, t);

        this.emit('keyPress', { code, key: event.key, kind: cls.kind, value: cls.value, position: this.positionFor(code) });
    }

    handleKeyUp(event) {
        if (!event) return;
        const code = event.code || `key:${event.key}`;
        if (!this.held.delete(code)) return;
        if (this.held.size === 0) this.emit('keyRelease', { code });
    }

    setPaused(paused) {
        this.paused = !!paused;
        if (this.paused) this.clear();
    }

    /** Forget held keys (key-ups are lost while the scene is paused or the window loses focus). */
    clear() {
        this.held.clear();
        this.lastPress.clear();
    }

    destroy() {
        if (this.target) {
            this.target.removeEventListener('keydown', this.onDown);
            this.target.removeEventListener('keyup', this.onUp);
            this.target.removeEventListener('blur', this.onBlur);
        }
        this.clear();
    }
}
