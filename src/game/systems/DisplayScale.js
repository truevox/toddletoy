/**
 * DisplayScale - the one place that knows how game pixels relate to CSS pixels
 * and how big things are on this screen.
 *
 * The Phaser canvas is created at CSS size x min(devicePixelRatio, 3) so text and
 * shapes are sharp on phones. The main camera is zoomed by that ratio, so the
 * WORLD stays in CSS ("logical") pixels: positions, saved state, tests and all
 * layout maths keep working unchanged. Anything that means "play area size" must
 * come from viewWidth()/viewHeight(), never from scale.width/height.
 *
 * All helpers tolerate scenes without a game/camera (unit-test mocks): they fall
 * back to dpr 1 and scale.width/height.
 */

export const MAX_DPR = 3;
export const BIG_TEXT_PX = 200;      // text above this font size is rendered at most at 2x
export const MIN_GLYPH = 72;
export const MAX_GLYPH = 220;
export const GLYPH_FRACTION = 0.2;   // main glyph height as a share of the short edge
export const CAPTION_FRACTION = 0.28;
export const MIN_CAPTION = 15;
export const NUMBER_MAX_WIDTH = 0.45; // a numeral is never wider than this share of the screen

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** Device pixel ratio the canvas should render at (1..3). */
export function deviceDpr(win = (typeof window !== 'undefined' ? window : null)) {
    const raw = win && Number(win.devicePixelRatio);
    return clamp(Number.isFinite(raw) && raw > 0 ? raw : 1, 1, MAX_DPR);
}

/** { cssW, cssH } published on the Phaser game by ResponsiveGameManager (null in mocks). */
export function displayInfo(scene) {
    return (scene && ((scene.game && scene.game.displayInfo) || (scene.sys && scene.sys.game && scene.sys.game.displayInfo))) || null;
}

/** Effective canvas pixels per logical pixel. */
export function dpr(scene) {
    const info = displayInfo(scene);
    const w = scene && scene.scale && scene.scale.width;
    return info && info.cssW > 0 && w > 0 ? w / info.cssW : 1;
}

function fallbackSize(axis) {
    return axis === 'w' ? 800 : 600;
}

/** Logical (CSS px) width of the play area. */
export function viewWidth(scene) {
    const info = displayInfo(scene);
    if (info && info.cssW > 0) return info.cssW;
    return (scene && scene.scale && scene.scale.width) || fallbackSize('w');
}

/** Logical (CSS px) height of the play area. */
export function viewHeight(scene) {
    const info = displayInfo(scene);
    if (info && info.cssH > 0) return info.cssH;
    return (scene && scene.scale && scene.scale.height) || fallbackSize('h');
}

/** { width, height } of the logical play area. */
export function viewSize(scene) {
    return { width: viewWidth(scene), height: viewHeight(scene) };
}

/** Canvas pointer position -> logical world position. */
export function toLogical(scene, pointer) {
    const d = dpr(scene);
    return { x: pointer.x / d, y: pointer.y / d };
}

/**
 * Zoom the main camera so world (0,0)-(viewW,viewH) exactly fills the canvas.
 * Camera zoom pivots on the viewport centre, so scroll compensates.
 */
export function syncCamera(scene) {
    const cam = scene && scene.cameras && scene.cameras.main;
    if (!cam || typeof cam.setZoom !== 'function') return;
    const d = dpr(scene);
    cam.setZoom(d);
    cam.setScroll((cam.width / 2) * (1 / d - 1), (cam.height / 2) * (1 / d - 1));
}

/** Resolution for a Text object of the given font size (px): crisp, but bounded texture memory. */
export function textResolution(scene, fontPx = 0) {
    const d = dpr(scene);
    return fontPx > BIG_TEXT_PX ? Math.min(d, 2) : d;
}

/** Parse "32px" / 32 into a number (0 when unknown). */
export function fontPxOf(style) {
    const size = style && style.fontSize;
    const n = typeof size === 'number' ? size : parseFloat(size);
    return Number.isFinite(n) ? n : 0;
}

/**
 * Wrap scene.add.text once so every Text the sandbox creates (glyphs, captions,
 * number rows, resource bars, FontManager probes) renders at device resolution.
 */
export function installTextResolution(scene) {
    const factory = scene && scene.add;
    if (!factory || typeof factory.text !== 'function' || factory.__textResolutionInstalled) return;
    const original = factory.text.bind(factory);
    factory.text = (x, y, text, style) => {
        const st = style && typeof style === 'object' ? style : {};
        return original(x, y, text, { resolution: textResolution(scene, fontPxOf(st)), ...st });
    };
    factory.__textResolutionInstalled = true;
}

/** Size table (logical px) for a play area of the given size. Pure. */
export function sizesFor(width, height) {
    const short = Math.min(width, height);
    const glyph = clamp(Math.round(short * GLYPH_FRACTION), MIN_GLYPH, MAX_GLYPH);
    const captionFont = Math.max(MIN_CAPTION, Math.round(glyph * CAPTION_FRACTION));
    return {
        glyph,
        k: glyph / 64,                                   // multiplier for sizes that were authored for a 64 px glyph
        glyphFont: Math.round(glyph / 1.2),              // first guess; factories correct against the measured height
        numberMaxWidth: Math.round(width * NUMBER_MAX_WIDTH),
        captionFont,
        captionOffset: Math.round(glyph / 2 + captionFont * 0.85),
        lineSpacing: Math.round(captionFont * 1.3),
        captionStroke: Math.max(1, Math.round(captionFont / 10)),
        kaktovikFont: Math.round(glyph * 0.5),
        heartsFont: Math.max(10, Math.round(glyph * 0.25)),
        cistercianCell: Math.max(8, Math.round(glyph * 0.2)),
        countIcon: Math.max(16, Math.round(glyph * 0.35)),
        countFont: Math.max(12, Math.round(glyph * 0.2)),
        hitPad: Math.round(glyph * 0.15)
    };
}

/** Changes when existing objects must be re-created (size unit or pixel ratio changed). */
export function renderKey(scene) {
    return `${sizes(scene).glyph}@${dpr(scene).toFixed(2)}`;
}

/** Size table for the scene's current logical size. */
export function sizes(scene) {
    return sizesFor(viewWidth(scene), viewHeight(scene));
}
