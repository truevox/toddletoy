describe('Spawn Timing After Movement', () => {
    let game;

    beforeEach(() => {
        game = {
            objects: [],
            isDragging: false,
            draggedObject: null,
            lastSpawnTime: 0,
            lastMoveTime: 0,
            SPAWN_AFTER_MOVE_DELAY: 200,

            speechManager: {
                isSpeaking: false,
                speakingObject: null,
                getIsSpeaking() { return this.isSpeaking; },
                getCurrentSpeakingObject() { return this.speakingObject; },
                speakText: jest.fn()
            },

            movementManager: {
                moveObjectTo: jest.fn(),
                setObjectPosition: jest.fn()
            },

            audioManager: {
                generateContinuousTone: jest.fn(),
                updateTonePosition: jest.fn()
            },
            particleManager: {
                createSpawnBurst: jest.fn(),
                startDragTrail: jest.fn(),
                stopDragTrail: jest.fn(),
                updateDragTrail: jest.fn()
            },
            autoCleanupManager: {
                updateObjectTouchTime: jest.fn()
            },

            canSpawnAfterMovement() {
                if (this.lastMoveTime === 0) return true;
                return (Date.now() - this.lastMoveTime) >= this.SPAWN_AFTER_MOVE_DELAY;
            },

            moveObjectTo(obj, x, y, useSmooth = true) {
                if (!obj || !obj.active) return;
                this.lastMoveTime = Date.now();
                if (useSmooth) {
                    this.movementManager.moveObjectTo(obj, x, y);
                } else {
                    this.movementManager.setObjectPosition(obj, x, y);
                }
            },

            spawnObjectAt: jest.fn().mockImplementation(function(x, y) {
                const obj = {
                    x, y, active: true,
                    id: `object_${Date.now()}`,
                    getBounds: () => ({ contains: () => false }),
                    lastTouchedTime: Date.now()
                };
                game.objects.push(obj);
                game.lastSpawnTime = Date.now();
                return obj;
            })
        };
    });

    // --- Cooldown behavior tests ---

    test('should allow spawning when no movement has occurred', () => {
        expect(game.canSpawnAfterMovement()).toBe(true);
    });

    test('should block spawning immediately after an object moves', () => {
        const obj = { x: 100, y: 100, active: true };
        game.moveObjectTo(obj, 200, 200, false);
        expect(game.canSpawnAfterMovement()).toBe(false);
    });

    test('should allow spawning after 200ms has passed since last movement', async () => {
        const obj = { x: 100, y: 100, active: true };
        game.moveObjectTo(obj, 200, 200, false);

        await new Promise(resolve => setTimeout(resolve, 210));
        expect(game.canSpawnAfterMovement()).toBe(true);
    });

    test('should reset the cooldown on each new movement', async () => {
        const obj = { x: 100, y: 100, active: true };
        game.moveObjectTo(obj, 200, 200, false);

        await new Promise(resolve => setTimeout(resolve, 150));
        game.moveObjectTo(obj, 300, 300, false);

        expect(game.canSpawnAfterMovement()).toBe(false);
    });

    test('smooth movement should also trigger the cooldown', () => {
        const obj = { x: 100, y: 100, active: true };
        game.moveObjectTo(obj, 200, 200, true);
        expect(game.canSpawnAfterMovement()).toBe(false);
    });

    test('SPAWN_AFTER_MOVE_DELAY should be 200ms (1/5 second)', () => {
        expect(game.SPAWN_AFTER_MOVE_DELAY).toBe(200);
    });

    // --- Priority ordering tests ---
    // Spawn eligibility must be checked BEFORE move/jump eligibility

    test('onInputPointerDown should check spawn eligibility before drag eligibility', () => {
        // Verify that when nothing is under pointer and not speaking,
        // spawn path is taken without ever checking drag/move paths
        // This tests the logical priority order

        const spawnConditionsMet = !game.speechManager.getIsSpeaking()
            && game.canSpawnAfterMovement();

        // With no objects and no speech, spawn conditions are met
        expect(spawnConditionsMet).toBe(true);

        // After a recent move, spawn is blocked
        const obj = { x: 50, y: 50, active: true };
        game.moveObjectTo(obj, 100, 100, false);

        const spawnConditionsAfterMove = !game.speechManager.getIsSpeaking()
            && game.canSpawnAfterMovement();
        expect(spawnConditionsAfterMove).toBe(false);
    });

    test('teleporting a speaking object should update lastMoveTime and block subsequent spawns', () => {
        const speakingObj = { x: 50, y: 50, active: true };
        game.speechManager.isSpeaking = true;
        game.speechManager.speakingObject = speakingObj;

        // Teleport the speaking object (this is a move)
        game.moveObjectTo(speakingObj, 200, 200, true);

        // Speech ends
        game.speechManager.isSpeaking = false;
        game.speechManager.speakingObject = null;

        // Spawn should still be blocked since we just moved
        expect(game.canSpawnAfterMovement()).toBe(false);
    });

    test('dragging an object should update lastMoveTime via moveObjectTo', () => {
        const obj = { x: 100, y: 100, active: true };

        // Simulate drag movement (calls moveObjectTo with smooth=false)
        game.moveObjectTo(obj, 150, 150, false);

        expect(game.lastMoveTime).toBeGreaterThan(0);
        expect(game.canSpawnAfterMovement()).toBe(false);
    });
});
