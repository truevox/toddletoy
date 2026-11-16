/**
 * Volume - perceptual mapping from the 0-100 setting to the master gain.
 * gain = 1.6 * (v/100)^0.6: the default of 10 lands at about 0.40 (single notes peak near -18 dBFS:
 * soft but clearly audible), 50 at 1.06, and 100 at 1.6 (single notes about -6 dBFS). The
 * compressor and a final soft clip after the master keep anything stacked below full scale.
 */
export const MAX_MASTER_GAIN = 1.6;
export const DEFAULT_VOLUME = 10;

export function volumeToGain(volume) {
    let v = Number(volume);
    if (!Number.isFinite(v)) v = DEFAULT_VOLUME;
    v = Math.min(100, Math.max(0, v)) / 100;
    return v <= 0 ? 0 : MAX_MASTER_GAIN * Math.pow(v, 0.6);
}
