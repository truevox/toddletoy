/**
 * Null-tolerant DOM helpers for the config screen.
 * A missing element should only disable that one control, never abort the
 * whole setup / save, so lookups return fallbacks instead of throwing.
 */

/** Add an event listener to the element matching `selector`, if it exists. Returns the element or null. */
export function on(container, selector, eventName, handler) {
    const el = container ? container.querySelector(selector) : null;
    if (el) el.addEventListener(eventName, handler);
    return el;
}

/** checked state of a checkbox/radio, or `fallback` when the element is missing */
export function readChecked(container, selector, fallback) {
    const el = container.querySelector(selector);
    return el ? !!el.checked : fallback;
}

/** parseInt of an input's value, or `fallback` when missing or not a number */
export function readInt(container, selector, fallback) {
    const el = container.querySelector(selector);
    const n = el ? parseInt(el.value, 10) : NaN;
    return Number.isNaN(n) ? fallback : n;
}

/** parseFloat of an input's value, or `fallback` when missing or not a number */
export function readFloat(container, selector, fallback) {
    const el = container.querySelector(selector);
    const n = el ? parseFloat(el.value) : NaN;
    return Number.isNaN(n) ? fallback : n;
}

/** Set textContent of the element matching `selector`, if it exists */
export function setText(container, selector, text) {
    const el = container.querySelector(selector);
    if (el) el.textContent = text;
}
