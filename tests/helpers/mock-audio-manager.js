// A stand-in for AudioManager in scene mocks: every sound call is a spy, silenceDuring just runs its callback.
export function audioManagerMock(extra = {}) {
    return {
        playSpawn: jest.fn(), playTap: jest.fn(), playPickup: jest.fn(), playDragStep: jest.fn(),
        playDrop: jest.fn(), playThrow: jest.fn(), playBounce: jest.fn(), playPop: jest.fn(),
        silenceDuring: jest.fn((fn) => fn()), stopAllTones: jest.fn(), debugLog: jest.fn(() => []),
        ...extra,
    };
}
