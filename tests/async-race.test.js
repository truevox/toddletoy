/**
 * @jest-environment jsdom
 */

describe('Async Spawn Race Condition', () => {
    let mockGame;

    beforeEach(() => {
        mockGame = {
            lastSpawnTime: 0,
            isSpeaking: false,

            speechManager: {
                getIsSpeaking: function () { return mockGame.isSpeaking; },
                getCurrentSpeakingObject: () => ({ id: 'objA', x: 100, y: 100 }),
                speakText: jest.fn()
            },

            audioManager: { updateTonePosition: jest.fn(), generateContinuousTone: jest.fn() },
            particleManager: { createSpawnBurst: jest.fn() },
            autoCleanupManager: { updateObjectTouchTime: jest.fn() },
            movementManager: { moveObjectTo: jest.fn() },
            moveObjectTo: function (obj, x, y) { this.movementManager.moveObjectTo(obj, x, y); },
            getObjectUnderPointer: jest.fn(),
            startDragging: jest.fn(),

            // THE SPAWN LOGIC (Fixed: Sets time immediately)
            spawnObjectAt: async function (x, y) {
                this.lastSpawnTime = Date.now();
                await new Promise(resolve => setTimeout(resolve, 50));
                // Note: We don't set isSpeaking=true here to keep testing Double Spawn scenario
                // (If isSpeaking stayed false, Event 2 would try to spawn again)
                return { id: 'objB', x, y };
            },

            // THE INPUT HANDLER (Fixed: Checks debounce on ALL paths)
            onInputPointerDown: async function (data) {
                const { x, y } = data;

                if (this.speechManager.getIsSpeaking() && this.speechManager.getCurrentSpeakingObject()) {
                    if (this.lastSpawnTime && (Date.now() - this.lastSpawnTime < 500)) {
                        return 'ignored_debounce';
                    }
                    const speakingObj = this.speechManager.getCurrentSpeakingObject();
                    this.moveObjectTo(speakingObj, x, y);
                    return 'teleported';
                } else if (!this.speechManager.getIsSpeaking()) {
                    // SPAWN PATH DEBOUNCE
                    if (this.lastSpawnTime && (Date.now() - this.lastSpawnTime < 500)) {
                        return 'ignored_debounce';
                    }
                    await this.spawnObjectAt(x, y);
                    return 'spawned';
                }
            }
        };
    });

    test('Rapid second event (Ghost Spawn) should be IGNORED by new guard', async () => {
        // Setup: Initial state ready to spawn
        mockGame.isSpeaking = false;

        // Action 1: Event 1 (Real Spawn)
        const spawnPromise = mockGame.onInputPointerDown({ x: 300, y: 300 });

        // Action 2: Ghost Event fires 10ms later
        await new Promise(resolve => setTimeout(resolve, 10));
        const ghostResult = await mockGame.onInputPointerDown({ x: 300, y: 300 });

        await spawnPromise;

        // Assertion: Ghost event should be ignored
        expect(ghostResult).toBe('ignored_debounce');
    });
});
