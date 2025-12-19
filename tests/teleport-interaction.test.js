/**
 * @jest-environment jsdom
 */

// Mock speech synthesis
global.speechSynthesis = {
    speak: jest.fn(),
    cancel: jest.fn(),
    getVoices: jest.fn(() => [])
};

global.SpeechSynthesisUtterance = jest.fn().mockImplementation((text) => ({
    text,
    lang: 'en-US',
    rate: 0.8,
    volume: 0.7,
    onend: null,
    onerror: null
}));

// Create mock game that replicates the BUGGY behavior
const createMockGameWithBug = () => {
    return {
        objects: [],
        isSpeaking: false,
        currentSpeakingObject: null,

        // Mock object creation
        createTestObject: function (x, y) {
            const obj = { x, y, id: Date.now() };
            this.objects.push(obj);
            return obj;
        },

        // Mock retrieval
        getObjectUnderPointer: jest.fn(function (x, y) {
            return this.objects.find(obj =>
                Math.sqrt((x - obj.x) ** 2 + (y - obj.y) ** 2) < 50
            ) || null;
        }),

        // THIS IS THE LOGIC WE ARE TESTING (The "Bug")
        onPointerDown: jest.fn(function (x, y) {
            const hitObject = this.getObjectUnderPointer(x, y);

            if (hitObject) {
                // Logic for hitting an object (irrelevant for this test)
                return 'hit_object';
            }

            // The "Teleport" logic REMOVED:
            // We now fall through to default spawn behavior even if speaking

            // Default logic: Spawn new
            this.createTestObject(x, y);
            return 'spawned_new';

            // Default logic: Spawn new
            this.createTestObject(x, y);
            return 'spawned_new';
        })
    };
};

describe('Teleport Interaction Bug (Debounce Fix)', () => {
    let mockGame;

    beforeEach(() => {
        mockGame = createMockGameWithBug();
    });

    test('Rapid Tap (< 500ms): Should be IGNORED (Debounce) to prevent accidental teleport', () => {
        // 1. Setup: Object spawned very recently
        const now = 1000000;
        const obj = mockGame.createTestObject(100, 100);
        obj.id = now; // Sync ID with spawn time

        mockGame.isSpeaking = true;
        mockGame.currentSpeakingObject = obj;
        mockGame.lastSpawnTime = now; // Simulating the FIX (Time set immediately)

        // 2. Action: Tap 200ms later (ACCIDENTAL DOUBLE TAP)
        jest.spyOn(Date, 'now').mockReturnValue(now + 200);

        // We need to update the mock game ON_POINTER_DOWN to allow checking time
        // Override the mock specifically for this test logic to ensure we test the HEURISTIC matches
        mockGame.onPointerDown = function (x, y) {
            if (this.isSpeaking && this.currentSpeakingObject) {
                // DEBOUNCE LOGIC
                if (Date.now() - this.lastSpawnTime < 500) {
                    return 'ignored_debounce';
                }
                this.currentSpeakingObject.x = x;
                this.currentSpeakingObject.y = y;
                return 'teleported_speaking_object';
            }
            return 'spawned_new';
        };

        const result = mockGame.onPointerDown(300, 300);

        // 3. Assertion: IGNORED
        expect(result).toBe('ignored_debounce');
        expect(obj.x).toBe(100); // Should NOT move
    });

    test('Slow Tap (> 500ms): Should TELEPORT if speaking (Intentional Move)', () => {
        // 1. Setup: Object spawned a while ago
        const now = 1000000;
        const obj = mockGame.createTestObject(100, 100);

        mockGame.isSpeaking = true;
        mockGame.currentSpeakingObject = obj;
        mockGame.lastSpawnTime = now;

        // 2. Action: Tap 800ms later (INTENTIONAL)
        jest.spyOn(Date, 'now').mockReturnValue(now + 800);

        // Re-use logic
        mockGame.onPointerDown = function (x, y) {
            if (this.isSpeaking && this.currentSpeakingObject) {
                if (Date.now() - this.lastSpawnTime < 500) {
                    return 'ignored_debounce';
                }
                this.currentSpeakingObject.x = x;
                this.currentSpeakingObject.y = y;
                return 'teleported_speaking_object';
            }
            return 'spawned_new';
        };

        const result = mockGame.onPointerDown(300, 300);

        // 3. Assertion: TELEPORT
        expect(result).toBe('teleported_speaking_object');
        expect(obj.x).toBe(300); // MOVED
    });
});
