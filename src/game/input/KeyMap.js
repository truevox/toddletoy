/**
 * KeyMap - what a physical key means to the toy, from `event.code` (layout-independent).
 *
 * classifyKey(event) -> { kind: 'letter'|'digit'|'other', value } or null for keys the toy
 * never handles (modifiers, Tab, Escape, F-keys, IME input).
 * keyPlace(code)     -> { nx, ny } (0..1 across / down a standard keyboard) or null.
 */

// Rows of a standard (ANSI) keyboard: [code, centre x in key widths]. Row 0 is the function row (never mapped).
const ROWS = {
    1: [['Backquote', 0.5], ['Digit1', 1.5], ['Digit2', 2.5], ['Digit3', 3.5], ['Digit4', 4.5], ['Digit5', 5.5],
        ['Digit6', 6.5], ['Digit7', 7.5], ['Digit8', 8.5], ['Digit9', 9.5], ['Digit0', 10.5], ['Minus', 11.5],
        ['Equal', 12.5], ['Backspace', 14]],
    2: [['KeyQ', 2], ['KeyW', 3], ['KeyE', 4], ['KeyR', 5], ['KeyT', 6], ['KeyY', 7], ['KeyU', 8], ['KeyI', 9],
        ['KeyO', 10], ['KeyP', 11], ['BracketLeft', 12], ['BracketRight', 13], ['Backslash', 14]],
    3: [['CapsLock', 1], ['KeyA', 2.25], ['KeyS', 3.25], ['KeyD', 4.25], ['KeyF', 5.25], ['KeyG', 6.25],
        ['KeyH', 7.25], ['KeyJ', 8.25], ['KeyK', 9.25], ['KeyL', 10.25], ['Semicolon', 11.25], ['Quote', 12.25],
        ['Enter', 13.9]],
    4: [['ShiftLeft', 1], ['KeyZ', 2.75], ['KeyX', 3.75], ['KeyC', 4.75], ['KeyV', 5.75], ['KeyB', 6.75],
        ['KeyN', 7.75], ['KeyM', 8.75], ['Comma', 9.75], ['Period', 10.75], ['Slash', 11.75], ['IntlBackslash', 1.9],
        ['ArrowUp', 13.5]],
    5: [['Space', 7.5], ['ArrowLeft', 12.5], ['ArrowDown', 13.5], ['ArrowRight', 14.5]]
};
// Horizontally the screen spans the typing core (Q..P and a little beyond) around the Space bar, so letters and digits
// use the whole width; the keys further right (Backspace, Enter, arrows) clamp to the right edge.
const CENTRE_X = 7.5, SPAN_X = 11.5;
const FIRST_ROW = 1, LAST_ROW = 5;

// Number pad: its own block on the right-hand side (laptops have none, so it is not appended to the main width).
const NUMPAD = {
    NumLock: [0, 1], NumpadDivide: [1, 1], NumpadMultiply: [2, 1], NumpadSubtract: [3, 1],
    Numpad7: [0, 2], Numpad8: [1, 2], Numpad9: [2, 2], NumpadAdd: [3, 2],
    Numpad4: [0, 3], Numpad5: [1, 3], Numpad6: [2, 3],
    Numpad1: [0, 4], Numpad2: [1, 4], Numpad3: [2, 4], NumpadEnter: [3, 4],
    Numpad0: [0.5, 5], NumpadDecimal: [2, 5]
};
const NUMPAD_LEFT = 0.74, NUMPAD_STEP = 0.085;

const PLACES = {};
Object.keys(ROWS).forEach((row) => {
    const r = Number(row);
    ROWS[row].forEach(([code, x]) => {
        PLACES[code] = { nx: Math.min(1, Math.max(0, 0.5 + (x - CENTRE_X) / SPAN_X)), ny: (r - FIRST_ROW) / (LAST_ROW - FIRST_ROW) };
    });
});
Object.keys(NUMPAD).forEach((code) => {
    const [col, r] = NUMPAD[code];
    PLACES[code] = { nx: NUMPAD_LEFT + col * NUMPAD_STEP, ny: (r - FIRST_ROW) / (LAST_ROW - FIRST_ROW) };
});

/** Where a key sits on a standard keyboard (0..1 each way), or null when unknown. */
export function keyPlace(code) {
    const p = PLACES[code];
    return p ? { nx: p.nx, ny: p.ny } : null;
}

const IGNORED_KEYS = new Set([
    'Tab', 'Escape', 'Shift', 'Control', 'Alt', 'Meta', 'OS', 'AltGraph', 'Fn', 'FnLock', 'ContextMenu',
    'Unidentified', 'Dead', 'Process', 'Compose', 'PrintScreen', 'Hyper', 'Super', 'Symbol', 'SymbolLock'
]);

/** Keys that would scroll the page: the toy stops that and nothing else. */
const SCROLL_CODES = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End']);
export function scrollsPage(code) { return SCROLL_CODES.has(code); }

/**
 * Classify a key press. Returns null for keys that are never ours.
 * A letter is what the key says (so an AZERTY "A" gives A); digits follow the key's code (the number pad's
 * "3" key is a 3 whether or not NumLock is on, as that is what is printed on it).
 */
export function classifyKey(event) {
    if (!event) return null;
    const key = typeof event.key === 'string' ? event.key : '';
    const code = typeof event.code === 'string' ? event.code : '';
    if (event.isComposing || event.keyCode === 229) return null;
    if (!key && !code) return null;
    if (IGNORED_KEYS.has(key)) return null;
    if (/^F\d{1,2}$/.test(key) || /^F\d{1,2}$/.test(code)) return null;
    if (/^(Shift|Control|Alt|Meta|OS)(Left|Right)$/.test(code)) return null;

    if (/^[a-z]$/i.test(key)) return { kind: 'letter', value: key.toUpperCase() };
    const codeLetter = /^Key([A-Z])$/.exec(code);
    if (codeLetter && key.length === 1 && !/^[0-9]$/.test(key)) return { kind: 'letter', value: codeLetter[1] };

    const topDigit = /^Digit([0-9])$/.exec(code);
    if (topDigit) return { kind: 'digit', value: Number(topDigit[1]) };
    const padDigit = /^Numpad([0-9])$/.exec(code);
    if (padDigit) return { kind: 'digit', value: Number(padDigit[1]) };
    if (/^[0-9]$/.test(key)) return { kind: 'digit', value: Number(key) };

    return { kind: 'other', value: null };
}
