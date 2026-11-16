/**
 * MasterChain - voices -> master gain -> gentle compressor/limiter -> destination.
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
    master.connect(limiter);
    limiter.connect(ctx.destination);
    return { master, limiter };
}
