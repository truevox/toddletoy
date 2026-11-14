/**
 * ParentExitButton - a deliberate, toddler-proof way out of the sandbox.
 *
 * A small, low-contrast corner control (top-right, safe-area aware) that must
 * be pressed and HELD (default 2s) before it fires. A progress ring fills while
 * held; releasing or leaving the button cancels. A short tap only shows a brief
 * "Hold to exit" hint. Keyboard: focusable, Enter/Space held works the same.
 *
 * It is a DOM element above the Phaser canvas, so every pointer/touch/keyboard
 * event that starts on it is stopped from propagating to the game.
 */

const STYLE_ID = 'parent-exit-button-styles';
const RING_RADIUS = 16;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const CSS = `
.parent-exit-btn {
    position: fixed;
    top: calc(env(safe-area-inset-top, 0px) + 8px);
    right: calc(env(safe-area-inset-right, 0px) + 8px);
    width: 44px; height: 44px; padding: 0;
    display: none; align-items: center; justify-content: center;
    background: rgba(255, 255, 255, 0.10);
    border: 1px solid rgba(255, 255, 255, 0.25);
    border-radius: 50%;
    color: rgba(255, 255, 255, 0.55);
    opacity: 0.4;
    z-index: 900;
    cursor: pointer;
    touch-action: none;
    user-select: none; -webkit-user-select: none; -webkit-touch-callout: none;
    -webkit-tap-highlight-color: transparent;
    transition: opacity 0.2s ease;
}
.parent-exit-btn:hover, .parent-exit-btn:focus-visible, .parent-exit-btn[data-holding="true"] { opacity: 0.9; }
.parent-exit-btn:focus-visible { outline: 2px solid rgba(255, 255, 255, 0.9); outline-offset: 2px; }
.parent-exit-btn svg { width: 36px; height: 36px; pointer-events: none; transform: rotate(-90deg); }
.parent-exit-btn .pe-track { fill: none; stroke: rgba(255, 255, 255, 0.25); stroke-width: 3; }
.parent-exit-btn .pe-ring {
    fill: none; stroke: #fff; stroke-width: 3; stroke-linecap: round;
    stroke-dasharray: ${RING_CIRCUMFERENCE.toFixed(2)};
    stroke-dashoffset: ${RING_CIRCUMFERENCE.toFixed(2)};
}
.parent-exit-btn .pe-icon {
    position: absolute; font: 700 14px/1 Arial, sans-serif; pointer-events: none;
}
.parent-exit-hint {
    position: fixed;
    top: calc(env(safe-area-inset-top, 0px) + 58px);
    right: calc(env(safe-area-inset-right, 0px) + 8px);
    padding: 6px 10px; border-radius: 8px;
    background: rgba(0, 0, 0, 0.7); color: #fff;
    font: 13px/1.2 Arial, sans-serif;
    z-index: 900; pointer-events: none; display: none;
}
`;

export class ParentExitButton {
    /**
     * @param {Object} options
     * @param {Function} options.onExit - called once the hold completes
     * @param {number} [options.holdMs=2000] - hold duration
     * @param {number} [options.hintMs=1500] - how long the short-tap hint shows
     * @param {HTMLElement} [options.parent=document.body]
     */
    constructor({ onExit, holdMs = 2000, hintMs = 1500, parent = document.body } = {}) {
        this.onExit = onExit;
        this.holdMs = holdMs;
        this.hintMs = hintMs;
        this.parent = parent;
        this.button = null;
        this.hint = null;
        this.ring = null;
        this.holdTimer = null;
        this.hintTimer = null;
        this.holding = false;
        this.activePointerId = null;
        this.holdStartedAt = 0;
    }

    show() {
        this._ensureDom();
        this.button.style.display = 'flex';
    }

    hide() {
        this._cancelHold();
        this._hideHint();
        if (this.button) this.button.style.display = 'none';
    }

    isVisible() {
        return !!this.button && this.button.style.display !== 'none';
    }

    destroy() {
        this.hide();
        if (this.button) this.button.remove();
        if (this.hint) this.hint.remove();
        this.button = this.hint = this.ring = null;
    }

