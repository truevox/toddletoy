/**
 * WordHighlighter: lights up the caption word being spoken (gold tint + sparkle).
 * Driven by real boundary events when the browser fires them; until the first
 * boundary arrives (or when none ever do) a timed estimate walks the words.
 * Everything clears on end, cancel or removal.
 */
export class WordHighlighter {
    constructor(scene) {
        this.scene = scene;
        this.generation = 0;
        this.reset();
    }

    reset() {
        this.obj = null;
        this.words = [];
        this.lit = -1;
        this.timers = [];
        this.wordDuration = 500;
        this.usingBoundaries = false;
    }

    /** Begin a language segment: `words` are the caption Text objects. */
    begin(obj, words, estimatedDuration) {
        this.clear();
        this.generation++;
        if (!obj || !words || words.length === 0) return;
        this.obj = obj;
        this.words = words;
        this.wordDuration = estimatedDuration / words.length;
        this.estimate(this.generation);
    }

    estimate(generation) {
        const time = this.scene.time;
        if (!time || !time.delayedCall) return;
        this.words.forEach((word, i) => {
            this.timers.push(time.delayedCall(i * this.wordDuration, () => {
                if (generation !== this.generation || this.usingBoundaries) return;
                this.light(i);
                this.timers.push(time.delayedCall(this.wordDuration * 0.8, () => {
                    if (generation === this.generation && !this.usingBoundaries && this.lit === i) this.unlight(i);
                }));
            }));
        });
    }

    /** A real boundary event reached word `index`: it takes over from the estimate. */
    onWord(index) {
        if (!this.obj || index < 0 || index >= this.words.length) return;
        this.usingBoundaries = true;
        this.cancelTimers();
        if (this.lit === index) return;
        this.light(index);
    }

    light(index) {
        if (this.lit >= 0 && this.lit !== index) this.unlight(this.lit);
        const word = this.words[index];
        this.lit = index;
        if (!word || !word.active) return;
        word.setTint(0xffff00);
        const pm = this.scene.particleManager;
        if (pm && pm.createWordSparkleEffect) pm.createWordSparkleEffect(word, this.wordDuration);
    }

    unlight(index) {
        const word = this.words[index];
        if (word && word.active && word.clearTint) word.clearTint();
        if (this.lit === index) this.lit = -1;
    }

    cancelTimers() {
        this.timers.forEach(t => { if (t && typeof t.remove === 'function') t.remove(false); });
        this.timers = [];
    }

    /** Stop everything: pending estimate steps, tints and sparkles. */
    clear() {
        this.generation++;
        this.cancelTimers();
        const { obj, words } = this;
        words.forEach(word => { if (word && word.active && word.clearTint) word.clearTint(); });
        if (obj && this.scene.particleManager && this.scene.particleManager.cleanupWordSparkles) {
            try {
                this.scene.particleManager.cleanupWordSparkles(obj);
            } catch (error) {
                console.warn('Failed to clean up word sparkles:', error);
            }
        }
        this.reset();
    }
}
