/**
 * Volume - perceptual mapping from the 0-100 setting to the master gain.
 * gain = 0.8 * (v/100)^0.6: the default of 10 lands at about 0.2 (soft but clearly audible,
 * roughly -14 dB), 50 at 0.53, and 100 at 0.8 (-2 dB) so the top of the slider is full but
 * never painful; the limiter after the master catches anything stacked.
 */
export const MAX_MASTER_GAIN = 0.8;
export const DEFAULT_VOLUME = 10;

export function volumeToGain(volume) {
    let v = Number(volume);
    if (!Number.isFinite(v)) v = DEFAULT_VOLUME;
    v = Math.min(100, Math.max(0, v)) / 100;
    return v <= 0 ? 0 : MAX_MASTER_GAIN * Math.pow(v, 0.6);
}