    // ── DOM ──────────────────────────────────────────────────────────────────
    _ensureDom() {
        if (this.button) {
            if (!this.button.isConnected) this.parent.appendChild(this.button);
            if (this.hint && !this.hint.isConnected) this.parent.appendChild(this.hint);
            return;
        }
        if (!document.getElementById(STYLE_ID)) {
            const style = document.createElement('style');
            style.id = STYLE_ID;
            style.textContent = CSS;
            document.head.appendChild(style);
        }

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'parent-exit-btn';
        btn.setAttribute('aria-label', 'Hold for 2 seconds to exit');
        btn.title = 'Hold to exit';
        btn.innerHTML = `
            <svg viewBox="0 0 40 40" aria-hidden="true" focusable="false">
                <circle class="pe-track" cx="20" cy="20" r="${RING_RADIUS}"></circle>
                <circle class="pe-ring" cx="20" cy="20" r="${RING_RADIUS}"></circle>
            </svg>
            <span class="pe-icon" aria-hidden="true">&#x2715;</span>
        `;
        this.ring = btn.querySelector('.pe-ring');

        const hint = document.createElement('div');
        hint.className = 'parent-exit-hint';
        hint.setAttribute('role', 'status');
        hint.textContent = 'Hold to exit';

        this._bindEvents(btn);
        this.parent.appendChild(btn);
        this.parent.appendChild(hint);
        this.button = btn;
        this.hint = hint;
    }

    _bindEvents(btn) {
        // Nothing that starts on this button may reach the game underneath.
        ['mousedown', 'mouseup', 'touchstart', 'touchend', 'touchmove', 'click', 'dblclick', 'pointerup']
            .forEach(type => btn.addEventListener(type, (e) => e.stopPropagation()));
        btn.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); });

        btn.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            if (e.cancelable) e.preventDefault();
            this.activePointerId = e.pointerId;
            this._startHold();
        });
        btn.addEventListener('pointermove', (e) => {
            e.stopPropagation();
            if (!this.holding || e.pointerId !== this.activePointerId) return;
            // Touch pointers are implicitly captured (no pointerleave), so check bounds
            const r = btn.getBoundingClientRect();
            const pad = 8;
            if (e.clientX < r.left - pad || e.clientX > r.right + pad ||
                e.clientY < r.top - pad || e.clientY > r.bottom + pad) {
                this._cancelHold();
            }
        });
        const release = (e) => {
            e.stopPropagation();
            if (e.pointerId !== this.activePointerId) return;
            this._endHold(true);
        };
        btn.addEventListener('pointerup', release);
        btn.addEventListener('pointercancel', (e) => {
            e.stopPropagation();
            this._cancelHold();
        });
        btn.addEventListener('pointerleave', () => this._cancelHold());

        btn.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
            // Keep Phaser's window-level keyboard handlers (spawn on Space/Enter) out of it
            e.stopPropagation();
            e.preventDefault();
            if (e.repeat || this.holding) return;
            this.activePointerId = 'keyboard';
            this._startHold();
        });
        btn.addEventListener('keyup', (e) => {
            if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
            e.stopPropagation();
            e.preventDefault();
            if (this.activePointerId === 'keyboard') this._endHold(true);
        });
        btn.addEventListener('blur', () => this._cancelHold());
    }

    // ── Hold logic ───────────────────────────────────────────────────────────
    _startHold() {
        if (this.holding) return;
        this.holding = true;
        this.holdStartedAt = Date.now();
        this._hideHint();
        this.button.dataset.holding = 'true';
        // Fill the ring over holdMs (CSS transition; reflow first so it starts from empty)
        if (this.ring) {
            this.ring.style.transition = 'none';
            this.ring.style.strokeDashoffset = String(RING_CIRCUMFERENCE);
            void this.ring.getBoundingClientRect();
            this.ring.style.transition = `stroke-dashoffset ${this.holdMs}ms linear`;
            this.ring.style.strokeDashoffset = '0';
        }
        this.holdTimer = setTimeout(() => this._complete(), this.holdMs);
    }

    _resetRing() {
        if (this.button) delete this.button.dataset.holding;
        if (this.ring) {
            this.ring.style.transition = 'stroke-dashoffset 0.15s ease-out';
            this.ring.style.strokeDashoffset = String(RING_CIRCUMFERENCE);
        }
    }

    /** Release: a hold shorter than holdMs counts as a tap and shows the hint */
    _endHold(showHintIfShort) {
        if (!this.holding) return;
        clearTimeout(this.holdTimer);
        this.holdTimer = null;
        this.holding = false;
        this.activePointerId = null;
        this._resetRing();
        if (showHintIfShort) this._showHint();
    }

    /** Cancel (leave / blur / cancel / hide): no hint, nothing else */
    _cancelHold() {
        if (!this.holding) return;
        clearTimeout(this.holdTimer);
        this.holdTimer = null;
        this.holding = false;
        this.activePointerId = null;
        this._resetRing();
    }

    _complete() {
        this.holdTimer = null;
        this.holding = false;
        this.activePointerId = null;
        this._resetRing();
        if (typeof this.onExit === 'function') this.onExit();
    }

    _showHint() {
        if (!this.hint) return;
        this.hint.style.display = 'block';
        clearTimeout(this.hintTimer);
        this.hintTimer = setTimeout(() => this._hideHint(), this.hintMs);
    }

    _hideHint() {
        clearTimeout(this.hintTimer);
        this.hintTimer = null;
        if (this.hint) this.hint.style.display = 'none';
    }
}
