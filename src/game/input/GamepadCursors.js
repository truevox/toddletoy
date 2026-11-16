/**
 * GamepadCursors - the soft, friendly ring that shows where each pad is pointing.
 * One Phaser graphics object per pad, a different colour each, drawn above every toy object.
 * Pure view: position, alpha and pressed come from GamepadInput each frame.
 */
export const CURSOR_COLORS = [0xff6b81, 0x2ec4b6, 0xffb703, 0x8e7dff]; // coral, teal, amber, violet
export const CURSOR_DEPTH = 100000;

export class GamepadCursors {
    constructor(scene) {
        this.scene = scene;
        this.items = new Map(); // pad index -> { g, radius }
    }

    draw(g, color, r) {
        g.clear();
        g.fillStyle(color, 0.16);
        g.fillCircle(0, 0, r);
        g.lineStyle(Math.max(3, r * 0.16), color, 0.35);
        g.strokeCircle(0, 0, r * 1.08);
        g.lineStyle(Math.max(3, r * 0.12), color, 0.95);
        g.strokeCircle(0, 0, r);
        g.lineStyle(Math.max(2, r * 0.07), 0xffffff, 0.9);
        g.strokeCircle(0, 0, r * 0.6);
        g.fillStyle(color, 1);
        g.fillCircle(0, 0, Math.max(3, r * 0.14));
    }

    update(index, { x, y, alpha, pressed, radius }) {
        let it = this.items.get(index);
        if (!it) {
            const g = this.scene.add.graphics();
            g.setDepth(CURSOR_DEPTH);
            it = { g, radius: 0 };
            this.items.set(index, it);
        }
        if (it.radius !== radius) { it.radius = radius; this.draw(it.g, CURSOR_COLORS[index % CURSOR_COLORS.length], radius); }
        it.g.setPosition(x, y);
        it.g.setScale(pressed ? 0.82 : 1);
        it.g.setAlpha(alpha);
        it.g.setVisible(alpha > 0);
    }

    setRadius(radius) {
        this.items.forEach((it, index) => {
            it.radius = radius;
            this.draw(it.g, CURSOR_COLORS[index % CURSOR_COLORS.length], radius);
        });
    }

    hideAll() {
        this.items.forEach((it) => { it.g.setVisible(false); it.g.setAlpha(0); });
    }

    remove(index) {
        const it = this.items.get(index);
        if (!it) return;
        it.g.destroy();
        this.items.delete(index);
    }

    destroy() {
        this.items.forEach((it) => it.g.destroy());
        this.items.clear();
    }
}
