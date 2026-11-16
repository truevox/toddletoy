/**
 * MasterChain - voices -> master gain -> gentle compressor/limiter -> soft clip -> destination.
 * Shared by the live engine and the offline renderer used to measure the sounds.
 */
export function buildMasterChain(ctx, gain) {
    const master = ctx.createGain();
    master.gain.value = gain;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -14;
    limiter.knee.value = 12;
    limiter.ratio.value = 8;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.2;
    // last line of defence: a tanh soft clip, so nothing can ever reach full scale
    const clip = ctx.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < curve.length; i++) curve[i] = Math.tanh((i / (curve.length - 1)) * 2 - 1);
    clip.curve = curve;
    master.connect(limiter);
    limiter.connect(clip);
    clip.connect(ctx.destination);
    return { master, limiter, clip };
}
