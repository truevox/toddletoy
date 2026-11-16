/**
 * GlyphPose - writes one pose onto a glyph without moving obj.x / obj.y.
 * Scale and angle are set directly. The lift is a pure origin shift for Text
 * (a child offset for shape Containers), corrected for rotation so the glyph
 * rises straight up even while it wobbles.
 */
export function restScale(obj) {
    return (obj.baseScale || 1) * (obj.gridFitScale || 1);
}

/** Glyph height in logical px at rest scale (used to size lifts). */
export function glyphSize(obj) {
    const h = obj.mainShape ? (obj.shapeSize || 0) : (obj.height || 0);
    return h * restScale(obj);
}

const DEG = Math.PI / 180;

export function applyPose(obj, pose, liftPx) {
    const rest = restScale(obj);
    const sx = rest * pose.sx;
    const sy = rest * pose.sy;
    obj.scaleX = sx;
    obj.scaleY = sy;
    obj.angle = pose.angle;
    const a = pose.angle * DEG;
    const lx = -liftPx * Math.sin(a);
    const ly = -liftPx * Math.cos(a);
    if (obj.mainShape) {
        // container-local px: divide by the container scale
        obj.mainShape.x = lx / (sx || 1);
        obj.mainShape.y = ly / (sy || 1);
    } else if (obj.height > 0 && obj.width > 0) {
        obj.originX = 0.5 - lx / (obj.width * sx);
        obj.originY = 0.5 - ly / (obj.height * sy);
        if (typeof obj.updateDisplayOrigin === 'function') obj.updateDisplayOrigin();
    }
    if (pose.alpha !== undefined && obj.alpha !== pose.alpha) obj.alpha = pose.alpha;
}
