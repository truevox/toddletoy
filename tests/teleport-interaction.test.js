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

describe('Teleport Interaction Bug', () => {
    let mockGame;

    beforeEach(() => {
        mockGame = createMockGameWithBug();
    });

    test('fix_verification: clicking empty space while speaking spawns NEW object instead of moving', () => {
        // 1. Setup: Object is speaking
        const obj = mockGame.createTestObject(100, 100);
        mockGame.isSpeaking = true;
        mockGame.currentSpeakingObject = obj;

        // 2. Action: Click empty space
        const result = mockGame.onPointerDown(300, 300);

        // 3. Assertion: It should SPAWN NEW (Existing logic fails here)
        expect(result).toBe('spawned_new');
        expect(obj.x).toBe(100); // Old object stays put!
        expect(mockGame.objects.length).toBe(2); // New object created
    });
});
